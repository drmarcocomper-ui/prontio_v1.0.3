// assets/js/ui/sidebar.js
// Controle da sidebar (menu lateral) do PRONTIO.
//
// Desktop:
//  - Sempre inicia EXPANDIDA (sem body.sidebar-compact).
//  - Botão .js-toggle-compact alterna body.sidebar-compact (recolhe/expande).
//
// Mobile (max-width: 900px):
//  - Sidebar funciona como drawer (off-canvas), controlado por body.sidebar-open.
//  - Botão .js-toggle-sidebar abre/fecha o drawer.
//  - Clicar no backdrop ou em um link do menu fecha o drawer.
//
// Em todas as larguras:
//  - Destaca o link ativo com base em data-page-id do <body>.
//
// CSS respeitado (no seu sidebar.css):
//   body.sidebar-compact .sidebar { width: 72px; ... }
//   body.sidebar-compact .sidebar .nav-link .label { display: none; }
//   @media (max-width: 900px) .sidebar => translateX(-100%) + body.sidebar-open .sidebar => translateX(0)

function getSidebarElement() {
  return document.getElementById("sidebar");
}

/* -------- helpers de estado compacto (desktop) -------- */

/**
 * Aplica estado compacto / expandido usando APENAS body.sidebar-compact.
 * @param {boolean} isCompact
 */
function setCompact(isCompact) {
  const body = document.body;
  if (!body) return;

  if (isCompact) {
    body.classList.add("sidebar-compact");
  } else {
    body.classList.remove("sidebar-compact");
  }
}

function isCompact() {
  return document.body.classList.contains("sidebar-compact");
}

/**
 * Ajusta aria-pressed no botão de toggle compacto.
 * @param {HTMLElement} btn
 * @param {boolean} isCompact
 */
function syncToggleButtonAria(btn, isCompact) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", isCompact ? "true" : "false");
}

/* -------- helpers de drawer (mobile) -------- */

function openDrawer() {
  document.body.classList.add("sidebar-open");
}

function closeDrawer() {
  document.body.classList.remove("sidebar-open");
}

function toggleDrawer() {
  const open = document.body.classList.contains("sidebar-open");
  if (open) {
    closeDrawer();
  } else {
    openDrawer();
  }
}

/* -------- destacar link ativo -------- */

/**
 * Destaca o link ativo conforme data-page-id do <body>.
 */
function highlightActiveNavLink(sidebar) {
  if (!sidebar || !document.body) return;

  const pageId = document.body.dataset.pageId || "";
  if (!pageId) return;

  const links = sidebar.querySelectorAll(".nav-link[data-page-id]");
  links.forEach((link) => {
    const linkPageId = link.getAttribute("data-page-id") || "";
    const isActive = linkPageId === pageId;

    if (isActive) {
      link.classList.add("active"); // seu CSS usa .nav-link.active
      if (!link.hasAttribute("aria-current")) {
        link.setAttribute("aria-current", "page");
      }
    } else {
      link.classList.remove("active");
      if (link.getAttribute("aria-current") === "page") {
        link.removeAttribute("aria-current");
      }
    }
  });
}

// -----------------------------------------------------
// API pública
// -----------------------------------------------------

export function initSidebar() {
  const sidebar = getSidebarElement();
  if (!sidebar) {
    console.warn("PRONTIO.sidebar: #sidebar não encontrado.");
    return;
  }

  const body = document.body;

  // Estado inicial global:
  // - sem compacto
  // - sem drawer aberto
  body.classList.remove("sidebar-compact");
  body.classList.remove("sidebar-open");

  // 1) Botão de modo compacto (desktop)
  const btnCompact = sidebar.querySelector(".js-toggle-compact");
  if (btnCompact) {
    // estado inicial: expandido => aria-pressed = false
    syncToggleButtonAria(btnCompact, false);

    btnCompact.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 900px)").matches;

      // Em mobile, esse botão pode ser ignorado (ou reaproveitado para abrir/fechar o drawer).
      if (isMobile) {
        toggleDrawer();
        return;
      }

      const next = !isCompact();
      setCompact(next);
      syncToggleButtonAria(btnCompact, next);
    });
  }

  // 2) Botão sanduíche para abrir/fechar drawer (mobile)
  const toggleSidebarButtons = document.querySelectorAll(".js-toggle-sidebar");
  toggleSidebarButtons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      toggleDrawer();
    });
  });

  // 3) Backdrop do drawer (fecha ao clicar)
  const backdrop = document.querySelector("[data-sidebar-backdrop]");
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeDrawer();
    });
  }

  // 4) Ao clicar em qualquer link do menu, fecha o drawer em mobile
  const navLinks = sidebar.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 900px)").matches;
      if (isMobile) {
        closeDrawer();
      }
    });
  });

  // 5) Destacar link ativo
  highlightActiveNavLink(sidebar);

  console.log(
    "PRONTIO.sidebar: initSidebar concluído. Compacto? =",
    isCompact(),
    "| Drawer aberto? =",
    document.body.classList.contains("sidebar-open")
  );
}

// -----------------------------------------------------
// Retrocompat: window.PRONTIO.ui.sidebar
// -----------------------------------------------------
try {
  const g = (window.PRONTIO = window.PRONTIO || {});
  g.ui = g.ui || {};
  g.ui.sidebar = g.ui.sidebar || {};
  g.ui.sidebar.init = initSidebar;
} catch (e) {
  // ambiente sem window (ex.: testes), ignorar
}
