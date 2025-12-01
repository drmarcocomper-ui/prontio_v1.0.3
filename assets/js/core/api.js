// assets/js/core/api.js
// Módulo central de chamadas à API do PRONTIO (Google Apps Script)
//
// Backend (Apps Script) deve receber JSON (como texto):
//   { "action": "Agenda.Criar", "payload": { ... } }
//
// E sempre responder com JSON no formato:
//   { "success": true/false, "data": { ... }, "errors": [] }
//
// Uso típico (via ES Module):
//
//   import { callApi, safeCall, ping } from "../core/api.js";
//
//   const resp = await callApi({
//     action: "Agenda.Criar",
//     payload: { idPaciente, data: "2025-03-05", hora: "08:00", tipo: "Consulta", obs: "" }
//   });
//
//   const slots = await safeCall("Agenda.ListSlotsOfDay", { data: "2025-03-05" });
//
// Uso antigo (ainda suportado, via window.PRONTIO.core.api):
//
//   const { callApi, safeCall, ping } = PRONTIO.core.api;
//   const resp = await callApi({ action: "Pacientes.ListarSelecao", payload: {} });

// ===============================
// URL OFICIAL DO WEB APP (Apps Script)
// ===============================
// Caso gere uma nova versão publicada do Web App, substitua aqui.
const PRONTIO_API_URL =
  "https://script.google.com/macros/s/AKfycbyzNAiu6I0AvFATtua5ypNIZT2lRaQ9rddSNXtl6cTnQRhia6bF2ZDosrXUem7vhptLuw/exec";

/**
 * Chama a API do PRONTIO (Google Apps Script)
 * @param {{ action: string, payload?: any }} params
 * @returns {Promise<{ success: boolean, data: any, errors: string[] }>}
 */
async function callApiInternal(params) {
  const { action, payload } = params || {};

  if (!action) {
    console.error("PRONTIO.core.api.callApi: parâmetro 'action' é obrigatório.");
    return {
      success: false,
      data: null,
      errors: ["Ação da API não informada."]
    };
  }

  try {
    const response = await fetch(PRONTIO_API_URL, {
      method: "POST",
      headers: {
        // text/plain para evitar preflight CORS no Apps Script
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action,
        payload: payload || {}
      })
    });

    if (!response.ok) {
      console.error(
        "PRONTIO.core.api.callApi: resposta HTTP não OK",
        response.status
      );
      return {
        success: false,
        data: null,
        errors: [
          `Erro de comunicação com servidor (HTTP ${response.status}).`
        ]
      };
    }

    let json;
    try {
      json = await response.json();
    } catch (parseError) {
      console.error(
        "PRONTIO.core.api.callApi: erro ao fazer parse do JSON de resposta",
        parseError
      );
      return {
        success: false,
        data: null,
        errors: ["Resposta da API não é um JSON válido."]
      };
    }

    if (typeof json.success === "undefined") {
      return {
        success: false,
        data: null,
        errors: ["Resposta da API em formato inesperado."]
      };
    }

    if (!Array.isArray(json.errors)) {
      json.errors = json.errors ? [String(json.errors)] : [];
    }

    return {
      success: Boolean(json.success),
      data: json.data ?? null,
      errors: json.errors
    };
  } catch (erro) {
    console.error("PRONTIO.core.api.callApi: exceção na chamada", erro);
    return {
      success: false,
      data: null,
      errors: [
        "Falha ao conectar à API. Verifique sua conexão ou o Apps Script."
      ]
    };
  }
}

/**
 * Versão "segura": lança erro se não success. Retorna só `data`.
 * @param {string} action
 * @param {any} [payload]
 * @returns {Promise<any>}
 * @throws {Error}
 */
async function safeCallInternal(action, payload) {
  const resp = await callApiInternal({ action, payload });

  if (!resp.success) {
    const msg =
      (resp.errors && resp.errors[0]) ||
      `Ação "${action}" falhou sem mensagem específica.`;
    throw new Error(msg);
  }

  return resp.data;
}

/**
 * Função de teste rápido no console:
 *   import { ping } from "../core/api.js";
 *   ping();
 */
async function pingInternal() {
  console.log("PRONTIO.core.api.ping: testando conexão com Apps Script...");
  const resp = await callApiInternal({ action: "ping", payload: {} });
  console.log("PRONTIO.core.api.ping: resposta:", resp);
  if (!resp.success) {
    alert("Ping falhou. Veja detalhes no console (F12).");
  } else {
    alert("Ping OK! Veja os detalhes no console (F12).");
  }
  return resp;
}

// ===============================
// EXPORTS (ES MODULE)
// ===============================

/**
 * Wrapper público para chamadas à API.
 * @param {{ action: string, payload?: any }} params
 */
export async function callApi(params) {
  return callApiInternal(params);
}

/**
 * Wrapper público "seguro": já lança erro se não success.
 * @param {string} action
 * @param {any} [payload]
 */
export async function safeCall(action, payload) {
  return safeCallInternal(action, payload);
}

/**
 * Teste rápido de conectividade com o Apps Script.
 */
export async function ping() {
  return pingInternal();
}

// ===============================
// RETROCOMPATIBILIDADE COM window.PRONTIO
// ===============================
try {
  window.PRONTIO = window.PRONTIO || {};
  window.PRONTIO.core = window.PRONTIO.core || {};
  window.PRONTIO.core.api = {
    callApi: callApiInternal,
    safeCall: safeCallInternal,
    ping: pingInternal
  };
} catch (e) {
  // ambiente sem window (ex: testes), ignora
}
