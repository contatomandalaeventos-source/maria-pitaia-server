// Funções usadas por todas as telas do painel
const EMPRESA_ID = 1;
const LOGO = "https://www.mariapitaia.com.br/imagens/logo-marca.webp";

async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opcoes,
    body: opcoes.body && typeof opcoes.body !== "string" ? JSON.stringify(opcoes.body) : opcoes.body
  });
  if (r.status === 401) { location.href = "/login.html"; throw new Error("login"); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro || "Algo deu errado");
  return d;
}

const dinheiro = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = d => d ? new Date(d).toLocaleDateString("pt-BR") : "-";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function avisar(texto, ms = 3500) {
  let el = document.getElementById("aviso");
  if (!el) { el = document.createElement("div"); el.id = "aviso"; el.className = "aviso"; document.body.appendChild(el); }
  el.textContent = texto; el.classList.add("on");
  clearTimeout(avisar._t); avisar._t = setTimeout(() => el.classList.remove("on"), ms);
}

// barra de cima com "Início" e o título da tela
function topo(titulo) {
  const h = document.createElement("header");
  h.className = "topo";
  h.innerHTML = `<div class="in">
    <a class="voltar" href="/">← Início</a>
    <h1>${esc(titulo)}</h1><span class="esp"></span>
    <img src="${LOGO}" alt="Maria Pitaia" onerror="this.remove()">
  </div>`;
  document.body.prepend(h);
}

function abrir(id) { document.getElementById(id).classList.add("on"); }
function fechar(id) { document.getElementById(id).classList.remove("on"); }

const STATUS_CLASSE = s => ({ pago: "s-pago", novo: "s-novo", enviado: "s-enviado", entregue: "s-entregue", cancelado: "s-cancelado" }[s] || "s-aguardando");
const STATUS_NOME = s => ({ pago: "Pago · a enviar", novo: "Novo", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" }[s] || s);
