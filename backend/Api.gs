/**
 * PRONTIO - API Principal
 *
 * Recebe POST com JSON: { action, payload }
 * Responde sempre:
 * {
 *   success: true/false,
 *   data: {...} ou null,
 *   errors: [ { code, message, details } ]
 * }
 */

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || null;
    var payload = body.payload || {};

    if (!action) {
      return buildErrorResponse('NO_ACTION', 'Nenhuma ação informada.');
    }

    var result;

    // --- ROTEAMENTO POR PREFIXO / PADRÃO DE AÇÃO ---
    if (action.indexOf('Agenda_') === 0) {
      result = handleAgendaAction(action, payload);
    } else if (action.indexOf('Pacientes_') === 0) {
      result = handlePacientesAction(action, payload);
    } else if (action.indexOf('AgendaConfig_') === 0) {
      result = handleAgendaConfigAction(action, payload);
    } else if (action.indexOf('Receita.') === 0) {
      result = handleReceitaAction(action, payload);
    } else {
      return buildErrorResponse('UNKNOWN_ACTION', 'Ação desconhecida: ' + action);
    }

    if (typeof result === 'undefined') {
      return buildErrorResponse('EMPTY_RESULT', 'Ação não retornou dados.');
    }

    // Se o módulo já devolveu { success, data, errors }, não embrulha de novo
    if (typeof result.success === 'boolean' &&
        Object.prototype.hasOwnProperty.call(result, 'data') &&
        Object.prototype.hasOwnProperty.call(result, 'errors')) {
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return buildSuccessResponse(result);

  } catch (err) {
    if (err && err.code) {
      return buildErrorResponse(err.code, err.message || 'Erro na operação.', err.details || null);
    }

    return buildErrorResponse('SERVER_ERROR', 'Erro interno na API.', err);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('PRONTIO API ativa. Use POST com JSON { action, payload }.')
    .setMimeType(ContentService.MimeType.TEXT);
}

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
