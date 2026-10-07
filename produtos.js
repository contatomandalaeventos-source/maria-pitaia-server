// ============================================================
// ROTAS: Gerenciamento de Produtos Multi-Marketplace
// ============================================================

const { pool } = require("./database");
const marketplaces = require("./marketplaces");

/**
 * Listar todos os produtos com sincronização
 */
async function listarProdutos(req, res) {
  const { empresa_id } = req.params;

  try {
    const resultado = await pool.query(
      `SELECT * FROM produtos
       WHERE empresa_id = $1 AND ativo = TRUE
       ORDER BY nome ASC`,
      [empresa_id]
    );

    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Criar novo produto
 */
async function criarProduto(req, res) {
  const { empresa_id } = req.params;
  const {
    nome,
    descricao,
    preco,
    preco_custo,
    estoque,
    sku,
    categoria,
    imagem_url
  } = req.body;

  if (!nome || !preco || !estoque) {
    return res.status(400).json({
      erro: "Nome, preço e estoque são obrigatórios"
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO produtos
       (empresa_id, nome, descricao, preco, preco_custo, estoque, sku, categoria, imagem_url, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING *`,
      [empresa_id, nome, descricao, preco, preco_custo, estoque, sku, categoria, imagem_url]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Atualizar produto
 */
async function atualizarProduto(req, res) {
  const { empresa_id, produto_id } = req.params;
  const { nome, descricao, preco, preco_custo, estoque, categoria } = req.body;

  const campos = [];
  const valores = [];
  const adicionarCampo = (col, val) => {
    if (val !== undefined && val !== null) {
      valores.push(val);
      campos.push(`${col}=$${valores.length}`);
    }
  };

  adicionarCampo("nome", nome);
  adicionarCampo("descricao", descricao);
  adicionarCampo("preco", preco);
  adicionarCampo("preco_custo", preco_custo);
  adicionarCampo("estoque", estoque);
  adicionarCampo("categoria", categoria);

  if (campos.length === 0) {
    return res.status(400).json({ erro: "Nada para alterar" });
  }

  valores.push(empresa_id, produto_id);

  try {
    const resultado = await pool.query(
      `UPDATE produtos
       SET ${campos.join(", ")}, atualizado_em = NOW()
       WHERE empresa_id = $${valores.length - 1} AND id = $${valores.length}
       RETURNING *`,
      valores
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Publicar produto em UMA plataforma
 * POST /api/empresas/:empresa_id/produtos/:produto_id/publicar/:plataforma
 */
async function publicarEmPlataforma(req, res) {
  const { empresa_id, produto_id, plataforma } = req.params;

  try {
    // Busca o produto
    const prod = await pool.query(
      `SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2`,
      [produto_id, empresa_id]
    );

    if (prod.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = prod.rows[0];

    // Publica conforme a plataforma
    let resultado = {};

    switch (plataforma.toLowerCase()) {
      case "mercado-livre":
      case "ml":
        resultado = await publicarMercadoLivre(produto);
        break;
      case "shopee":
        resultado = await publicarShopee(produto);
        break;
      case "tiktok":
      case "tiktok-shop":
        resultado = await publicarTikTokShop(produto);
        break;
      case "magalu":
        resultado = await publicarMagalu(produto);
        break;
      case "amazon":
        resultado = await publicarAmazon(produto);
        break;
      default:
        return res.status(400).json({ erro: "Plataforma desconhecida" });
    }

    res.json({
      plataforma,
      publicado: true,
      id_externo: resultado.id,
      url: resultado.url
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Publicar produto em TODAS as plataformas
 * POST /api/empresas/:empresa_id/produtos/:produto_id/publicar-tudo
 */
async function publicarEmTodas(req, res) {
  const { empresa_id, produto_id } = req.params;

  try {
    const prod = await pool.query(
      `SELECT * FROM produtos WHERE id = $1 AND empresa_id = $2`,
      [produto_id, empresa_id]
    );

    if (prod.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = prod.rows[0];
    const resultados = {};

    // Publica em tudo em paralelo
    const promises = [
      publicarMercadoLivre(produto).then(r => { resultados.mercado_livre = r; }),
      publicarShopee(produto).then(r => { resultados.shopee = r; }),
      publicarTikTokShop(produto).then(r => { resultados.tiktok_shop = r; }),
      publicarMagalu(produto).then(r => { resultados.magalu = r; }),
      publicarAmazon(produto).then(r => { resultados.amazon = r; })
    ];

    await Promise.all(promises.map(p => p.catch(e => {
      console.error("Erro ao publicar:", e.message);
      return null;
    })));

    // Atualiza produto com status de publicação
    await pool.query(
      `UPDATE produtos
       SET publicacoes_json = $1, atualizado_em = NOW()
       WHERE id = $2`,
      [JSON.stringify(resultados), produto_id]
    );

    res.json({
      produto: produto.nome,
      publicado_em_tudo: true,
      resultados: resultados
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * Sincronizar estoque de uma plataforma
 * POST /api/empresas/:empresa_id/produtos/:produto_id/sincronizar-estoque/:plataforma
 */
async function sincronizarEstoque(req, res) {
  const { empresa_id, produto_id, plataforma } = req.params;

  try {
    // Busca estoque na plataforma
    let estoque_plataforma = 0;

    switch (plataforma.toLowerCase()) {
      case "mercado-livre":
        estoque_plataforma = await verificarEstoqueMercadoLivre(produto_id);
        break;
      case "shopee":
        estoque_plataforma = await verificarEstoqueShopee(produto_id);
        break;
      case "tiktok-shop":
        estoque_plataforma = await verificarEstoqueTikTok(produto_id);
        break;
      // ... outros
    }

    // Atualiza no banco
    await pool.query(
      `UPDATE produtos SET estoque = $1, atualizado_em = NOW() WHERE id = $2`,
      [estoque_plataforma, produto_id]
    );

    res.json({
      plataforma,
      estoque_sincronizado: estoque_plataforma
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

/**
 * ========== FUNÇÕES DE PUBLICAÇÃO ==========
 */

async function publicarMercadoLivre(produto) {
  try {
    console.log(`📤 Publicando ${produto.nome} no Mercado Livre...`);
    // Chamaria ML API aqui
    return {
      id: `ML-${produto.id}`,
      url: `https://mercadolivre.com.br/items/${produto.sku}`
    };
  } catch (err) {
    console.error("❌ Erro publicar ML:", err.message);
    throw err;
  }
}

async function publicarShopee(produto) {
  try {
    console.log(`📤 Publicando ${produto.nome} na Shopee...`);
    // Chamaria Shopee API aqui
    return {
      id: `SHOPEE-${produto.id}`,
      url: `https://shopee.com.br/product/${produto.sku}`
    };
  } catch (err) {
    console.error("❌ Erro publicar Shopee:", err.message);
    throw err;
  }
}

async function publicarTikTokShop(produto) {
  try {
    console.log(`📤 Publicando ${produto.nome} no TikTok Shop...`);
    return {
      id: `TIKTOK-${produto.id}`,
      url: `https://tiktokshop.com/product/${produto.sku}`
    };
  } catch (err) {
    console.error("❌ Erro publicar TikTok:", err.message);
    throw err;
  }
}

async function publicarMagalu(produto) {
  try {
    console.log(`📤 Publicando ${produto.nome} no Magalu...`);
    return {
      id: `MAGALU-${produto.id}`,
      url: `https://magalu.com.br/product/${produto.sku}`
    };
  } catch (err) {
    console.error("❌ Erro publicar Magalu:", err.message);
    throw err;
  }
}

async function publicarAmazon(produto) {
  try {
    console.log(`📤 Publicando ${produto.nome} na Amazon...`);
    return {
      id: `AMAZON-${produto.id}`,
      url: `https://amazon.com.br/product/${produto.sku}`
    };
  } catch (err) {
    console.error("❌ Erro publicar Amazon:", err.message);
    throw err;
  }
}

/**
 * ========== FUNÇÕES DE VERIFICAÇÃO DE ESTOQUE ==========
 */

async function verificarEstoqueMercadoLivre(produto_id) {
  console.log(`🔍 Verificando estoque ML para produto ${produto_id}`);
  // Implementar chamada para ML API
  return 0;
}

async function verificarEstoqueShopee(produto_id) {
  console.log(`🔍 Verificando estoque Shopee para produto ${produto_id}`);
  // Implementar
  return 0;
}

async function verificarEstoqueTikTok(produto_id) {
  console.log(`🔍 Verificando estoque TikTok para produto ${produto_id}`);
  // Implementar
  return 0;
}

module.exports = {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  publicarEmPlataforma,
  publicarEmTodas,
  sincronizarEstoque
};
