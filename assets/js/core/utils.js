// assets/js/core/utils.js
// Utilidades genéricas do PRONTIO (datas, formatação, etc.)
// Uso novo (ES Module):
//   import { hojeISO, formatarDataBR } from './core/utils.js';
//
// Uso antigo (continua funcionando):
//   PRONTIO.core.utils.hojeISO();


// -----------------------------------------
// Funções internas
// -----------------------------------------

function hojeISOInternal() {
  const hoje = new Date();
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const dd = String(hoje.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatarDataBRInternal(iso) {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yyyy}`;
}

function formatarHoraInternal(hora) {
  // espera "HH:MM" ou "HH:MM:SS"
  if (!hora) return "";
  const partes = hora.split(":");
  if (partes.length < 2) return hora;
  return `${partes[0]}:${partes[1]}`;
}

// -----------------------------------------
// EXPORTS (ES MODULE)
// -----------------------------------------

export const hojeISO = hojeISOInternal;
export const formatarDataBR = formatarDataBRInternal;
export const formatarHora = formatarHoraInternal;

// -----------------------------------------
// RETROCOMPATIBILIDADE COM window.PRONTIO
// -----------------------------------------

try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.core = window.PRONTIO.core || {};

  window.PRONTIO.core.utils = {
    hojeISO: hojeISOInternal,
    formatarDataBR: formatarDataBRInternal,
    formatarHora: formatarHoraInternal
  };
} catch (e) {
  // ambiente sem window (testes etc.)
}
