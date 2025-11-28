// assets/js/api.js
// Módulo central de chamadas à API do PRONTIO (Google Apps Script)
// Padrão de chamada:
//   callApi({ action: "Modulo.Funcao", payload: { ... } })
//
// Backend (Apps Script) deve receber JSON (como texto):
//   { "action": "Agenda.Criar", "payload": { ... } }
//
// E sempre responder com JSON no formato:
//   { "success": true/false, "data": { ... }, "errors": [] }

// ===============================
// URL OFICIAL DO WEB APP (Apps Script)
// ===============================
// Caso gere uma nova versão publicada do Web App, substitua aqui.
const PRONTIO_API_URL =
  "https://script.google.com/macros/s/AKfycbxKgOmkVgVRKjmZO7JPGOGEVhDuyLf3_SZ3klBdVJnRb4qEhPFrJJmkK_eaSn_DsmSVTQ/exec";

/**
 * Chama a API do PRONTIO (Google Apps Script)
 * @param {{ action: string, payload: any }} params
 * @returns {Promise<{ success: boolean, data?: any, errors?: string[] }>}
 */
async function callApi(params) {
  const { action, payload } = params || {};

  if (!action) {
    console.error("callApi: parâmetro 'action' é obrigatório.");
    return {
      success: false,
      data: null,
      errors: ["Ação da API não informada."],
    };
  }

  try {
    // IMPORTANTE:
    // - Usamos Content-Type: text/plain para evitar preflight CORS (OPTIONS)
    //   no Apps Script. O doPost lê e.postData.contents como texto JSON.
    const response = await fetch(PRONTIO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action,
        payload: payload || {},
      }),
    });

    if (!response.ok) {
      console.error("callApi: resposta HTTP não OK", response.status);
      return {
        success: false,
        data: null,
        errors: [
          `Erro de comunicação com servidor (HTTP ${response.status}).`,
        ],
      };
    }

    let json;
    try {
      json = await response.json();
    } catch (parseError) {
      console.error("callApi: erro ao fazer parse do JSON de resposta", parseError);
      return {
        success: false,
        data: null,
        errors: ["Resposta da API não é um JSON válido."],
      };
    }

    // Garante estrutura mínima
    if (typeof json.success === "undefined") {
      return {
        success: false,
        data: null,
        errors: ["Resposta da API em formato inesperado."],
      };
    }

    if (!json.errors) {
      json.errors = [];
    }

    return json;
  } catch (erro) {
    console.error("callApi: exceção na chamada", erro);
    return {
      success: false,
      data: null,
      errors: ["Falha ao conectar à API. Verifique sua conexão ou o Apps Script."],
    };
  }
}

// (Opcional) Função de teste rápido no console do navegador:
//   debugPingApi();
async function debugPingApi() {
  console.log("Testando ping na API PRONTIO...");
  const resp = await callApi({ action: "ping", payload: {} });
  console.log("Resposta ping:", resp);
  alert("Veja o console do navegador (F12) para a resposta do ping.");
}
