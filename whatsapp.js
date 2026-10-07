// ============================================================
// INTEGRAÇÃO WHATSAPP: Evolution API
// ============================================================

const axios = require("axios");

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN || "";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "maria_pitaia";

const client = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
    "apikey": EVOLUTION_API_TOKEN
  },
  timeout: 30000
});

/**
 * Envia mensagem de texto via WhatsApp
 */
async function enviarMensagem(numeroDestino, texto) {
  try {
    const resposta = await client.post(`/message/sendText/${INSTANCE_NAME}`, {
      number: numeroDestino,
      text: texto
    });

    return {
      sucesso: true,
      messageId: resposta.data?.key?.id,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem WhatsApp:", err.message);
    return {
      sucesso: false,
      erro: err.message
    };
  }
}

/**
 * Envia imagem via WhatsApp
 */
async function enviarImagem(numeroDestino, urlImagem, legenda = "") {
  try {
    const resposta = await client.post(`/message/sendImage/${INSTANCE_NAME}`, {
      number: numeroDestino,
      image: {
        url: urlImagem
      },
      caption: legenda
    });

    return {
      sucesso: true,
      messageId: resposta.data?.key?.id
    };
  } catch (err) {
    console.error("❌ Erro ao enviar imagem:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Envia template de catálogo de produtos
 */
async function enviarCatalogo(numeroDestino, produtos) {
  try {
    // Monta a mensagem com os produtos
    let texto = "🌿 *Catálogo de Artesanato* 🌿\n\n";

    for (const prod of produtos) {
      texto += `✨ ${prod.nome}\n`;
      texto += `💰 ${prod.preco}\n`;
      texto += `${prod.descricao}\n\n`;
    }

    texto += "Tem interesse em algum produto? Me avise! 💚";

    return await enviarMensagem(numeroDestino, texto);
  } catch (err) {
    console.error("❌ Erro ao enviar catálogo:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Envia confirmação de pedido
 */
async function enviarConfirmacaoPedido(numeroDestino, pedido) {
  try {
    const texto = `
🎉 *Pedido Confirmado!* 🎉

📦 Número: ${pedido.numero_pedido}
💰 Total: R$ ${pedido.valor_total.toFixed(2)}
📍 Status: ${pedido.status}

Você receberá em breve as informações de entrega! 🚚

Obrigada por escolher Maria Pitaia Criações! 💚🌿
    `.trim();

    return await enviarMensagem(numeroDestino, texto);
  } catch (err) {
    console.error("❌ Erro ao enviar confirmação:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Envia atualização de entrega
 */
async function enviarAtualizacaoEntrega(numeroDestino, pedido, rastreamento) {
  try {
    const texto = `
📦 *Seu Pedido Saiu para Entrega!* 📦

Número: ${pedido.numero_pedido}
Código de Rastreamento: ${rastreamento}

Acompanhe a entrega no link:
${rastreamento}

Qualquer dúvida, é só chamar! 💚
    `.trim();

    return await enviarMensagem(numeroDestino, texto);
  } catch (err) {
    console.error("❌ Erro ao enviar atualização:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Recebe e processa webhooks da Evolution API
 */
function processarWebhook(dados) {
  const { type, data } = dados;

  switch (type) {
    case "messages.upsert":
      return {
        tipo: "mensagem",
        numero: data?.messages?.[0]?.key?.remoteJid,
        conteudo: data?.messages?.[0]?.message?.conversation,
        timestamp: data?.messages?.[0]?.messageTimestamp
      };

    case "chats.upsert":
      return {
        tipo: "chat",
        numero: data?.chats?.[0]?.id,
        nome: data?.chats?.[0]?.name
      };

    default:
      return null;
  }
}

module.exports = {
  enviarMensagem,
  enviarImagem,
  enviarCatalogo,
  enviarConfirmacaoPedido,
  enviarAtualizacaoEntrega,
  processarWebhook
};
