// ############################################################
// ##  DATABASE CONFIGURATION & SCHEMA INITIALIZATION        ##
// ##  Para: Maria Pitaia Criações                           ##
// ##  Marketplace: Mercado Livre, Shopee, TikTok Shop,     ##
// ##              Magalu, Amazon                             ##
// ############################################################

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "")
    ? false
    : { rejectUnauthorized: false }
});

// REDE DE SEGURANÇA: erros de conexão não derrubam o servidor
pool.on("error", (err) => {
  console.error("❌ Erro de conexão com banco (continuando):", err.message);
});

/**
 * SCHEMA DO BANCO DE DADOS
 * 8 tabelas principais para CRM + E-commerce
 */
const SCHEMA_SQL = `
-- ====== EMPRESAS (Multi-tenant) ======
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cnpj TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  whatsapp TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  logo_url TEXT,
  site TEXT,
  descricao TEXT,
  ativa BOOLEAN DEFAULT TRUE,
  criada_em TIMESTAMP DEFAULT NOW(),
  atualizada_em TIMESTAMP DEFAULT NOW()
);

-- ====== PRODUTOS (Catálogo de artesanato) ======
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  preco_custo NUMERIC(10,2),
  estoque INTEGER DEFAULT 0,
  sku TEXT UNIQUE,
  categoria TEXT,
  subcategoria TEXT,
  imagem_url TEXT,
  imagens_json JSONB,
  publicacoes_json JSONB,
  publicado_em TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON produtos(sku);

-- ====== CLIENTES ======
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  documento TEXT UNIQUE,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  origem TEXT,
  plataforma_vendas TEXT,
  tags_json JSONB,
  notas TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- ====== PEDIDOS ======
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  numero_pedido TEXT UNIQUE,
  plataforma TEXT,
  status TEXT DEFAULT 'pendente',
  valor_total NUMERIC(12,2) NOT NULL,
  valor_frete NUMERIC(10,2) DEFAULT 0,
  valor_desconto NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT,
  rastreamento TEXT,
  data_pedido TIMESTAMP,
  data_entrega_estimada DATE,
  data_entrega_real DATE,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_plataforma ON pedidos(plataforma);

-- ====== ITENS DO PEDIDO ======
CREATE TABLE IF NOT EXISTS itens_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  nome_produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedido_id);

-- ====== MENSAGENS WHATSAPP ======
CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
  tipo TEXT,
  direcao TEXT,
  conteudo TEXT NOT NULL,
  midia_url TEXT,
  status TEXT DEFAULT 'enviada',
  timestamp_evol TEXT,
  enviada_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_empresa ON mensagens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_cliente ON mensagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_pedido ON mensagens(pedido_id);

-- ====== LEADS & CONTATOS ======
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  origem TEXT,
  interesse TEXT,
  status TEXT DEFAULT 'novo',
  nota_ia TEXT,
  convertido_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_empresa ON leads(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ====== FINANCEIRO ======
CREATE TABLE IF NOT EXISTS financeiro (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
  tipo TEXT,
  descricao TEXT,
  valor NUMERIC(12,2) NOT NULL,
  data_transacao DATE,
  status TEXT DEFAULT 'pendente',
  forma_pagamento TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_empresa ON financeiro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_pedido ON financeiro(pedido_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_data ON financeiro(data_transacao);
`;

/**
 * Inicializa as tabelas do banco de dados
 */
async function inicializarBancoDados() {
  try {
    console.log("📊 Inicializando banco de dados...");

    // Divide o SQL em statements individuais
    const statements = SCHEMA_SQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Alguns erros são esperados (tabelas já existem, índices já criados)
        if (!err.message.includes("already exists") &&
            !err.message.includes("duplicate key")) {
          console.warn("⚠️  Aviso ao criar schema:", err.message.slice(0, 100));
        }
      }
    }

    console.log("✅ Schema do banco de dados pronto");
    return true;
  } catch (err) {
    console.error("❌ Erro crítico ao inicializar banco:", err.message);
    throw err;
  }
}

/**
 * Verifica se o banco está respondendo
 */
async function testarConexao() {
  try {
    const resultado = await pool.query("SELECT NOW()");
    console.log("✅ Conexão com PostgreSQL OK");
    return true;
  } catch (err) {
    console.error("❌ Não consegui conectar ao PostgreSQL:", err.message);
    return false;
  }
}

module.exports = {
  pool,
  inicializarBancoDados,
  testarConexao
};
