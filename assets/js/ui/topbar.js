// assets/js/ui/topbar.js
// Controle do topo (topbar) do PRONTIO
// Versão simplificada: não depende de core/dom.js, só usa document.getElementById.

function setTextById(id, value) {
  // id pode vir com ou sem "#"
  const cleanId = id.startsWith("#") ? id.slice(1) : id;
  const el = document.getElementById(cleanId);
  if (!el) return;

  if (value == null) return; // não mexe se for null/undefined
  el.textContent = value;
}

/**
 * Permite setar manualmente título, subtítulo e tag no topo.
 */
export function setTopbar(config = {}) {
  if (Object.prototype.hasOwnProperty.call(config, "title")) {
    setTextById("topbar-title-text", config.title);
  }
  if (Object.prototype.hasOwnProperty.call(config, "subtitle")) {
    setTextById("topbar-subtitle", config.subtitle);
  }
  if (Object.prototype.hasOwnProperty.call(config, "tag")) {
    setTextById("topbar-tag", config.tag);
  }
}

/**
 * Inicializa automaticamente o topo, preenchendo:
 * - título (conforme pageId)
 * - breadcrumb
 * - subtítulo (data-subtitle, se definido)
 * - tag (data-tag, se definido)
 * - meta (data do dia e contexto)
 */
export function initTopbar(opts = {}) {
  const body = document.body;
  if (!body) return;

  const pageId = opts.pageId || body.dataset.pageId || "index";

  console.log("TOPBAR init pageId =", pageId);

  // 1) TÍTULO AUTOMÁTICO
  const titleMap = {
    index: "Início",
    agenda: "Agenda",
    pacientes: "Pacientes",
    evolucao: "Evolução",
    exames: "Exames",
    laudo: "Laudo",
    prontuario: "Prontuário",
    receita: "Receita",
    configuracoes: "Configurações",
  };

  const title = titleMap[pageId] || "PRONTIO";
  setTextById("topbar-title-text", title);

  // 2) BREADCRUMB
  setTextById("topbar-breadcrumb", `Início / ${title}`);

  // 3) SUBTÍTULO (somente se data-subtitle estiver definido)
  const subtitleFromData = body.dataset.subtitle;
  if (subtitleFromData && subtitleFromData.trim() !== "") {
    setTextById("topbar-subtitle", subtitleFromData);
  }

  // 4) TAG (somente se data-tag estiver definido)
  const tagFromData = body.dataset.tag;
  if (tagFromData && tagFromData.trim() !== "") {
    setTextById("topbar-tag", tagFromData);
  }

  // 5) META: Data do dia
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  setTextById("topbar-meta-date", `Hoje: ${dataFormatada}`);

  // 6) META: Contexto (ex.: Consultório)
  const contexto = body.dataset.context || "Consultório";
  setTextById("topbar-meta-context", contexto);
}

// -----------------------------------------
// Retrocompat: window.PRONTIO.ui
// -----------------------------------------
try {
  const g = (window.PRONTIO = window.PRONTIO || {});
  g.ui = g.ui || {};
  g.ui.setTopbar = setTopbar;
  g.ui.initTopbar = initTopbar;
} catch (e) {
  // ambiente sem window → ignorar
}
