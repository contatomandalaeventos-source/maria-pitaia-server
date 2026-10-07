// ############################################################
// ##  SERVIDOR PRINCIPAL - MARIA PITAIA CRIAÇÕES            ##
// ##  CRM + E-commerce + WhatsApp Integration               ##
// ##  Marketplace: Mercado Livre, Shopee, TikTok Shop,     ##
// ##              Magalu, Amazon                             ##
// ############################################################

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { pool, inicializarBancoDados, testarConexao } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARES ==========
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ========== VARIÁVEL DE CONTROLE ==========
let bancoPronto = false;

// ========== IMPORTAR ROTAS ==========
const webhooks = require("./webhooks");
const produtosRoutes = require("./produtos");

// ========== INICIALIZAÇÃO DO BANCO ==========
async function iniciar() {
  try {
    console.log("\n🚀 Iniciando servidor de Maria Pitaia Criações...");
    console.log("📧 Email: contato@mariapitaia.com.br");
    console.log("📱 WhatsApp: 11 985264683");
    console.log("💼 CNPJ: 22.845.669/0001-17\n");

    // Testa conexão
    const conectado = await testarConexao();
    if (!conectado) {
      throw new Error("Não consegui conectar ao banco de dados");
    }

    // Inicializa schema
    await inicializarBancoDados();
    bancoPronto = true;

    console.log("✅ Sistema pronto!\n");
  } catch (err) {
    console.error("❌ Erro na inicialização:", err.message);
    console.error("⏳ Tentando novamente em 5 segundos...");
    setTimeout(iniciar, 5000);
  }
}

// ========== ROTA DE STATUS ==========
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    banco: bancoPronto ? "conectado" : "conectando",
    timestamp: new Date().toISOString()
  });
});

// ========== API: EMPRESAS ==========
app.get("/api/empresas", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query("SELECT * FROM empresas WHERE ativa = TRUE");
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/api/empresas/:id", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query(
      "SELECT * FROM empresas WHERE id = $1",
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Empresa não encontrada" });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API: PRODUTOS ==========
app.get("/api/empresas/:empresa_id/produtos", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.listarProdutos(req, res);
});

app.post("/api/empresas/:empresa_id/produtos", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.criarProduto(req, res);
});

app.patch("/api/empresas/:empresa_id/produtos/:produto_id", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.atualizarProduto(req, res);
});

app.post("/api/empresas/:empresa_id/produtos/:produto_id/publicar/:plataforma", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.publicarEmPlataforma(req, res);
});

app.post("/api/empresas/:empresa_id/produtos/:produto_id/publicar-tudo", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.publicarEmTodas(req, res);
});

app.post("/api/empresas/:empresa_id/produtos/:produto_id/sincronizar-estoque/:plataforma", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });
  produtosRoutes.sincronizarEstoque(req, res);
});

// ========== API: CLIENTES ==========
app.get("/api/empresas/:empresa_id/clientes", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query(
      `SELECT * FROM clientes
       WHERE empresa_id = $1
       ORDER BY criado_em DESC`,
      [req.params.empresa_id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/empresas/:empresa_id/clientes", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  const { nome, telefone, whatsapp, email, documento, endereco, origem } = req.body;

  if (!nome || !whatsapp) {
    return res.status(400).json({ erro: "Nome e WhatsApp são obrigatórios" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO clientes
       (empresa_id, nome, telefone, whatsapp, email, documento, endereco, origem)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.params.empresa_id, nome, telefone, whatsapp, email, documento, endereco, origem]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API: PEDIDOS ==========
app.get("/api/empresas/:empresa_id/pedidos", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query(
      `SELECT p.*, c.nome as cliente_nome, c.whatsapp
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.empresa_id = $1
       ORDER BY p.criado_em DESC`,
      [req.params.empresa_id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/empresas/:empresa_id/pedidos", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  const {
    cliente_id,
    numero_pedido,
    plataforma,
    valor_total,
    forma_pagamento,
    itens
  } = req.body;

  if (!numero_pedido || !valor_total) {
    return res.status(400).json({ erro: "Número e valor do pedido são obrigatórios" });
  }

  try {
    // Cria o pedido
    const pedidoRes = await pool.query(
      `INSERT INTO pedidos
       (empresa_id, cliente_id, numero_pedido, plataforma, valor_total, forma_pagamento, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'novo')
       RETURNING *`,
      [req.params.empresa_id, cliente_id || null, numero_pedido, plataforma, valor_total, forma_pagamento]
    );

    const pedido = pedidoRes.rows[0];

    // Insere os itens do pedido
    if (itens && Array.isArray(itens)) {
      for (const item of itens) {
        await pool.query(
          `INSERT INTO itens_pedido
           (pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pedido.id, item.produto_id || null, item.nome_produto, item.quantidade, item.preco_unitario, item.subtotal]
        );
      }
    }

    res.status(201).json({
      pedido,
      itens: itens || []
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API: MENSAGENS WHATSAPP ==========
app.get("/api/empresas/:empresa_id/mensagens", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query(
      `SELECT * FROM mensagens
       WHERE empresa_id = $1
       ORDER BY enviada_em DESC
       LIMIT 100`,
      [req.params.empresa_id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API: LEADS ==========
app.get("/api/empresas/:empresa_id/leads", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  try {
    const resultado = await pool.query(
      `SELECT * FROM leads
       WHERE empresa_id = $1 AND status != 'convertido'
       ORDER BY criado_em DESC`,
      [req.params.empresa_id]
    );
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post("/api/empresas/:empresa_id/leads", async (req, res) => {
  if (!bancoPronto) return res.status(503).json({ erro: "Banco ainda não pronto" });

  const { nome, whatsapp, email, origem, interesse } = req.body;

  if (!nome || !whatsapp) {
    return res.status(400).json({ erro: "Nome e WhatsApp são obrigatórios" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO leads
       (empresa_id, nome, whatsapp, email, origem, interesse, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'novo')
       RETURNING *`,
      [req.params.empresa_id, nome, whatsapp, email, origem, interesse]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== WEBHOOKS ==========
app.post("/webhook/evolution", webhooks.webhookEvolution);
app.post("/webhook/mercado-livre", webhooks.webhookMercadoLivre);
app.post("/webhook/shopee", webhooks.webhookShopee);
app.post("/webhook/tiktok-shop", webhooks.webhookTikTokShop);

// ========== 404 ==========
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

// ========== INICIAR ==========
iniciar();

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Health check: GET http://localhost:${PORT}/health`);
});

module.exports = app;
