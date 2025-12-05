/**
 * PRONTIO - API Principal
 *
 * Roteador geral da API.
 * Recebe POST com JSON (texto) no corpo:
 *   { action: "NomeDaAcao", payload: { ... } }
 *
 * Retorna SEMPRE JSON no formato:
 * {
 *   success: true/false,
 *   data: {...} ou null,
 *   errors: [ { code, message, details } ]
 * }
 */

/**
 * Ponto de entrada HTTP (POST)
 * Configure como Web App no Apps Script.
 */
function doPost(e) {
  try {
    var body = parseRequestBody_(e); // { action, payload }

    var action = body.action || null;
    var payload = body.payload || {};

    if (!action) {
      return buildErrorResponse('NO_ACTION', 'Nenhuma ação informada.');
    }

    var result;

    // --- ROTEAMENTO POR PREFIXO DE AÇÃO ---

    if (action.indexOf('Agenda_') === 0) {
      // Módulo Agenda.gs (consultas, bloqueios, etc.)
      result = handleAgendaAction(action, payload);

    } else if (action.indexOf('AgendaConfig_') === 0) {
      // Módulo AgendaConfig.gs (configuração)
      result = handleAgendaConfigAction(action, payload);

    } else if (
      action.indexOf('Pacientes_') === 0 ||
      action.indexOf('Pacientes.') === 0
    ) {
      // Módulo Pacientes.gs
      result = handlePacientesAction(action, payload);

    } else {
      return buildErrorResponse('UNKNOWN_ACTION', 'Ação desconhecida: ' + action);
    }

    if (typeof result === 'undefined') {
      return buildErrorResponse('EMPTY_RESULT', 'Ação não retornou dados.');
    }

    // Aqui result é APENAS o "data" (objeto / array) retornado pelo módulo.
    return buildSuccessResponse(result);

  } catch (err) {
    // Se o módulo lançou um erro com code/message próprios
    if (err && err.code) {
      return buildErrorResponse(
        err.code,
        err.message || 'Erro na operação.',
        err.details || null
      );
    }

    // Erros genéricos/inesperados
    Logger.log('Erro inesperado em doPost: ' + err + '\n' + (err.stack || ''));
    return buildErrorResponse('SERVER_ERROR', 'Erro interno na API.', String(err));
  }
}

/**
 * Opcional: GET para teste rápido no navegador.
 */
function doGet(e) {
  var msg =
    'PRONTIO API ativa.\n' +
    'Use requisições POST com JSON no corpo no formato:\n\n' +
    '{ "action": "Agenda_ListarDia", "payload": { "data": "2025-01-01" } }';

  return ContentService
    .createTextOutput(msg)
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Faz o parse do corpo da requisição.
 * Compatível com:
 *  - Content-Type: application/json
 *  - Content-Type: text/plain;charset=utf-8 (usado no front)
 */
function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return { action: null, payload: {} };
  }

  var raw = e.postData.contents;
  if (!raw) {
    return { action: null, payload: {} };
  }

  try {
    var obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('JSON não é um objeto.');
    }
    return {
      action: obj.action || null,
      payload: obj.payload || {}
    };
  } catch (err) {
    Logger.log('Erro ao fazer parse do JSON de entrada: ' + err + '\nRaw: ' + raw);
    throw {
      code: 'INVALID_JSON',
      message: 'JSON de requisição inválido.',
      details: String(err)
    };
  }
}

/**
 * Monta uma resposta de sucesso padronizada.
 */
function buildSuccessResponse(data) {
  var response = {
    success: true,
    data: data || null,
    errors: []
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Monta uma resposta de erro padronizada.
 */
function buildErrorResponse(code, message, details) {
  var response = {
    success: false,
    data: null,
    errors: [
      {
        code: code || 'ERROR',
        message: message || 'Erro não especificado.',
        details: details || null
      }
    ]
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
