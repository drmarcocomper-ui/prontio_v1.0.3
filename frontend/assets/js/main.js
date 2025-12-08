// =====================================
// PRONTIO - main.js
// Ponto de inicialização global do front-end.
//
// Versão baseada em namespace global PRONTIO:
// - NÃO usa mais ES Modules (import/export)
// - Espera que os arquivos core/widgets/pages
//   tenham sido carregados via <script> na página.
//
// Responsabilidades:
// - Aplicar preferências globais (tema, etc.)
// - Inicializar layout (sidebar, topbar)
// - Inicializar UI global (nome do usuário, ano, etc.)
// - Inicializar a página específica com base em
//   <body data-page="..."> (ou data-page-id, retrocompat)
// =====================================

(function (global, document) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});

  // Garante subnamespaces
  PRONTIO.core = PRONTIO.core || {};
  PRONTIO.ui = PRONTIO.ui || {};
  PRONTIO.widgets = PRONTIO.widgets || {};
  PRONTIO.pages = PRONTIO.pages || {};

  // =====================================
  // Registro e inicialização de páginas
  // =====================================

  /**
   * Registra uma página e sua função de inicialização.
   * Exemplo dentro de agenda.js:
   *   PRONTIO.registerPage("agenda", function initAgenda() { ... });
   */
  if (typeof PRONTIO.registerPage !== "function") {
    PRONTIO.registerPage = function registerPage(pageName, initFn) {
      if (!pageName || typeof initFn !== "function") {
        console.warn(
          "[PRONTIO.main] registerPage: parâmetros inválidos.",
          pageName,
          initFn
        );
        return;
      }

      PRONTIO.pages[pageName] = {
        init: initFn
      };

      // log opcional para debug
      console.debug(
        "[PRONTIO.main] Página registrada:",
        pageName,
        "→",
        initFn.name || "anon"
      );
    };
  }

  /**
   * Inicializa uma página registrada.
   * Procura em PRONTIO.pages[pageName].init.
   */
  if (typeof PRONTIO.initPage !== "function") {
    PRONTIO.initPage = function initPage(pageName) {
      if (!pageName) {
        console.warn(
          "[PRONTIO.main] initPage chamado sem pageName. Nada será inicializado."
        );
        return;
      }

      const pageObj =
        PRONTIO.pages && typeof PRONTIO.pages === "object"
          ? PRONTIO.pages[pageName]
          : null;

      if (!pageObj || typeof pageObj.init !== "function") {
        console.warn(
          "[PRONTIO.main] Página não registrada ou sem init():",
          pageName,
          "Verifique se existe algo como PRONTIO.registerPage('" +
            pageName +
            "', fn)."
        );
        return;
      }

      try {
        console.debug("[PRONTIO.main] Inicializando página:", pageName);
        pageObj.init();
      } catch (err) {
        console.error(
          "[PRONTIO.main] Erro ao executar inicializador da página:",
          pageName,
          err
        );
      }
    };
  }

  // ----------------------------------------
  // Preferências globais (tema, sidebar, etc.)
  // ----------------------------------------
  function applyUserPreferences() {
    // Tema claro/escuro
    try {
      // Novo padrão: core/theme.js → PRONTIO.theme.init()
      if (PRONTIO.theme && typeof PRONTIO.theme.init === "function") {
        PRONTIO.theme.init();
      }
      // Retrocompat: ui/theme.js → PRONTIO.ui.initTheme
      else if (PRONTIO.ui && typeof PRONTIO.ui.initTheme === "function") {
        PRONTIO.ui.initTheme();
      }
    } catch (e) {
      console.error("[PRONTIO.main] Erro ao inicializar tema:", e);
    }

    // Sidebar compacta (preferência salva)
    try {
      const storage = PRONTIO.core.storage;
      const body = document.body;

      if (storage && typeof storage.isSidebarCompact === "function" && body) {
        const compact = storage.isSidebarCompact();
        if (compact) {
          body.classList.add("sidebar-compact");
        } else {
          body.classList.remove("sidebar-compact");
        }
      }
    } catch (e) {
      console.error("[PRONTIO.main] Erro ao aplicar preferência de sidebar:", e);
    }
  }

  // ----------------------------------------
  // Inicialização de layout (sidebar / topbar)
  // ----------------------------------------
  function initLayout(pageName) {
    // SIDEBAR
    try {
      const sidebarWidget =
        PRONTIO.widgets && PRONTIO.widgets.sidebar
          ? PRONTIO.widgets.sidebar
          : null;

      if (sidebarWidget && typeof sidebarWidget.init === "function") {
        sidebarWidget.init();
      } else if (typeof global.initSidebar === "function") {
        // retrocompat caso ainda exista função global antiga
        global.initSidebar();
      }
    } catch (e) {
      console.error("[PRONTIO.main] Erro ao inicializar sidebar:", e);
    }

    // TOPBAR
    try {
      const topbarWidget =
        PRONTIO.widgets && PRONTIO.widgets.topbar
          ? PRONTIO.widgets.topbar
          : null;

      if (topbarWidget && typeof topbarWidget.init === "function") {
        topbarWidget.init({ page: pageName });
      } else if (typeof global.initTopbar === "function") {
        // retrocompat caso ainda exista função global antiga
        global.initTopbar({ pageId: pageName });
      }
    } catch (e) {
      console.error("[PRONTIO.main] Erro ao inicializar topbar:", e);
    }
  }

  // ----------------------------------------
  // Inicialização de UI global (nome, ano, etc.)
  // ----------------------------------------
  function initGlobalUI() {
    try {
      const uiCore =
        PRONTIO.core && PRONTIO.core.uiCore ? PRONTIO.core.uiCore : null;

      if (uiCore && typeof uiCore.initGlobalUI === "function") {
        uiCore.initGlobalUI();
      }
    } catch (e) {
      console.error("[PRONTIO.main] Erro ao inicializar UI global:", e);
    }
  }

  // ----------------------------------------
  // Inicialização da página específica
  // ----------------------------------------
  function initCurrentPage() {
    const body = document.body;
    if (!body) return;

    // Novo padrão: data-page="pacientes"
    // Retrocompat: data-page-id="pacientes"
    const pageName =
      body.getAttribute("data-page") ||
      body.getAttribute("data-page-id") ||
      "";

    if (!pageName) {
      console.warn(
        "[PRONTIO.main] <body> não possui data-page ou data-page-id. Nenhuma página específica será inicializada."
      );
      return;
    }

    if (typeof PRONTIO.initPage === "function") {
      try {
        PRONTIO.initPage(pageName);
      } catch (err) {
        console.error(
          "[PRONTIO.main] Erro ao executar inicializador da página:",
          pageName,
          err
        );
      }
    } else {
      console.warn(
        "[PRONTIO.main] PRONTIO.initPage não está definido. Verifique o registro das páginas."
      );
    }
  }

  // ----------------------------------------
  // Fluxo principal
  // ----------------------------------------
  function onReady() {
    // 1) Preferências globais (tema, sidebar, etc.)
    applyUserPreferences();

    // 2) Layout (sidebar, topbar)
    const body = document.body;
    const pageName =
      (body &&
        (body.getAttribute("data-page") ||
          body.getAttribute("data-page-id"))) ||
      "";
    initLayout(pageName);

    // 3) UI global (nome do usuário, ano, etc.)
    initGlobalUI();

    // 4) Página específica
    initCurrentPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})(window, document);
