// ============================================================
// INTEGRAÇÕES: Mercado Livre, Shopee, TikTok Shop, etc
// ============================================================

const axios = require("axios");

/**
 * MERCADO LIVRE API
 */
class MercadoLivre {
  constructor(clientId, clientSecret, userId) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.userId = userId;
    this.baseURL = "https://api.mercadolibre.com";
    this.accessToken = null;
  }

  async autenticar(authCode) {
    try {
      const res = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        redirect_uri: process.env.CALLBACK_URL || "http://localhost:3000/callback/ml"
      });

      this.accessToken = res.data.access_token;
      return res.data;
    } catch (err) {
      console.error("❌ Erro ao autenticar com Mercado Livre:", err.message);
      throw err;
    }
  }

  async obterPedidos(filtro = {}) {
    try {
      if (!this.accessToken) throw new Error("Não autenticado");

      const res = await axios.get(
        `${this.baseURL}/orders/search`,
        {
          params: {
            seller_id: this.userId,
            ...filtro
          },
          headers: {
            "Authorization": `Bearer ${this.accessToken}`
          }
        }
      );

      return res.data.results || [];
    } catch (err) {
      console.error("❌ Erro ao obter pedidos ML:", err.message);
      return [];
    }
  }

  async obterProdutos() {
    try {
      if (!this.accessToken) throw new Error("Não autenticado");

      const res = await axios.get(
        `${this.baseURL}/users/${this.userId}/listings`,
        {
          headers: {
            "Authorization": `Bearer ${this.accessToken}`
          }
        }
      );

      return res.data || [];
    } catch (err) {
      console.error("❌ Erro ao obter produtos ML:", err.message);
      return [];
    }
  }
}

/**
 * SHOPEE API
 */
class Shopee {
  constructor(partnerId, partnerKey) {
    this.partnerId = partnerId;
    this.partnerKey = partnerKey;
    this.baseURL = "https://partner.shopeemobile.com/api/v2";
    this.accessToken = null;
  }

  async autenticar(codeAutorizacao) {
    try {
      const res = await axios.post(`${this.baseURL}/auth/token/get`, {
        partner_id: this.partnerId,
        partner_key: this.partnerKey,
        code: codeAutorizacao
      });

      this.accessToken = res.data.access_token;
      return res.data;
    } catch (err) {
      console.error("❌ Erro ao autenticar com Shopee:", err.message);
      throw err;
    }
  }

  async obterPedidos(loja_id, filtro = {}) {
    try {
      if (!this.accessToken) throw new Error("Não autenticado");

      const res = await axios.get(
        `${this.baseURL}/order/orders_list`,
        {
          params: {
            partner_id: this.partnerId,
            shop_id: loja_id,
            ...filtro
          },
          headers: {
            "X-API-Access-Token": this.accessToken
          }
        }
      );

      return res.data.response?.orders || [];
    } catch (err) {
      console.error("❌ Erro ao obter pedidos Shopee:", err.message);
      return [];
    }
  }
}

/**
 * TIKTOK SHOP API
 */
class TikTokShop {
  constructor(channelId, accessToken) {
    this.channelId = channelId;
    this.accessToken = accessToken;
    this.baseURL = "https://open-api.tiktokshop.com";
  }

  async obterPedidos(filtro = {}) {
    try {
      const res = await axios.get(
        `${this.baseURL}/order/orders`,
        {
          params: {
            shop_cipher: this.channelId,
            ...filtro
          },
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      return res.data.data?.orders || [];
    } catch (err) {
      console.error("❌ Erro ao obter pedidos TikTok:", err.message);
      return [];
    }
  }

  async obterProdutos() {
    try {
      const res = await axios.get(
        `${this.baseURL}/product/products`,
        {
          params: {
            shop_cipher: this.channelId
          },
          headers: {
            "Authorization": `Bearer ${this.accessToken}`
          }
        }
      );

      return res.data.data?.products || [];
    } catch (err) {
      console.error("❌ Erro ao obter produtos TikTok:", err.message);
      return [];
    }
  }
}

/**
 * MAGALU API (B2B Seller)
 */
class Magalu {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = "https://api.mgalureversing.com.br/v2";
  }

  async obterPedidos(filtro = {}) {
    try {
      const res = await axios.get(
        `${this.baseURL}/orders`,
        {
          params: filtro,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      return res.data.data || [];
    } catch (err) {
      console.error("❌ Erro ao obter pedidos Magalu:", err.message);
      return [];
    }
  }
}

/**
 * AMAZON SP API
 */
class AmazonSP {
  constructor(accessKeyId, secretAccessKey, sellerId) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sellerId = sellerId;
    this.baseURL = "https://sellingpartnerapi-na.amazon.com";
  }

  async obterPedidos(dataInicio, dataFim) {
    try {
      // Implementação simplificada
      // Em produção, usar Amazon SDK oficial
      console.log("📦 Sincronizando pedidos Amazon...");
      return [];
    } catch (err) {
      console.error("❌ Erro ao obter pedidos Amazon:", err.message);
      return [];
    }
  }
}

/**
 * SINCRONIZADOR CENTRAL DE TODOS OS MARKETPLACES
 */
class SincronizadorMarketplaces {
  constructor(config) {
    this.config = config;
    this.mercadoLivre = config.mercadoLivre ? new MercadoLivre(
      config.mercadoLivre.clientId,
      config.mercadoLivre.clientSecret,
      config.mercadoLivre.userId
    ) : null;

    this.shopee = config.shopee ? new Shopee(
      config.shopee.partnerId,
      config.shopee.partnerKey
    ) : null;

    this.tikTokShop = config.tikTokShop ? new TikTokShop(
      config.tikTokShop.channelId,
      config.tikTokShop.accessToken
    ) : null;

    this.magalu = config.magalu ? new Magalu(config.magalu.apiKey) : null;
    this.amazonSp = config.amazonSp ? new AmazonSP(
      config.amazonSp.accessKeyId,
      config.amazonSp.secretAccessKey,
      config.amazonSp.sellerId
    ) : null;
  }

  async sincronizarTodos(empresaId, pool) {
    const resultados = {
      mercadoLivre: [],
      shopee: [],
      tikTokShop: [],
      magalu: [],
      amazonSp: []
    };

    try {
      console.log("🔄 Iniciando sincronização de todos os marketplaces...");

      // Mercado Livre
      if (this.mercadoLivre) {
        resultados.mercadoLivre = await this.sincronizarMercadoLivre(empresaId, pool);
      }

      // Shopee
      if (this.shopee) {
        resultados.shopee = await this.sincronizarShopee(empresaId, pool);
      }

      // TikTok Shop
      if (this.tikTokShop) {
        resultados.tikTokShop = await this.sincronizarTikTokShop(empresaId, pool);
      }

      // Magalu
      if (this.magalu) {
        resultados.magalu = await this.sincronizarMagalu(empresaId, pool);
      }

      // Amazon
      if (this.amazonSp) {
        resultados.amazonSp = await this.sincronizarAmazon(empresaId, pool);
      }

      console.log("✅ Sincronização concluída", resultados);
      return resultados;
    } catch (err) {
      console.error("❌ Erro na sincronização:", err.message);
      throw err;
    }
  }

  async sincronizarMercadoLivre(empresaId, pool) {
    try {
      const pedidos = await this.mercadoLivre.obterPedidos();
      console.log(`📦 ${pedidos.length} pedidos do Mercado Livre encontrados`);
      return pedidos;
    } catch (err) {
      console.error("❌ Erro sincronizando ML:", err.message);
      return [];
    }
  }

  async sincronizarShopee(empresaId, pool) {
    try {
      const pedidos = await this.shopee.obterPedidos(this.config.shopee.lojaId);
      console.log(`📦 ${pedidos.length} pedidos Shopee encontrados`);
      return pedidos;
    } catch (err) {
      console.error("❌ Erro sincronizando Shopee:", err.message);
      return [];
    }
  }

  async sincronizarTikTokShop(empresaId, pool) {
    try {
      const pedidos = await this.tikTokShop.obterPedidos();
      console.log(`📦 ${pedidos.length} pedidos TikTok Shop encontrados`);
      return pedidos;
    } catch (err) {
      console.error("❌ Erro sincronizando TikTok:", err.message);
      return [];
    }
  }

  async sincronizarMagalu(empresaId, pool) {
    try {
      const pedidos = await this.magalu.obterPedidos();
      console.log(`📦 ${pedidos.length} pedidos Magalu encontrados`);
      return pedidos;
    } catch (err) {
      console.error("❌ Erro sincronizando Magalu:", err.message);
      return [];
    }
  }

  async sincronizarAmazon(empresaId, pool) {
    try {
      const dataInicio = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      const dataFim = new Date();
      const pedidos = await this.amazonSp.obterPedidos(dataInicio, dataFim);
      console.log(`📦 ${pedidos.length} pedidos Amazon encontrados`);
      return pedidos;
    } catch (err) {
      console.error("❌ Erro sincronizando Amazon:", err.message);
      return [];
    }
  }
}

module.exports = {
  MercadoLivre,
  Shopee,
  TikTokShop,
  Magalu,
  AmazonSP,
  SincronizadorMarketplaces
};
