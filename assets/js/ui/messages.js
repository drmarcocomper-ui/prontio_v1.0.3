// assets/js/ui/messages.js
// Sistema de mensagens genéricas do PRONTIO
// - Usa o padrão de classes: .mensagem, .mensagem-info, .mensagem-sucesso, .mensagem-erro, .mensagem-aviso

import { qs, show as domShow, hide as domHide } from "../core/dom.js";

const CLASS_BASE = "mensagem";
const CLASS_TYPES = {
  info: "mensagem-info",
  sucesso: "mensagem-sucesso",
  erro: "mensagem-erro",
  aviso: "mensagem-aviso",
};

// ------------------------------------------------------------
// FUNÇÕES PRINCIPAIS
// ------------------------------------------------------------

/**
 * Exibe uma mensagem em um elemento.
 *
 * @param {Object} options
 * @param {string|HTMLElement} options.target - seletor CSS ou elemento da mensagem
 * @param {string} options.text                - texto da mensagem
 * @param {"info"|"sucesso"|"erro"|"aviso"} [options.type="info"]
 * @param {boolean} [options.autoHide=false]   - se true, esconde depois de ms
 * @param {number} [options.autoHideDelay=4000]
 */
function show(options) {
  const {
    target,
    text,
    type = "info",
    autoHide = false,
    autoHideDelay = 4000,
  } = options || {};

  if (!target) {
    console.warn("PRONTIO.ui.messages.show: 'target' é obrigatório.");
    return;
  }

  const el = target instanceof HTMLElement ? target : qs(String(target));

  if (!el) {
    console.warn("PRONTIO.ui.messages.show: elemento não encontrado:", target);
    return;
  }

  // Texto
  el.textContent = text || "";

  // Classes
  el.className = CLASS_BASE; // reset total
  const typeClass = CLASS_TYPES[type] || CLASS_TYPES.info;
  el.classList.add(typeClass);

  domShow(el);

  // Auto hide
  if (autoHide) {
    window.setTimeout(() => hide(el), autoHideDelay);
  }
}

/**
 * Esconde uma mensagem.
 * @param {string|HTMLElement} target
 */
function hide(target) {
  if (!target) return;

  const el = target instanceof HTMLElement ? target : qs(String(target));
  if (!el) return;

  domHide(el);
}

/**
 * Cria um atalho para mensagens de uma página específica:
 *    const msg = createPageMessages('#mensagemAgenda')
 *    msg.info('Carregando...')
 */
function page(targetIdOrSelector) {
  const target =
    typeof targetIdOrSelector === "string"
      ? targetIdOrSelector
      : "#mensagem";

  return {
    info(text, opts = {}) {
      show({ target, text, type: "info", ...opts });
    },
    sucesso(text, opts = {}) {
      show({ target, text, type: "sucesso", ...opts });
    },
    erro(text, opts = {}) {
      show({ target, text, type: "erro", ...opts });
    },
    aviso(text, opts = {}) {
      show({ target, text, type: "aviso", ...opts });
    },
    clear() {
      hide(target);
    },
  };
}

// ------------------------------------------------------------
// EXPORTS (ES MODULE)
// ------------------------------------------------------------
export function showMessage(options) {
  return show(options);
}

export function hideMessage(target) {
  return hide(target);
}

export function createPageMessages(targetIdOrSelector) {
  return page(targetIdOrSelector);
}

// ------------------------------------------------------------
// RETROCOMPAT — mantém PRONTIO.ui.messages funcionando
// ------------------------------------------------------------
try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.ui = window.PRONTIO.ui || {};

  window.PRONTIO.ui.messages = {
    show,
    hide,
    page,
  };
} catch (e) {
  // ambiente sem window
}
