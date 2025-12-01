// assets/js/core/dom.js
// Helpers genéricos de DOM para o PRONTIO
// Versão ES Module + retrocompatibilidade com window.PRONTIO.core.dom

// -----------------------------------------
// Funções internas
// -----------------------------------------

function qsInternal(selector, scope) {
  return (scope || document).querySelector(selector);
}

function qsaInternal(selector, scope) {
  return Array.from((scope || document).querySelectorAll(selector));
}

function onInternal(elOrSelector, event, handler) {
  const el =
    typeof elOrSelector === "string"
      ? document.querySelector(elOrSelector)
      : elOrSelector;
  if (el) el.addEventListener(event, handler);
}

function createElInternal(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") {
      el.className = value;
    } else if (key === "dataset") {
      Object.entries(value).forEach(([k, v]) => (el.dataset[k] = v));
    } else if (key in el) {
      el[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  });

  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child == null) return;
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  });

  return el;
}

function showInternal(el) {
  if (!el) return;
  el.style.display = "";
  el.classList.remove("hidden");
}

function hideInternal(el) {
  if (!el) return;
  el.style.display = "none";
  el.classList.add("hidden");
}

function toggleInternal(el) {
  if (!el) return;
  if (el.classList.contains("hidden") || el.style.display === "none") {
    showInternal(el);
  } else {
    hideInternal(el);
  }
}

// -----------------------------------------
// EXPORTS (ES MODULE)
// -----------------------------------------

export const qs = qsInternal;
export const qsa = qsaInternal;
export const on = onInternal;
export const createEl = createElInternal;
export const show = showInternal;
export const hide = hideInternal;
export const toggle = toggleInternal;

// -----------------------------------------
// RETROCOMPATIBILIDADE COM window.PRONTIO
// -----------------------------------------

try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.core = window.PRONTIO.core || {};

  window.PRONTIO.core.dom = {
    qs: qsInternal,
    qsa: qsaInternal,
    on: onInternal,
    createEl: createElInternal,
    show: showInternal,
    hide: hideInternal,
    toggle: toggleInternal
  };
} catch (e) {
  // ambiente sem window (ex.: testes automáticos)
}
