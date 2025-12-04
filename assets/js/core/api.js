// assets/js/core/api.js
// PRONTIO - Módulo de comunicação com a API (Apps Script WebApp)

/**
 * IMPORTANTE:
 * - Substitua a variável API_URL pela URL publicada do seu WebApp:
 *   Exemplo:
 *     const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
 */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzjQKff_QCjpecEzNwXLaEtgFNoUS-vXcV2j1xomA1CD88U4k9PEv3jcPPSmQBScF4BkA/exec";

/**
 * Chama a API do PRONTIO (backend Apps Script) usando o protocolo padrão:
 * { action: "Modulo.Funcao", payload: {.} }
 *
 * Backend responde:
 * {
 *   success: true/false,
 *   data: {.} ou null,
 *   errors: [ { code, message, details } ]
 * }
 *
 * Esta função:
 *  - dispara erros quando success = false
 *  - retorna json.data quando tudo dá certo
 *
 * @param {Object} params
 * @param {string} params.action
 * @param {Object} [params.payload]
 * @returns {Promise<any>} json.data
 */
export async function callApi({ action, payload = {} }) {
  if (!API_URL || API_URL === "SUA_URL_DO_WEBAPP") {
    console.warn(
      "%c[PRONTIO] API_URL não configurada em core/api.js",
      "color:#b91c1c;font-weight:bold"
    );
  }

  const body = { action, payload };

  let resposta;
  try {
    // IMPORTANTE PARA CORS:
    // - usamos Content-Type "text/plain;charset=utf-8" (tipo simples)
    // - isso evita o preflight OPTIONS na maioria dos navegadores
    //   e deixa o Apps Script tratar normalmente em e.postData.contents.
    resposta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
    });
  } catch (erro) {
    console.error("[PRONTIO] Erro de rede ao chamar a API:", erro);
    const e = new Error(
      "Não foi possível conectar ao servidor (verifique se o WebApp está publicado e se a URL está correta)."
    );
    e.code = "NETWORK_ERROR";
    throw e;
  }

  if (!resposta.ok) {
    const texto = await resposta.text();
    console.error(`[PRONTIO] Erro HTTP ${resposta.status}:`, texto);
    const e = new Error(
      `Erro na comunicação com a API (HTTP ${resposta.status}).`
    );
    e.code = "HTTP_ERROR";
    throw e;
  }

  let json;
  try {
    json = await resposta.json();
  } catch (erro) {
    console.error("[PRONTIO] Erro ao converter JSON:", erro);
    const raw = await resposta.text();
    console.error("[PRONTIO] Conteúdo recebido:", raw);
    const e = new Error("Resposta da API em formato inesperado.");
    e.code = "INVALID_JSON";
    throw e;
  }

  if (!json.success) {
    const err = (json.errors && json.errors[0]) || {};
    const e = new Error(err.message || "Erro desconhecido na API.");
    if (err.code) e.code = err.code;
    if (err.details) e.details = err.details;
    console.error("[PRONTIO] Erro retornado pela API:", err);
    throw e;
  }

  return json.data;
}

// Expor globalmente (útil para debug no console do DevTools)
if (typeof window !== "undefined") {
  window.callApi = callApi;
}
