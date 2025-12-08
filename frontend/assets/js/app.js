// =====================================
// PRONTIO - app.js
// - Cria o namespace global PRONTIO
// - Registro de inicializadores de páginas
// - Função utilitária para inicializar a página atual
// =====================================

(function (global) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});

  // Objeto onde registramos os inicializadores de cada página
  // Exemplo: PRONTIO.pages["pacientes"] = function initPagePacientes() { ... }
  PRONTIO.pages = PRONTIO.pages || {};

  /**
   * Registra a função que inicializa uma página.
   * @param {string} pageName - nome lógico da página (ex: "pacientes", "agenda")
   * @param {Function} initFn - função sem argumentos que inicializa a página
   */
  function registerPageInitializer(pageName, initFn) {
    if (!pageName || typeof pageName !== "string") {
      console.warn("[PRONTIO] registerPageInitializer: pageName inválido:", pageName);
      return;
    }
    if (typeof initFn !== "function") {
      console.warn(
        "[PRONTIO] registerPageInitializer: initFn deve ser função. pageName=",
        pageName
      );
      return;
    }

    PRONTIO.pages[pageName] = initFn;
  }

  /**
   * Inicializa a página com base em seu nome lógico.
   * @param {string} pageName - deve existir em PRONTIO.pages
   */
  function initPage(pageName) {
    const initFn = PRONTIO.pages && PRONTIO.pages[pageName];

    if (typeof initFn === "function") {
      try {
        initFn();
      } catch (err) {
        console.error("[PRONTIO] Erro ao inicializar página:", pageName, err);
      }
    } else {
      console.warn("[PRONTIO] Nenhum inicializador registrado para a página:", pageName);
    }
  }

  // Expõe no namespace
  PRONTIO.registerPageInitializer = registerPageInitializer;
  PRONTIO.initPage = initPage;
})(window);
