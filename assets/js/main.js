// assets/js/main.js
// Inicialização global do front-end do PRONTIO como ES Module.
// Versão segura: importa a página específica dinamicamente, para
// que um erro em outra página não derrube tudo.

// -----------------------------------------------------
// Importa módulos CORE (executam e registram em window.PRONTIO.core)
// -----------------------------------------------------
import "./core/api.js";
import "./core/state.js";
import "./core/utils.js";
import "./core/dom.js";

// -----------------------------------------------------
// Importa módulos de UI genéricos (mensagens, modais, forms)
// -----------------------------------------------------
import "./ui/messages.js";
import "./ui/modals.js";
import "./ui/forms.js"; // <<< AQUI: drawers / formulários genéricos

// -----------------------------------------------------
// Importa módulos de UI de layout (sidebar / topbar / theme)
// -----------------------------------------------------
import { initSidebar } from "./ui/sidebar.js";
import { initTopbar } from "./ui/topbar.js";
import { initTheme } from "./ui/theme.js";

// ---------------------------------------------------------------------
// Monta objeto PRONTIO no window (retrocompat / debug)
// ---------------------------------------------------------------------
const globalPRONTIO = (window.PRONTIO = window.PRONTIO || {});
globalPRONTIO.core = globalPRONTIO.core || {};
globalPRONTIO.ui = globalPRONTIO.ui || {};
globalPRONTIO.pages = globalPRONTIO.pages || {};

// ---------------------------------------------------------------------
// Inicialização (via data-page-id no <body>)
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
  const body = document.body;
  if (!body) return;

  const pageId = body.dataset.pageId || null;
  console.log("PRONTIO.main: DOMContentLoaded, pageId =", pageId);

  // Tema (claro / escuro)
  try {
    if (typeof initTheme === "function") {
      initTheme();
    }
  } catch (e) {
    console.error("PRONTIO.main: erro ao inicializar tema:", e);
  }

  // Sidebar
  try {
    if (typeof initSidebar === "function") {
      initSidebar();
    }
  } catch (e) {
    console.error("PRONTIO.main: erro ao inicializar sidebar:", e);
  }

  // Topbar
  try {
    if (typeof initTopbar === "function") {
      initTopbar({ pageId });
    }
  } catch (e) {
    console.error("PRONTIO.main: erro ao inicializar topbar:", e);
  }

  // Se não tiver pageId, nada além de tema/sidebar/topbar
  if (!pageId) {
    console.warn("PRONTIO.main: nenhum data-page-id encontrado no <body>.");
    return;
  }

  // -----------------------------------------------------
  // Import dinâmico da página específica
  // -----------------------------------------------------
  // Nomes das funções de init exportadas por cada módulo de página
  const pageInitMap = {
    index: "initIndexPage",
    agenda: "initAgendaPage",
    pacientes: "initPacientesPage",
    evolucao: "initEvolucaoPage",
    exames: "initExamesPage",
    laudo: "initLaudoPage",
    prontuario: "initProntuarioPage",
    receita: "initReceitaPage",
    configuracoes: "initConfiguracoesPage",
  };

  const initFnName = pageInitMap[pageId];

  if (!initFnName) {
    console.warn(
      `PRONTIO.main: não há função de init mapeada para pageId "${pageId}".`
    );
    return;
  }

  try {
    // Exemplo: pageId "agenda" -> importa "./pages/agenda.js"
    const pageModule = await import(`./pages/${pageId}.js`);
    const initFn = pageModule[initFnName];

    if (typeof initFn === "function") {
      console.log(
        `PRONTIO.main: chamando ${initFnName} do módulo ./pages/${pageId}.js`
      );
      initFn();

      // Retrocompat: expõe em window.PRONTIO.pages[pageId].init
      globalPRONTIO.pages[pageId] = {
        init: initFn,
      };
    } else {
      console.warn(
        `PRONTIO.main: função ${initFnName} não encontrada em ./pages/${pageId}.js`
      );
    }
  } catch (e) {
    console.error(
      `PRONTIO.main: erro ao importar módulo da página "./pages/${pageId}.js":`,
      e
    );
  }
});
