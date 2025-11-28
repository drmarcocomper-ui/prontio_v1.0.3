// assets/js/layout.js
// Responsável por carregar o menu lateral e o cabeçalho (parciais)
// e marcar o item de menu ativo.

async function carregarSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) {
    console.warn("layout.js: #sidebar-container não encontrado na página.");
    return;
  }

  try {
    const resp = await fetch("partials/sidebar.html");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const html = await resp.text();
    container.innerHTML = html;

    // Marca link ativo de acordo com data-page-id no <body>
    const body = document.body;
    const paginaId = body.getAttribute("data-page-id"); // ex.: "prontuario"
    if (paginaId) {
      const linkAtivo = container.querySelector(
        `.nav-link[data-page-id="${paginaId}"]`
      );
      if (linkAtivo) {
        linkAtivo.classList.add("active");
      }
    }

    // Preenche ano no rodapé
    const spanAno = container.querySelector("#anoAtualSidebar");
    if (spanAno) {
      spanAno.textContent = new Date().getFullYear();
    }
  } catch (e) {
    console.error("layout.js - erro ao carregar sidebar.html:", e);
  }
}

async function carregarTopbar() {
  const container = document.getElementById("topbar-container");
  if (!container) {
    console.warn("layout.js: #topbar-container não encontrado na página.");
    return;
  }

  try {
    const resp = await fetch("partials/topbar.html");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const html = await resp.text();
    container.innerHTML = html;

    // Define um título padrão usando <title>, se a página não sobrescrever
    const tituloPagina = document.title || "PRONTIO";
    const h1 = container.querySelector("#topbar-title-text");
    if (h1 && !h1.dataset.fixed) {
      h1.textContent = tituloPagina;
    }
  } catch (e) {
    console.error("layout.js - erro ao carregar topbar.html:", e);
  }
}

async function inicializarLayout() {
  await carregarSidebar();
  await carregarTopbar();
}

// Roda em todas as páginas que incluírem layout.js
document.addEventListener("DOMContentLoaded", () => {
  inicializarLayout();
});
