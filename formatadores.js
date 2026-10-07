// ============================================================
// UTILIDADES: Formatadores de dados
// ============================================================

/**
 * Formata número como moeda em Real
 */
function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor);
}

/**
 * Formata data no padrão brasileiro
 */
function formatarData(data) {
  if (!data) return "";
  const d = new Date(data);
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Formata data e hora
 */
function formatarDataHora(data) {
  if (!data) return "";
  const d = new Date(data);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(d);
}

/**
 * Formata telefone/WhatsApp
 */
function formatarTelefone(tel) {
  const clean = String(tel || "").replace(/\D/g, "");
  if (clean.length !== 11) return tel;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

/**
 * Remove formatação de telefone
 */
function limparTelefone(tel) {
  return String(tel || "").replace(/\D/g, "");
}

/**
 * Formata CNPJ
 */
function formatarCNPJ(cnpj) {
  const clean = String(cnpj || "").replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/` +
         `${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/**
 * Limpa CNPJ
 */
function limparCNPJ(cnpj) {
  return String(cnpj || "").replace(/\D/g, "");
}

/**
 * Formata SKU de produto
 */
function formatarSKU(nome, numero) {
  const base = nome
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return `${base}-${String(numero || "").padStart(4, "0")}`;
}

module.exports = {
  formatarMoeda,
  formatarData,
  formatarDataHora,
  formatarTelefone,
  limparTelefone,
  formatarCNPJ,
  limparCNPJ,
  formatarSKU
};
