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

async function conferir() {
  try {
    const pedidos = await ml.obterPedidos(1);
    const vistos = new Set((await pool.query(
      `SELECT pedido_id FROM avisos_pedidos WHERE plataforma='mercado_livre'`
    )).rows.map(r => r.pedido_id));

    for (const p of pedidos) {
      const id = String(p.id);
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

async function iniciar() {
  try {
    await prepararTabela();
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

module.exports = { iniciar, conferir };
