// ############################################################
// ##  PAINEL MARIA PITAIA                                   ##
// ##  Login por senha + rotas usadas pelas telas do painel  ##
// ############################################################

const crypto = require("crypto");
const axios = require("axios");
const path = require("path");
const { pool } = require("./database");
const ml = require("./mercadolivre");

const SENHA = process.env.DASHBOARD_PASSWORD || "";
const COOKIE = "mp_sessao";
const EMPRESA = 1;

// ---------- login ----------
function assinatura() {
  return crypto.createHmac("sha256", SENHA || "sem-senha").update("maria-pitaia-painel").digest("hex");
}
function lerCookie(req) {
  const c = (req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="));
  return c ? decodeURIComponent(c.split("=")[1]) : "";
}
function logado(req) {
  if (!SENHA) return true; // sem senha configurada, painel aberto
  return lerCookie(req) === assinatura();
}
const LIVRES = [/^\/health/, /^\/callback\//, /^\/webhook\//, /^\/login\.html/, /^\/api\/login/, /^\/painel\.css/, /^\/favicon/, /^\/app\.webmanifest/, /^\/icone-mp-/];

function protecao(req, res, next) {
  if (LIVRES.some(r => r.test(req.path))) return next();
  if (logado(req)) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ erro: "Faça login no painel" });
  if (req.path === "/" || req.path.endsWith(".html")) return res.redirect("/login.html");
  return next(); // imagens, css e js soltos
}

// ---------- Mercado Livre: pausar / reativar / quantidade ----------
async function mlAtualizarItem(itemId, corpo) {
  const reg = await ml.tokenValido(EMPRESA);
  const r = await axios.put(`https://api.mercadolibre.com/items/${itemId}`, corpo, {
    headers: { Authorization: `Bearer ${reg.access_token}`, "Content-Type": "application/json" }
  });
  return r.data;
}

// Ajusta o anúncio do ML conforme o estoque do sistema
async function sincronizarML(produto) {
  const mlId = produto.publicacoes_json?.mercado_livre?.id;
  if (!mlId) return { ok: false, motivo: "sem anúncio no Mercado Livre" };
  try {
    if (Number(produto.estoque) <= 0) {
      await mlAtualizarItem(mlId, { status: "paused" });
      return { ok: true, acao: "pausado" };
    }
    await mlAtualizarItem(mlId, { available_quantity: Number(produto.estoque) });
    try { await mlAtualizarItem(mlId, { status: "active" }); } catch (e) { /* já ativo */ }
    return { ok: true, acao: "ativo", quantidade: Number(produto.estoque) };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error("[PAINEL] ML não atualizou", mlId, msg);
    return { ok: false, motivo: msg };
  }
}

function registrar(app) {
  app.use(protecao);

  app.post("/api/login", (req, res) => {
    const senha = String(req.body?.senha || "");
    if (SENHA && senha !== SENHA) return res.status(401).json({ erro: "Senha incorreta" });
    res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(assinatura())}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`);
    res.json({ ok: true });
  });
  app.post("/api/sair", (req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  // ---------- resumo da tela inicial ----------
  app.get("/api/painel/resumo", async (req, res) => {
    try {
      const q = s => pool.query(s, [EMPRESA]).then(r => r.rows[0]);
      const mes = await q(`SELECT COUNT(*)::int n, COALESCE(SUM(valor_total),0) v FROM pedidos
                           WHERE empresa_id=$1 AND status<>'cancelado'
                           AND date_trunc('month', COALESCE(data_pedido,criado_em)) = date_trunc('month', NOW())`);
      const enviar = await q(`SELECT COUNT(*)::int n FROM pedidos WHERE empresa_id=$1 AND status IN ('pago','novo')`);
      const pecas = await q(`SELECT COUNT(*) FILTER (WHERE estoque>0)::int disp, COUNT(*)::int total FROM produtos WHERE empresa_id=$1 AND ativo`);
      const clientes = await q(`SELECT COUNT(*)::int n FROM clientes WHERE empresa_id=$1`);
      let mlStatus = { conectado: false };
      try { mlStatus = await ml.status(EMPRESA); } catch (e) {}
      res.json({ vendas_mes: mes.n, valor_mes: Number(mes.v), a_enviar: enviar.n,
        pecas_disponiveis: pecas.disp, pecas_total: pecas.total, clientes: clientes.n,
        mercado_livre: !!mlStatus.conectado });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });

  // ---------- pedidos ----------
  app.patch("/api/painel/pedidos/:id/status", async (req, res) => {
    const permitidos = ["novo", "pago", "enviado", "entregue", "cancelado", "aguardando pagamento"];
    const status = String(req.body?.status || "");
    if (!permitidos.includes(status)) return res.status(400).json({ erro: "Status inválido" });
    try {
      const antes = (await pool.query(`SELECT status FROM pedidos WHERE id=$1 AND empresa_id=$2`, [req.params.id, EMPRESA])).rows[0];
      if (!antes) return res.status(404).json({ erro: "Pedido não encontrado" });
      await pool.query(`UPDATE pedidos SET status=$1, atualizado_em=NOW() WHERE id=$2`, [status, req.params.id]);
      if (status === "cancelado" && antes.status !== "cancelado") {
        await pool.query(`UPDATE produtos pr SET estoque = COALESCE(pr.estoque,0)+i.quantidade, atualizado_em=NOW()
                          FROM itens_pedido i WHERE i.pedido_id=$1 AND i.produto_id=pr.id`, [req.params.id]);
        await pool.query(`UPDATE financeiro SET status='cancelado' WHERE pedido_id=$1`, [req.params.id]);
      }
      if (status === "entregue") await pool.query(`UPDATE pedidos SET data_entrega_real=CURRENT_DATE WHERE id=$1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });

  // venda feita fora dos marketplaces (site, WhatsApp, grupo do condomínio, pessoalmente)
  app.post("/api/painel/venda-manual", async (req, res) => {
    const { produto_id, canal, cliente_nome, whatsapp, valor, pagamento, observacoes } = req.body || {};
    if (!produto_id || !cliente_nome) return res.status(400).json({ erro: "Escolha a peça e informe o nome do cliente" });
    try {
      const prod = (await pool.query(`SELECT * FROM produtos WHERE id=$1 AND empresa_id=$2`, [produto_id, EMPRESA])).rows[0];
      if (!prod) return res.status(404).json({ erro: "Peça não encontrada" });
      const preco = Number(valor || prod.preco);
      const zap = String(whatsapp || "").replace(/\D/g, "") || null;
      let cli = zap ? (await pool.query(`SELECT id FROM clientes WHERE empresa_id=$1 AND whatsapp=$2`, [EMPRESA, zap])).rows[0] : null;
      if (!cli) cli = (await pool.query(
        `INSERT INTO clientes (empresa_id, nome, whatsapp, origem, plataforma_vendas) VALUES ($1,$2,$3,$4,$4) RETURNING id`,
        [EMPRESA, cliente_nome, zap, canal || "WhatsApp"])).rows[0];
      const numero = `MAN-${Date.now().toString(36).toUpperCase()}`;
      const ped = (await pool.query(
        `INSERT INTO pedidos (empresa_id, cliente_id, numero_pedido, plataforma, status, valor_total, forma_pagamento, data_pedido, observacoes)
         VALUES ($1,$2,$3,$4,'pago',$5,$6,NOW(),$7) RETURNING id`,
        [EMPRESA, cli.id, numero, canal || "WhatsApp", preco, pagamento || null, observacoes || null])).rows[0];
      await pool.query(`INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
                        VALUES ($1,$2,$3,1,$4,$4)`, [ped.id, prod.id, prod.nome, preco]);
      await pool.query(`INSERT INTO financeiro (empresa_id, pedido_id, tipo, descricao, valor, data_transacao, status, forma_pagamento)
                        VALUES ($1,$2,'entrada',$3,$4,CURRENT_DATE,'recebido',$5)`,
        [EMPRESA, ped.id, `Venda ${canal || "WhatsApp"} ${numero}`, preco, pagamento || null]);
      const novo = (await pool.query(`UPDATE produtos SET estoque=GREATEST(COALESCE(estoque,0)-1,0), atualizado_em=NOW()
                                      WHERE id=$1 RETURNING *`, [prod.id])).rows[0];
      const mlr = await sincronizarML(novo);
      res.json({ ok: true, numero, estoque: novo.estoque, mercado_livre: mlr });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });

  // ---------- peças e estoque ----------
  app.patch("/api/painel/produtos/:id/estoque", async (req, res) => {
    const estoque = Math.max(0, parseInt(req.body?.estoque, 10) || 0);
    try {
      const prod = (await pool.query(`UPDATE produtos SET estoque=$1, atualizado_em=NOW() WHERE id=$2 AND empresa_id=$3 RETURNING *`,
        [estoque, req.params.id, EMPRESA])).rows[0];
      if (!prod) return res.status(404).json({ erro: "Peça não encontrada" });
      const mlr = await sincronizarML(prod);
      res.json({ ok: true, estoque, mercado_livre: mlr });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });

  // ---------- financeiro ----------
  app.get("/api/painel/financeiro", async (req, res) => {
    try {
      const lanc = (await pool.query(
        `SELECT f.*, p.numero_pedido, p.plataforma FROM financeiro f LEFT JOIN pedidos p ON p.id=f.pedido_id
         WHERE f.empresa_id=$1 ORDER BY COALESCE(f.data_transacao, f.criado_em::date) DESC, f.id DESC LIMIT 300`, [EMPRESA])).rows;
      res.json(lanc);
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });
  app.patch("/api/painel/financeiro/:id", async (req, res) => {
    const status = String(req.body?.status || "");
    if (!["pendente", "recebido", "cancelado"].includes(status)) return res.status(400).json({ erro: "Status inválido" });
    try {
      await pool.query(`UPDATE financeiro SET status=$1 WHERE id=$2 AND empresa_id=$3`, [status, req.params.id, EMPRESA]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });
  app.post("/api/painel/financeiro", async (req, res) => {
    const { tipo, descricao, valor, data } = req.body || {};
    if (!["entrada", "saida"].includes(tipo) || !Number(valor)) return res.status(400).json({ erro: "Informe tipo e valor" });
    try {
      await pool.query(`INSERT INTO financeiro (empresa_id, tipo, descricao, valor, data_transacao, status)
                        VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),'recebido')`,
        [EMPRESA, tipo, descricao || null, Number(valor), data || null]);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ erro: err.message }); }
  });
}

module.exports = { registrar, sincronizarML };
