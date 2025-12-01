// assets/js/core/state.js
// Estado global leve do PRONTIO
// - Paciente atual (id, nome)
// - Agendamento atual (id)
// Sincroniza com localStorage para persistir entre páginas.
//
// Uso novo (ES Module):
//   import { setPacienteAtual, getPacienteAtual } from './core/state.js';
//
// Uso antigo (continua funcionando):
//   const state = PRONTIO.core.state;
//   state.setPacienteAtual(...);

const KEYS = {
  PACIENTE_ID: "prontio_pacienteAtualId",
  PACIENTE_NOME: "prontio_pacienteAtualNome",
  AGENDA_ID: "prontio_agendaAtualId"
};

let pacienteAtual = null; // { id, nome } ou null
let agendaAtualId = null;

// -----------------------------------------
// Helpers de localStorage seguros
// -----------------------------------------
function lsGet(key) {
  try {
    return window.localStorage ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function lsSet(key, value) {
  try {
    if (!window.localStorage) return;
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    // Ignora erros (modo privado, etc.)
  }
}

// -----------------------------------------
// Inicialização a partir do localStorage
// -----------------------------------------
function initFromStorage() {
  const id = lsGet(KEYS.PACIENTE_ID);
  const nome = lsGet(KEYS.PACIENTE_NOME);

  if (id) {
    pacienteAtual = { id, nome: nome || "" };
  } else {
    pacienteAtual = null;
  }

  const agId = lsGet(KEYS.AGENDA_ID);
  agendaAtualId = agId || null;
}

// Executa uma vez na carga do módulo
initFromStorage();

// -----------------------------------------
// Paciente atual
// -----------------------------------------
function setPacienteAtualInternal(paciente) {
  if (!paciente || !paciente.id) {
    pacienteAtual = null;
    lsSet(KEYS.PACIENTE_ID, null);
    lsSet(KEYS.PACIENTE_NOME, null);
    return;
  }

  pacienteAtual = {
    id: paciente.id,
    nome: paciente.nome || ""
  };

  lsSet(KEYS.PACIENTE_ID, pacienteAtual.id);
  lsSet(KEYS.PACIENTE_NOME, pacienteAtual.nome);
}

function getPacienteAtualInternal() {
  return pacienteAtual ? { ...pacienteAtual } : null;
}

function clearPacienteAtualInternal() {
  setPacienteAtualInternal(null);
}

// -----------------------------------------
// Agenda atual
// -----------------------------------------
function setAgendaAtualInternal(idAgenda) {
  if (!idAgenda) {
    agendaAtualId = null;
    lsSet(KEYS.AGENDA_ID, null);
    return;
  }

  agendaAtualId = String(idAgenda);
  lsSet(KEYS.AGENDA_ID, agendaAtualId);
}

function getAgendaAtualInternal() {
  return agendaAtualId;
}

function clearAgendaAtualInternal() {
  setAgendaAtualInternal(null);
}

// -----------------------------------------
// EXPORTS (ES MODULE)
// -----------------------------------------

export function setPacienteAtual(paciente) {
  return setPacienteAtualInternal(paciente);
}

export function getPacienteAtual() {
  return getPacienteAtualInternal();
}

export function clearPacienteAtual() {
  return clearPacienteAtualInternal();
}

export function setAgendaAtual(idAgenda) {
  return setAgendaAtualInternal(idAgenda);
}

export function getAgendaAtual() {
  return getAgendaAtualInternal();
}

export function clearAgendaAtual() {
  return clearAgendaAtualInternal();
}

// -----------------------------------------
// RETROCOMPATIBILIDADE COM window.PRONTIO
// -----------------------------------------
try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.core = window.PRONTIO.core || {};

  window.PRONTIO.core.state = {
    // paciente
    setPacienteAtual: setPacienteAtualInternal,
    getPacienteAtual: getPacienteAtualInternal,
    clearPacienteAtual: clearPacienteAtualInternal,
    // agenda
    setAgendaAtual: setAgendaAtualInternal,
    getAgendaAtual: getAgendaAtualInternal,
    clearAgendaAtual: clearAgendaAtualInternal
  };
} catch (e) {
  // ambiente sem window (ex.: testes), ignora
}
