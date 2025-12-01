// Api.gs
// Roteador principal da API PRONTIO
// ---------------------------------
//
// Espera receber no POST um JSON em texto puro:
//   { "action": "Modulo.Funcao", "payload": { ... } }
//
// Exemplos de actions:
//   "Pacientes.ListarSelecao"
//   "Pacientes.CriarBasico"
//   "Agenda.ListSlotsOfDay"
//   "Agenda.Criar"
//   "Evolucao.Salvar"
//   "Receita.Gerar"
//
// Módulos suportados (cada um em seu .gs):
//   Pacientes.*, Agenda.*, Evolucao.*, Receita.*, Configuracoes.*,
//   Medicamentos.*, Exames.*, Laudos.*
//
// Toda REGRA DE NEGÓCIO fica nos módulos específicos.

var PRONTIO_API_DEBUG = true;

/**
 * Cria o envelope padrão de resposta da API.
 */
function createApiResponse_(success, data, errors) {
  return {
    success: !!success,
    data: data !== undefined ? data : null,
    errors: errors || [],
  };
}

/**
 * Log básico da requisição (evitando logar dados sensíveis).
 */
function logApiRequest_(origin, action, payload) {
  if (!PRONTIO_API_DEBUG) return;
  try {
    var safePayload = {};
    if (payload && typeof payload === "object") {
      if (payload.idPaciente) safePayload.idPaciente = payload.idPaciente;
      if (payload.dataConsulta) safePayload.dataConsulta = payload.dataConsulta;
      if (payload.data) safePayload.data = payload.data;
      if (payload.dataISO) safePayload.dataISO = payload.dataISO;
      if (payload.termo) safePayload.termo = payload.termo;
    }
    Logger.log(
      "[PRONTIO API] " +
        origin +
        " | action=" +
        action +
        " | payload=" +
        JSON.stringify(safePayload)
    );
  } catch (e) {
    Logger.log("[PRONTIO API] Erro ao logar request: " + e);
  }
}

/**
 * Log da resposta (sucesso/erro).
 */
function logApiResponse_(action, response) {
  if (!PRONTIO_API_DEBUG) return;
  try {
    Logger.log(
      "[PRONTIO API] RESPOSTA | action=" +
        action +
        " | success=" +
        response.success +
        " | errors=" +
        JSON.stringify(response.errors || [])
    );
  } catch (e) {
    Logger.log("[PRONTIO API] Erro ao logar response: " + e);
  }
}

/**
 * Valida o campo "action" e separa módulo e método.
 * Espera formato: "Modulo.Funcao"
 */
function validateAction_(action) {
  if (!action || typeof action !== "string") {
    return {
      ok: false,
      modulo: "",
      metodo: "",
      errorMsg: 'Campo "action" é obrigatório e deve ser string.',
    };
  }

  var parts = action.split(".");
  if (parts.length < 2) {
    return {
      ok: false,
      modulo: "",
      metodo: "",
      errorMsg:
        'Formato de "action" inválido. Use "Modulo.Funcao", por exemplo: "Agenda.Criar".',
    };
  }

  return {
    ok: true,
    modulo: parts[0],
    metodo: parts[1],
    errorMsg: null,
  };
}

/**
 * Entrada principal via POST (usada pelo frontend).
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum dado encontrado em postData.");
    }

    var rawBody = e.postData.contents;
    var request = JSON.parse(rawBody);

    var action = request.action;
    var payload = request.payload || {};

    var validation = validateAction_(action);
    if (!validation.ok) {
      var respErro = createApiResponse_(false, null, [validation.errorMsg]);
      logApiResponse_(action || "<sem_action>", respErro);
      return ContentService
        .createTextOutput(JSON.stringify(respErro))
        .setMimeType(ContentService.MimeType.JSON);
    }

    logApiRequest_("POST", action, payload);
    var resposta = routeAction(action, payload);

    if (!resposta || typeof resposta.success === "undefined") {
      resposta = createApiResponse_(false, null, [
        "Resposta do módulo em formato inesperado.",
      ]);
    }

    logApiResponse_(action, resposta);

    return ContentService
      .createTextOutput(JSON.stringify(resposta))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    var erroResponse = createApiResponse_(false, null, [erro.toString()]);
    logApiResponse_("<EXCEPTION_POST>", erroResponse);

    return ContentService
      .createTextOutput(JSON.stringify(erroResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Entrada opcional via GET (debug, testes).
 * Ex.: ?q={"action":"ping","payload":{}}
 */
function doGet(e) {
  try {
    var raw = (e && e.parameter && e.parameter.q) ? e.parameter.q : "{}";
    var request = JSON.parse(raw);

    var action = request.action;
    var payload = request.payload || {};

    var validation = validateAction_(action);
    if (!validation.ok) {
      var respErro = createApiResponse_(false, null, [validation.errorMsg]);
      logApiResponse_(action || "<sem_action>", respErro);
      return ContentService
        .createTextOutput(JSON.stringify(respErro))
        .setMimeType(ContentService.MimeType.JSON);
    }

    logApiRequest_("GET", action, payload);
    var resposta = routeAction(action, payload);

    if (!resposta || typeof resposta.success === "undefined") {
      resposta = createApiResponse_(false, null, [
        "Resposta do módulo em formato inesperado.",
      ]);
    }

    logApiResponse_(action, resposta);

    return ContentService
      .createTextOutput(JSON.stringify(resposta))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    var erroResponse = createApiResponse_(false, null, [erro.toString()]);
    logApiResponse_("<EXCEPTION_GET>", erroResponse);

    return ContentService
      .createTextOutput(JSON.stringify(erroResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================
// Roteador de ações
// ==============================
function routeAction(action, payload) {
  if (PRONTIO_API_DEBUG) {
    Logger.log("[PRONTIO API] routeAction: " + action);
  }

  if (action === "ping") {
    return handleTesteAction(action, payload);
  }

  if (action.indexOf("Pacientes.") === 0) {
    return handlePacientesAction(action, payload);
  }

  if (action.indexOf("Agenda.") === 0) {
    return handleAgendaAction(action, payload);
  }

  if (action.indexOf("Evolucao.") === 0) {
    return handleEvolucaoAction(action, payload);
  }

  if (action.indexOf("Receita.") === 0) {
    return handleReceitaAction(action, payload);
  }

  if (action.indexOf("Configuracoes.") === 0) {
    return handleConfiguracoesAction(action, payload);
  }

  if (action.indexOf("Medicamentos.") === 0) {
    return handleMedicamentosAction(action, payload);
  }

  if (action.indexOf("Exames.") === 0) {
    return handleExamesAction(action, payload);
  }

  if (action.indexOf("Laudos.") === 0) {
    return handleLaudosAction(action, payload);
  }

  return createApiResponse_(false, null, [
    "Ação não reconhecida na API: " + action,
  ]);
}

// ==============================
// Módulo de teste (ping)
// ==============================
function handleTesteAction(action, payload) {
  return createApiResponse_(
    true,
    {
      message: "pong",
      timestamp: new Date().toISOString(),
    },
    []
  );
}

// ==============================
// Módulo Agenda
// ==============================
/**
 * Centraliza todas as ações "Agenda.*"
 * Usa as funções do arquivo Agenda.gs:
 *  - Agenda_ListSlotsOfDay(payload)
 *  - Agenda_Criar(payload)
 *  - Agenda_Atualizar(payload)
 */
function handleAgendaAction(action, payload) {
  try {
    if (action === "Agenda.ListSlotsOfDay") {
      var dataList = Agenda_ListSlotsOfDay(payload);
      return createApiResponse_(true, dataList, []);
    }

    if (action === "Agenda.Criar") {
      var dataCriar = Agenda_Criar(payload);
      return createApiResponse_(true, dataCriar, []);
    }

    if (action === "Agenda.Atualizar") {
      var dataAtualizar = Agenda_Atualizar(payload);
      return createApiResponse_(true, dataAtualizar, []);
    }

    return createApiResponse_(false, null, [
      "Ação de Agenda não reconhecida: " + action,
    ]);
  } catch (e) {
    return createApiResponse_(false, null, [String(e)]);
  }
}
