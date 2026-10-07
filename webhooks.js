// ============================================================
// WEBHOOKS: Recebimento de dados de integrações externas
// ============================================================

const { pool } = require("./database");
const whatsapp = require("./whatsapp");

/**
 * Webhook da Evolution API (WhatsApp)
 * POST /webhook/evolution
 */
async function webhookEvolution(req, res) {
  const dados = req.body;

  if (!dados || typeof dados !== "object") {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  try {
    // Log do webhook
    console.log("📨 Webhook recebido da Evolution API:", dados.event);

    // Processa diferentes tipos de eventos
    if (dados.event === "message.create") {
      await processarMensagemRecebida(dados);
    } else if (dados.event === "message.update") {
      await processarAtualizacaoMensagem(dados);
    } else if (dados.event === "contact.create") {
      await processarNovoContato(dados);
    }

    res.json({ ok: true, id: dados.id });
  } catch (err) {
    console.error("❌ Erro ao processar webhook:", err.message);
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Processa mensagem recebida do cliente
 */
async function processarMensagemRecebida(dados) {
  const {
    data: { chatId, body, senderName, timestamp }
  } = dados;

  try {
    // Extrai número do WhatsApp
    const numero = chatId.replace("@c.us", "");

    // Procura ou cria cliente
    let cliente = await pool.query(
      "SELECT id FROM clientes WHERE whatsapp = $1 LIMIT 1",
      [numero]
    );

    let clienteId = null;
    if (cliente.rows.length > 0) {
      clienteId = cliente.rows[0].id;
    } else {
      // Cria novo cliente a partir do contato
      const novo = await pool.query(
        `INSERT INTO clientes (empresa_id, nome, whatsapp)
         VALUES (1, $1, $2) RETURNING id`,
        [senderName || `Cliente ${numero}`, numero]
      );
      clienteId = novo.rows[0].id;
    }

    // Registra a mensagem
    await pool.query(
      `INSERT INTO mensagens (empresa_id, cliente_id, tipo, direcao, conteudo, timestamp_evol, status)
       VALUES (1, $1, 'texto', 'entrada', $2, $3, 'recebida')`,
      [clienteId, body, timestamp]
    );

    // Trata como lead se for primeira mensagem
    if (cliente.rows.length === 0) {
      await pool.query(
        `INSERT INTO leads (empresa_id, nome, whatsapp, status)
         VALUES (1, $1, $2, 'novo')`,
        [senderName || `Cliente ${numero}`, numero]
      );
    }

    console.log(`✅ Mensagem registrada de ${numero}`);
  } catch (err) {
    console.error("❌ Erro ao processar mensagem:", err.message);
    throw err;
  }
}

/**
 * Processa atualização de status de mensagem
 */
async function processarAtualizacaoMensagem(dados) {
  const { data } = dados;
  console.log("📝 Atualização de mensagem:", data.status);
  // Implementar lógica de atualização de status
}

/**
 * Processa novo contato criado
 */
async function processarNovoContato(dados) {
  const { data } = dados;
  console.log("👤 Novo contato:", data.name);
  // Implementar lógica de novo contato
}

/**
 * Webhook de Mercado Livre
 * POST /webhook/mercado-livre
 */
async function webhookMercadoLivre(req, res) {
  const dados = req.body;

  try {
    console.log("🔔 Notificação Mercado Livre:", dados.resource);

    // Processa diferentes tipos de notificações
    if (dados.topic === "orders_v2") {
      await sincronizarPedidoMercadoLivre(dados.resource);
    } else if (dados.topic === "questions") {
      await processarPerguntaMercadoLivre(dados.resource);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro webhook Mercado Livre:", err.message);
    res.status(500).json({ erro: err.message });
  }
}

async function sincronizarPedidoMercadoLivre(resourceId) {
  try {
    console.log(`🛒 Sincronizando pedido ML: ${resourceId}`);
    // Implementar integração com Mercado Livre API
  } catch (err) {
    console.error("❌ Erro ao sincronizar pedido ML:", err.message);
  }
}

async function processarPerguntaMercadoLivre(resourceId) {
  try {
    console.log(`❓ Processando pergunta ML: ${resourceId}`);
    // Implementar processamento de perguntas
  } catch (err) {
    console.error("❌ Erro ao processar pergunta:", err.message);
  }
}

/**
 * Webhook de Shopee
 * POST /webhook/shopee
 */
async function webhookShopee(req, res) {
  const dados = req.body;

  try {
    console.log("🔔 Notificação Shopee:", dados.code);
    // Implementar processamento de webhooks Shopee
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro webhook Shopee:", err.message);
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Webhook de TikTok Shop
 * POST /webhook/tiktok-shop
 */
async function webhookTikTokShop(req, res) {
  const dados = req.body;

  try {
    console.log("🔔 Notificação TikTok Shop");
    // Implementar processamento de webhooks TikTok
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Erro webhook TikTok:", err.message);
    res.status(500).json({ erro: err.message });
  }
}

module.exports = {
  webhookEvolution,
  webhookMercadoLivre,
  webhookShopee,
  webhookTikTokShop
};
