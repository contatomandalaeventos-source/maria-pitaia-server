// ############################################################
// ##  AVISO DE VENDA                                        ##
// ##  A cada 5 minutos confere os pedidos do Mercado Livre  ##
// ##  e manda e-mail (via n8n) para cada venda paga nova.   ##
// ############################################################

const axios = require("axios");
const { pool } = require("./database");
const ml = require("./mercadolivre");

const URL_AVISO = process.env.AVISO_URL || "https://korziagrowth.app.n8n.cloud/webhook/maria-pitaia-aviso-venda";
const CHAVE = process.env.AVISO_CHAVE || "mariapitaia2026aviso";
const PARA = process.env.AVISO_EMAIL || "contatomandalaeventos@gmail.com";
const MINUTOS = Number(process.env.AVISO_MINUTOS || 5);
const log = (...a) => console.log("[AVISO]", ...a);

const dinheiro = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function prepararTabela() {
  await pool.query(`CREATE TABLE IF NOT EXISTS avisos_pedidos (
    plataforma TEXT NOT NULL,
    pedido_id TEXT NOT NULL,
    avisado_em TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (plataforma, pedido_id)
  )`);
}

async function enviarEmail(assunto, mensagem) {
  await axios.post(URL_AVISO, { para: PARA, assunto, mensagem }, {
    headers: { "x-api-key": CHAVE, "Content-Type": "application/json" },
    timeout: 30000
  });
}

function montarMensagem(p) {
  const itens = (p.order_items || []).map(i =>
    `• ${i.item?.title || "Peça"} (código ${i.item?.seller_sku || i.item?.id || "-"}) · ${i.quantity} un. · ${dinheiro(i.unit_price)}`
  ).join("\n");
  const quando = new Date(p.date_created || Date.now()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `Você vendeu no Mercado Livre! 🎉

${itens}

Total: ${dinheiro(p.total_amount)}
Comprador: ${p.buyer?.nickname || "-"}
Data: ${quando}
Pedido nº ${p.id}

O que fazer agora:
1. Abra o app do Mercado Livre (ou a Central de vendedores → Vendas) e imprima a etiqueta.
2. Embale a peça na cartela e leve na agência dentro do prazo.
3. Pause essa peça no TikTok Shop e avise no grupo, porque ela tem só 1 unidade.

Ver a venda: https://www.mercadolivre.com.br/vendas/${p.id}/detalhe`;
}

const STATUS = { paid: "pago", partially_paid: "pago", confirmed: "aguardando pagamento", payment_required: "aguardando pagamento", payment_in_process: "aguardando pagamento", cancelled: "cancelado", invalid: "cancelado" };

/**
 * Grava (ou atualiza) a venda do Mercado Livre no CRM:
 * cliente em "clientes", pedido em "pedidos", peças em "itens_pedido",
 * entrada em "financeiro" e baixa do estoque da peça.
 */
async function registrarNoCRM(p) {
  const numero = `ML-${p.id}`;
  const status = STATUS[p.status] || p.status || "novo";
  const existente = (await pool.query(`SELECT id, status FROM pedidos WHERE numero_pedido=$1`, [numero])).rows[0];
  if (existente) {
    if (existente.status !== status) {
      await pool.query(`UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2`, [status, existente.id]);
      if (status === "cancelado" && existente.status !== "cancelado") {
        // venda cancelada: devolve a peça ao estoque e cancela a entrada no financeiro
        await pool.query(`UPDATE produtos pr SET estoque = COALESCE(pr.estoque,0) + i.quantidade, atualizado_em=NOW()
                          FROM itens_pedido i WHERE i.pedido_id=$1 AND i.produto_id = pr.id`, [existente.id]);
        await pool.query(`UPDATE financeiro SET status='cancelado' WHERE pedido_id=$1`, [existente.id]);
      }
    }
    return { novo: false, id: existente.id };
  }

  const b = p.buyer || {};
  const nomeCli = [b.first_name, b.last_name].filter(Boolean).join(" ") || b.nickname || "Comprador Mercado Livre";
  const cli = (await pool.query(
    `INSERT INTO clientes (empresa_id, nome, email, documento, origem, plataforma_vendas, notas)
     VALUES (1, $1, $2, $3, 'Mercado Livre', 'Mercado Livre', $4)
     ON CONFLICT (documento) DO UPDATE SET atualizado_em = NOW()
     RETURNING id`,
    [nomeCli, b.email || null, `ml:${b.id || p.id}`, b.nickname ? `Apelido no ML: ${b.nickname}` : null]
  )).rows[0];

  const pag = (p.payments || [])[0] || {};
  const ped = (await pool.query(
    `INSERT INTO pedidos (empresa_id, cliente_id, numero_pedido, plataforma, status, valor_total, forma_pagamento, data_pedido, observacoes)
     VALUES (1, $1, $2, 'Mercado Livre', $3, $4, $5, $6, $7) RETURNING id`,
    [cli.id, numero, status, Number(p.total_amount || 0), pag.payment_type || pag.payment_method_id || null,
     p.date_created || new Date(), `Pedido ${p.id} no Mercado Livre`]
  )).rows[0];

  for (const i of (p.order_items || [])) {
    const sku = i.item?.seller_sku || null;
    const prod = sku ? (await pool.query(`SELECT id FROM produtos WHERE sku=$1`, [sku])).rows[0] : null;
    const qtd = Number(i.quantity || 1);
    await pool.query(
      `INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [ped.id, prod?.id || null, i.item?.title || "Peça", qtd, Number(i.unit_price || 0), Number(i.unit_price || 0) * qtd]
    );
    if (prod && status !== "cancelado") {
      await pool.query(`UPDATE produtos SET estoque = GREATEST(COALESCE(estoque,0) - $1, 0), atualizado_em=NOW() WHERE id=$2`, [qtd, prod.id]);
    }
  }

  await pool.query(
    `INSERT INTO financeiro (empresa_id, pedido_id, tipo, descricao, valor, data_transacao, status, forma_pagamento)
     VALUES (1, $1, 'entrada', $2, $3, $4, 'pendente', $5)`,
    [ped.id, `Venda Mercado Livre ${numero}`, Number(p.total_amount || 0), (p.date_created || new Date().toISOString()).slice(0, 10), "Mercado Pago"]
  );
  log(`Pedido ${numero} gravado no CRM (cliente ${nomeCli})`);
  return { novo: true, id: ped.id };
}

async function conferir() {
  try {
    const pedidos = await ml.obterPedidos(1);
    const vistos = new Set((await pool.query(
      `SELECT pedido_id FROM avisos_pedidos WHERE plataforma='mercado_livre'`
    )).rows.map(r => r.pedido_id));

    for (const p of pedidos) {
      const id = String(p.id);
      if (["paid", "partially_paid", "cancelled"].includes(p.status)) {
        try { await registrarNoCRM(p); } catch (e) { log(`Não gravei o pedido ${id} no CRM:`, e.message); }
      }
      if (vistos.has(id)) continue;
      if (!["paid", "partially_paid"].includes(p.status)) continue; // avisa quando o pagamento entrar
      const titulo = p.order_items?.[0]?.item?.title || "uma peça";
      await enviarEmail(`🛍️ Venda no Mercado Livre: ${titulo}`, montarMensagem(p));
      await pool.query(
        `INSERT INTO avisos_pedidos (plataforma, pedido_id) VALUES ('mercado_livre', $1) ON CONFLICT DO NOTHING`, [id]
      );
      log(`E-mail enviado do pedido ${id} para ${PARA}`);
    }
  } catch (err) {
    log("Falha ao conferir pedidos:", err.response?.data?.message || err.message);
  }
}

// Teste de ponta a ponta: grava uma venda falsa no CRM, confere e apaga tudo
async function autoTesteCRM() {
  const sku = "flor-laranja";
  const antes = (await pool.query(`SELECT id, estoque FROM produtos WHERE sku=$1`, [sku])).rows[0];
  const falso = {
    id: "TESTE", status: "paid", total_amount: 59.9, date_created: new Date().toISOString(),
    buyer: { id: "teste", nickname: "COMPRADOR_TESTE", first_name: "Cliente", last_name: "Teste" },
    payments: [{ payment_type: "pix" }],
    order_items: [{ item: { id: "MLB0", title: "Brinco Flor Laranja Artesanal Feito à Mão", seller_sku: sku }, quantity: 1, unit_price: 59.9 }]
  };
  try {
    const r = await registrarNoCRM(falso);
    const ped = (await pool.query(`SELECT p.numero_pedido, p.status, p.valor_total, c.nome,
        (SELECT string_agg(nome_produto, ', ') FROM itens_pedido WHERE pedido_id=p.id) itens,
        (SELECT count(*) FROM financeiro WHERE pedido_id=p.id) fin
        FROM pedidos p JOIN clientes c ON c.id=p.cliente_id WHERE p.id=$1`, [r.id])).rows[0];
    const depois = (await pool.query(`SELECT estoque FROM produtos WHERE sku=$1`, [sku])).rows[0];
    log(`TESTE CRM OK: ${JSON.stringify(ped)} · estoque ${antes?.estoque} → ${depois?.estoque}`);
  } catch (e) {
    log("TESTE CRM FALHOU:", e.message);
  } finally {
    const ped = (await pool.query(`SELECT id, cliente_id FROM pedidos WHERE numero_pedido='ML-TESTE'`)).rows[0];
    if (ped) {
      await pool.query(`DELETE FROM financeiro WHERE pedido_id=$1`, [ped.id]);
      await pool.query(`DELETE FROM pedidos WHERE id=$1`, [ped.id]);
      await pool.query(`DELETE FROM clientes WHERE id=$1`, [ped.cliente_id]);
    }
    if (antes) await pool.query(`UPDATE produtos SET estoque=$1 WHERE id=$2`, [antes.estoque, antes.id]);
    log("TESTE CRM: dados de teste apagados");
  }
}

async function iniciar() {
  try {
    await prepararTabela();
    if (process.env.AVISO_TESTE_CRM === "1") await autoTesteCRM();
    if (process.env.AVISO_TESTE === "1") {
      await enviarEmail("✅ Teste: aviso de venda da Maria Pitaia ligado",
        `Este é um teste. A partir de agora, cada venda paga no Mercado Livre gera um e-mail como este, com a peça, o valor e o que fazer.

O sistema confere os pedidos a cada ${MINUTOS} minutos.`);
      log(`E-mail de teste enviado para ${PARA}`);
    }
    await conferir();
    setInterval(conferir, MINUTOS * 60 * 1000);
    log(`Ligado: conferindo o Mercado Livre a cada ${MINUTOS} minutos, avisos para ${PARA}`);
  } catch (err) {
    log("Não consegui ligar o aviso:", err.message);
  }
}

module.exports = { iniciar, conferir, registrarNoCRM };
