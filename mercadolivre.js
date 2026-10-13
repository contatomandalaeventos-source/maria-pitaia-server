// ############################################################
// ##  INTEGRAÇÃO REAL COM O MERCADO LIVRE                   ##
// ##  OAuth, renovação de token, publicação e pedidos       ##
// ############################################################

const axios = require("axios");
const { pool } = require("./database");

const API = "https://api.mercadolibre.com";
const SITE = "MLB"; // Brasil

const CLIENT_ID = process.env.ML_CLIENT_ID;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

function urlBase() {
  const dominio = process.env.PUBLIC_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");
  return dominio.replace(/\/$/, "");
}

function redirectUri() {
  return `${urlBase()}/callback/ml`;
}

function configurado() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/**
 * URL para onde o lojista vai autorizar o acesso
 */
function urlAutorizacao(empresaId = 1) {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    state: String(empresaId)
  });
  return `https://auth.mercadolivre.com.br/authorization?${p.toString()}`;
}

/**
 * Troca o código da autorização pelo token e guarda no banco
 */
async function trocarCodigoPorToken(codigo, empresaId = 1) {
  const res = await axios.post(`${API}/oauth/token`, new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: codigo,
    redirect_uri: redirectUri()
  }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

  await salvarToken(empresaId, res.data);
  return res.data;
}

async function salvarToken(empresaId, dados) {
  const expiraEm = new Date(Date.now() + (dados.expires_in || 21600) * 1000);
  await pool.query(`
    INSERT INTO integracoes (empresa_id, plataforma, access_token, refresh_token, expira_em, conta_externa_id, atualizado_em)
    VALUES ($1, 'mercado_livre', $2, $3, $4, $5, NOW())
    ON CONFLICT (empresa_id, plataforma) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expira_em = EXCLUDED.expira_em,
      conta_externa_id = EXCLUDED.conta_externa_id,
      atualizado_em = NOW()
  `, [empresaId, dados.access_token, dados.refresh_token, expiraEm, String(dados.user_id || "")]);
}

/**
 * Devolve um token válido, renovando sozinho quando está perto de vencer
 */
async function tokenValido(empresaId = 1) {
  const r = await pool.query(
    `SELECT * FROM integracoes WHERE empresa_id = $1 AND plataforma = 'mercado_livre'`,
    [empresaId]
  );
  if (r.rows.length === 0) {
    throw new Error("Mercado Livre ainda não autorizado. Abra /api/ml/conectar para autorizar.");
  }

  const reg = r.rows[0];
  const faltam = new Date(reg.expira_em).getTime() - Date.now();

  // renova com 10 minutos de folga
  if (faltam > 10 * 60 * 1000) return reg;

  const res = await axios.post(`${API}/oauth/token`, new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: reg.refresh_token
  }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

  await salvarToken(empresaId, res.data);
  console.log("🔄 Token do Mercado Livre renovado");

  return {
    ...reg,
    access_token: res.data.access_token,
    conta_externa_id: String(res.data.user_id || reg.conta_externa_id)
  };
}

/**
 * Descobre a categoria do Mercado Livre a partir do título
 */
async function preverCategoria(titulo) {
  try {
    const res = await axios.get(`${API}/sites/${SITE}/domain_discovery/search`, {
      params: { limit: 1, q: titulo }
    });
    return res.data?.[0]?.category_id || null;
  } catch (err) {
    console.error("⚠️  Não consegui prever a categoria:", err.message);
    return null;
  }
}

function montarFotos(produto) {
  const fotos = [];
  if (produto.imagem_url) fotos.push({ source: produto.imagem_url });

  if (produto.imagens_json) {
    const extras = Array.isArray(produto.imagens_json)
      ? produto.imagens_json
      : (produto.imagens_json.urls || []);
    for (const u of extras) {
      const url = typeof u === "string" ? u : u?.url;
      if (url && !fotos.some(f => f.source === url)) fotos.push({ source: url });
    }
  }
  return fotos.slice(0, 10);
}

/**
 * Publica o produto de verdade no Mercado Livre
 */
async function publicarProduto(produto, empresaId = 1) {
  if (!configurado()) {
    throw new Error("Faltam ML_CLIENT_ID e ML_CLIENT_SECRET nas variáveis do Railway.");
  }

  const reg = await tokenValido(empresaId);
  const fotos = montarFotos(produto);

  if (fotos.length === 0) {
    throw new Error(`O produto "${produto.nome}" não tem foto. O Mercado Livre exige ao menos uma.`);
  }

  const categoria = await preverCategoria(produto.nome);
  if (!categoria) {
    throw new Error(`Não consegui descobrir a categoria para "${produto.nome}". Informe a categoria manualmente.`);
  }

  const corpo = {
    title: String(produto.nome).slice(0, 60),
    category_id: categoria,
    price: Number(produto.preco),
    currency_id: "BRL",
    available_quantity: Math.max(Number(produto.estoque) || 0, 1),
    buying_mode: "buy_it_now",
    condition: "new",
    listing_type_id: process.env.ML_TIPO_ANUNCIO || "gold_special", // clássico
    description: { plain_text: produto.descricao || produto.nome },
    pictures: fotos,
    shipping: { mode: "me2", local_pick_up: false, free_shipping: false }
  };

  try {
    const res = await axios.post(`${API}/items`, corpo, {
      headers: {
        Authorization: `Bearer ${reg.access_token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`✅ ${produto.nome} publicado no Mercado Livre: ${res.data.id}`);
    return { id: res.data.id, url: res.data.permalink, status: res.data.status };
  } catch (err) {
    const detalhe = err.response?.data;
    const causas = (detalhe?.cause || []).map(c => c.message).join(" | ");
    const msg = causas || detalhe?.message || err.message;
    console.error(`❌ Mercado Livre recusou "${produto.nome}": ${msg}`);
    throw new Error(`Mercado Livre: ${msg}`);
  }
}

/**
 * Busca os pedidos recentes da conta
 */
async function obterPedidos(empresaId = 1, filtro = {}) {
  const reg = await tokenValido(empresaId);
  const res = await axios.get(`${API}/orders/search`, {
    params: { seller: reg.conta_externa_id, sort: "date_desc", ...filtro },
    headers: { Authorization: `Bearer ${reg.access_token}` }
  });
  return res.data.results || [];
}

/**
 * Situação da conexão, para mostrar no painel
 */
async function status(empresaId = 1) {
  if (!configurado()) {
    return { configurado: false, conectado: false, motivo: "Faltam as credenciais da aplicação" };
  }
  const r = await pool.query(
    `SELECT conta_externa_id, expira_em, atualizado_em FROM integracoes
     WHERE empresa_id = $1 AND plataforma = 'mercado_livre'`,
    [empresaId]
  );
  if (r.rows.length === 0) {
    return { configurado: true, conectado: false, motivo: "Ainda não autorizado" };
  }
  return {
    configurado: true,
    conectado: true,
    conta: r.rows[0].conta_externa_id,
    expira_em: r.rows[0].expira_em,
    autorizado_em: r.rows[0].atualizado_em
  };
}

module.exports = {
  configurado,
  urlAutorizacao,
  trocarCodigoPorToken,
  tokenValido,
  publicarProduto,
  obterPedidos,
  status,
  redirectUri
};
