// assets/js/ui/modals.js
// Helpers genéricos para modais no PRONTIO
//
// - Usa os helpers show/hide de core/dom.js (que lidam com a classe de ocultar, ex.: .is-hidden)
// - Não cria HTML próprio, apenas controla o DOM existente
// - Padrão: overlay com conteúdo dentro
//
// Suporte extra:
// - Bind automático de botões com data-attributes:
//    * [data-modal-open="idOuSeletor"]  → abre modal
//    * [data-modal-close="idOuSeletor"] → fecha modal
//
// OBS: toda lógica aqui é puramente de UI, sem regra de negócio.

import { qs, show, hide } from "../core/dom.js";

// -----------------------------------------
// Funções internas principais
// -----------------------------------------

/**
 * Retorna o elemento de modal a partir de id, seletor ou HTMLElement.
 * Aceita:
 *  - HTMLElement
 *  - "#id", ".classe", "seletor complexo"
 *  - "idSimples" (vira "#idSimples")
 *
 * @param {string|HTMLElement} modalIdOrEl
 * @returns {HTMLElement|null}
 */
function getModalElement(modalIdOrEl) {
  if (!modalIdOrEl) return null;

  if (modalIdOrEl instanceof HTMLElement) return modalIdOrEl;

  if (typeof modalIdOrEl === "string") {
    const selector =
      modalIdOrEl.startsWith("#") || modalIdOrEl.startsWith(".")
        ? modalIdOrEl
        : `#${modalIdOrEl}`;
    return qs(selector);
  }

  return null;
}

/**
 * Abre um modal (usa show() → remove classe de oculto, ex.: .is-hidden).
 * @param {string|HTMLElement} modalIdOrEl - id (sem #), seletor ou elemento
 */
function openInternal(modalIdOrEl) {
  const el = getModalElement(modalIdOrEl);
  if (!el) return;

  show(el);

  // Futuro: foco inicial, trap de foco, ESC etc.
}

/**
 * Fecha um modal (usa hide() → adiciona classe de oculto, ex.: .is-hidden).
 * @param {string|HTMLElement} modalIdOrEl
 */
function closeInternal(modalIdOrEl) {
  const el = getModalElement(modalIdOrEl);
  if (!el) return;

  hide(el);
}

/**
 * Ativa fechamento ao clicar no "backdrop" (overlay).
 * Exige que a marcação siga o padrão:
 *   <div id="modalExemplo" class="modal-overlay is-hidden"> ... </div>
 *
 * @param {string} modalSelector - seletor do modal overlay
 */
function bindCloseOnBackdropInternal(modalSelector) {
  const modal = qs(modalSelector);
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeInternal(modal);
    }
  });
}

/**
 * Liga um botão interno para fechar o modal.
 * @param {string} modalSelector
 * @param {string} buttonSelector
 */
function bindCloseButtonInternal(modalSelector, buttonSelector) {
  const modal = qs(modalSelector);
  const btn = qs(buttonSelector);
  if (!modal || !btn) return;

  btn.addEventListener("click", () => {
    closeInternal(modal);
  });
}

/**
 * Bind automático usando data-attributes:
 *   data-modal-open
 *   data-modal-close
 *
 * @param {Document|HTMLElement} [root=document]
 */
function bindModalTriggersInternal(root = document) {
  if (!root || !(root instanceof HTMLElement || root instanceof Document)) {
    return;
  }

  // Abrir modais
  const openButtons = root.querySelectorAll("[data-modal-open]");
  openButtons.forEach((btn) => {
    const attrValue = btn.getAttribute("data-modal-open");
    let target = attrValue && attrValue.trim();
    if (!target) {
      const href = btn.getAttribute("href");
      if (href && href.startsWith("#")) target = href;
    }
    if (!target) return;

    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openInternal(target);
    });
  });

  // Fechar modais
  const closeButtons = root.querySelectorAll("[data-modal-close]");
  closeButtons.forEach((btn) => {
    const attrValue = btn.getAttribute("data-modal-close");
    let target = attrValue && attrValue.trim();
    if (!target) {
      const href = btn.getAttribute("href");
      if (href && href.startsWith("#")) target = href;
    }
    if (!target) return;

    btn.addEventListener("click", (event) => {
      event.preventDefault();
      closeInternal(target);
    });
  });
}

// -----------------------------------------
// EXPORTS (ES MODULE)
// -----------------------------------------

export function openModal(modalIdOrEl) {
  return openInternal(modalIdOrEl);
}

export function closeModal(modalIdOrEl) {
  return closeInternal(modalIdOrEl);
}

export function bindModalCloseOnBackdrop(modalSelector) {
  return bindCloseOnBackdropInternal(modalSelector);
}

export function bindModalCloseButton(modalSelector, buttonSelector) {
  return bindCloseButtonInternal(modalSelector, buttonSelector);
}

/**
 * Bind de triggers automáticos.
 */
export function initModalTriggers(root) {
  return bindModalTriggersInternal(root);
}

// -----------------------------------------
// RETROCOMPATIBILIDADE COM window.PRONTIO
// -----------------------------------------
try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.ui = window.PRONTIO.ui || {};
  window.PRONTIO.core = window.PRONTIO.core || {};

  window.PRONTIO.ui.modals = {
    open: openInternal,
    close: closeInternal,
    bindCloseOnBackdrop: bindCloseOnBackdropInternal,
    bindCloseButton: bindCloseButtonInternal,
    bindTriggers: bindModalTriggersInternal
  };
} catch (e) {
  // ambiente sem window (teste), ignora
}
