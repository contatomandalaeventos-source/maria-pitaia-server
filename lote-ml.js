// ############################################################
// ##  LOTE MERCADO LIVRE                                    ##
// ##  Importa as peças de pecas-lote.json para o banco e    ##
// ##  publica (ou só valida) todas no Mercado Livre.        ##
// ##                                                        ##
// ##  Liga com a variável ML_LOTE no Railway:               ##
// ##    ML_LOTE=simular   → importa e só VALIDA no ML        ##
// ##    ML_LOTE=publicar  → importa e PUBLICA de verdade     ##
// ##  Sem a variável, nada acontece.                        ##
// ############################################################

const axios = require("axios");
const path = require("path");
const { pool } = require("./database");
const ml = require("./mercadolivre");

const API = "https://api.mercadolibre.com";
const EMPRESA = 1;
const MARCA = "Maria Pitaia Criações";
const log = (...a) => console.log("[LOTE-ML]", ...a);
const espera = ms => new Promise(r => setTimeout(r, ms));

async function importarPecas() {
  const pecas = require(path.join(__dirname, "pecas-lote.json"));
  let novos = 0;
  for (const p of pecas) {
    const r = await pool.query(
      `INSERT INTO produtos (empresa_id, nome, descricao, preco, estoque, sku, categoria, imagem_url, imagens_json)
       VALUES ($1,$2,$3,$4,$5,$6,'Brincos',$7,$8)
       ON CONFLICT (sku) DO NOTHING RETURNING id`,
      [EMPRESA, p.nome, p.descricao, p.preco, p.estoque, p.sku, p.imagens[0],
       JSON.stringify({ urls: p.imagens.slice(1) })]
    );
    if (r.rows.length) novos++;
  }
  log(`Peças no arquivo: ${pecas.length} · novas no banco: ${novos}`);
  return pecas.map(p => p.sku);
}

async function preverCategoria() {
  const res = await axios.get(`${API}/sites/MLB/domain_discovery/search`, {
    params: { limit: 3, q: "Brinco feminino artesanal" }
  });
  log("Sugestões de categoria:", JSON.stringify(res.data.map(c => [c.category_id, c.category_name, c.domain_name])));
  return res.data[0].category_id;
}

function escolherValor(attr, preferidos) {
  const vals = attr.values || [];
  for (const pref of preferidos) {
    const v = vals.find(x => x.name.toLowerCase().includes(pref));
    if (v) return { id: attr.id, value_id: v.id };
  }
  return null;
}

async function montarAtributos(categoria) {
  const res = await axios.get(`${API}/categories/${categoria}/attributes`);
  const attrs = res.data;
  const obrigatorios = attrs.filter(a => a.tags && (a.tags.required || a.tags.catalog_required || a.tags.conditional_required));
  log("Atributos obrigatórios:", JSON.stringify(obrigatorios.map(a => [a.id, a.name, a.value_type, (a.values || []).slice(0, 6).map(v => v.name)])));

  const fixos = [];
  const temGtinVazio = attrs.find(a => a.id === "EMPTY_GTIN_REASON");
  for (const a of obrigatorios) {
    if (a.id === "BRAND") fixos.push({ id: "BRAND", value_name: MARCA });
    else if (a.id === "MODEL") fixos.push({ id: "MODEL", value_name: "__MODELO__" });
    else if (a.id === "GTIN" || a.id === "EMPTY_GTIN_REASON") {
      if (temGtinVazio && !fixos.some(f => f.id === "EMPTY_GTIN_REASON")) {
        const v = escolherValor(temGtinVazio, ["artesanal", "não tem", "nao tem"]) ||
                  (temGtinVazio.values?.[0] && { id: "EMPTY_GTIN_REASON", value_id: temGtinVazio.values[0].id });
        if (v) fixos.push(v);
      }
    }
    else if (a.id === "MATERIAL") fixos.push({ id: "MATERIAL", value_name: "Cerâmica plástica" });
    else if (a.id === "WITH_GEMSTONE") { const v = escolherValor(a, ["não", "nao"]); if (v) fixos.push(v); }
    else if (a.id === "GENDER") { const v = escolherValor(a, ["mulher", "feminino"]); if (v) fixos.push(v); }
    else if (a.id === "ITEM_CONDITION") { const v = escolherValor(a, ["novo"]); if (v) fixos.push(v); }
    else if (a.values && a.values.length) {
      const v = escolherValor(a, ["argila", "polímero", "polimero", "resina", "outro", "dourado", "pressão", "pressao", "adulto"]) ||
                { id: a.id, value_id: a.values[0].id };
      fixos.push(v);
    }
    else if (a.value_type === "number") fixos.push({ id: a.id, value_name: "1" });
    else if (a.value_type === "number_unit") fixos.push({ id: a.id, value_name: `4 ${a.default_unit || "cm"}` });
    else fixos.push({ id: a.id, value_name: "Artesanal" });
  }
  return fixos;
}

function corpoDoItem(produto, categoria, atributos) {
  const fotos = [{ source: produto.imagem_url }];
  for (const u of (produto.imagens_json?.urls || [])) fotos.push({ source: u });
  const modelo = String(produto.nome).replace(/^Brinco\s+/i, "").replace(/\s+Artesanal.*$/i, "").slice(0, 60);
  const attrs = atributos.map(a => a.value_name === "__MODELO__" ? { ...a, value_name: modelo } : a);
  attrs.push({ id: "SELLER_SKU", value_name: produto.sku });
  return {
    title: produto.nome,
    category_id: categoria,
    price: Number(produto.preco),
    currency_id: "BRL",
    available_quantity: Math.max(Number(produto.estoque) || 0, 1),
    buying_mode: "buy_it_now",
    condition: "new",
    listing_type_id: process.env.ML_TIPO_ANUNCIO || "gold_special",
    pictures: fotos,
    attributes: attrs,
    shipping: { mode: process.env.ML_ENVIO || "me2", local_pick_up: false, free_shipping: false }
  };
}

function erroML(err) {
  const d = err.response?.data;
  const causas = (d?.cause || []).map(c => `${c.code || ""} ${c.message}`).join(" | ");
  return causas || d?.message || err.message;
}

async function enviar(corpo, token, validar) {
  const url = validar ? `${API}/items/validate` : `${API}/items`;
  const h = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
  try {
    return (await axios.post(url, corpo, h)).data || {};
  } catch (err) {
    const msg = erroML(err);
    if (/family_name/i.test(msg)) {
      const c2 = { ...corpo, family_name: corpo.title };
      delete c2.title;
      return (await axios.post(url, c2, h)).data || {};
    }
    throw err;
  }
}

async function rodar() {
  const modo = (process.env.ML_LOTE || "").toLowerCase();
  if (!["simular", "publicar"].includes(modo)) return;
  log(`Início no modo: ${modo.toUpperCase()}`);

  try {
    const skus = await importarPecas();
    const reg = await ml.tokenValido(EMPRESA);
    log(`Conta do Mercado Livre: ${reg.conta_externa_id}`);

    const categoria = process.env.ML_CATEGORIA || await preverCategoria();
    log(`Categoria usada: ${categoria}`);
    const atributos = await montarAtributos(categoria);

    const prods = (await pool.query(
      `SELECT * FROM produtos WHERE empresa_id=$1 AND sku = ANY($2) ORDER BY id`, [EMPRESA, skus]
    )).rows;

    let ok = 0, falha = 0, pulado = 0;
    for (const p of prods) {
      const pub = p.publicacoes_json || {};
      if (modo === "publicar" && pub.mercado_livre?.id) { pulado++; continue; }
      const corpo = corpoDoItem(p, categoria, atributos);
      try {
        if (modo === "simular") {
          await enviar(corpo, reg.access_token, true);
          log(`OK (validado) ${p.sku}`);
        } else {
          const r = await enviar(corpo, reg.access_token, false);
          pub.mercado_livre = { id: r.id, url: r.permalink, status: r.status, em: new Date().toISOString() };
          await pool.query(`UPDATE produtos SET publicacoes_json=$1, publicado_em=NOW(), atualizado_em=NOW() WHERE id=$2`,
            [JSON.stringify(pub), p.id]);
          log(`PUBLICADO ${p.sku} → ${r.id} ${r.permalink}`);
        }
        ok++;
      } catch (err) {
        falha++;
        log(`ERRO ${p.sku}: ${erroML(err)}`);
        if (falha === 1) log("Corpo enviado:", JSON.stringify(corpo).slice(0, 1500));
      }
      await espera(800);
    }
    log(`FIM · certos: ${ok} · com erro: ${falha} · já publicados: ${pulado}`);
  } catch (err) {
    log("FALHA GERAL:", erroML(err));
  }
}

module.exports = { rodar };
