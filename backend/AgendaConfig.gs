/**
 * PRONTIO - Módulo de Configuração da Agenda / Sistema
 *
 * Aba esperada: "AgendaConfig"
 *
 * Colunas (linha 1):
 *  Chave | Valor
 *
 * Chaves utilizadas:
 *  - MEDICO_NOME_COMPLETO
 *  - MEDICO_CRM
 *  - MEDICO_ESPECIALIDADE
 *
 *  - CLINICA_NOME
 *  - CLINICA_ENDERECO
 *  - CLINICA_TELEFONE
 *  - CLINICA_EMAIL
 *
 *  - LOGO_URL
 *
 *  - HORA_INICIO_PADRAO       (ex.: "08:00")
 *  - HORA_FIM_PADRAO          (ex.: "18:00")
 *  - DURACAO_GRADE_MINUTOS    (ex.: "30")
 *  - DIAS_ATIVOS              (ex.: "SEG,TER,QUA,QUI,SEX")
 *
 * O front NUNCA acessa a planilha direto. Usa:
 *  - AgendaConfig_Obter
 *  - AgendaConfig_Salvar
 */

var AGENDA_CONFIG_SHEET_NAME = 'AgendaConfig';

/**
 * Roteador interno da AgendaConfig.
 * Chamado a partir de Api.gs → handleAgendaConfigAction(action, payload)
 */
function handleAgendaConfigAction(action, payload) {
  switch (action) {
    case 'AgendaConfig_Obter':
      return agendaConfigObter_();

    case 'AgendaConfig_Salvar':
      return agendaConfigSalvar_(payload);

    default:
      throw {
        code: 'AGENDACONFIG_UNKNOWN_ACTION',
        message: 'Ação de configuração de agenda desconhecida: ' + action
      };
  }
}

/**
 * Obtém (ou cria) a aba de AgendaConfig.
 */
function getAgendaConfigSheet_(createIfMissing) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AGENDA_CONFIG_SHEET_NAME);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(AGENDA_CONFIG_SHEET_NAME);
    // Cabeçalho padrão
    sheet.getRange(1, 1).setValue('Chave');
    sheet.getRange(1, 2).setValue('Valor');
  }
  return sheet;
}

/**
 * Lê a tabela chave/valor da aba AgendaConfig para um map JS.
 *
 * Retorna: { CHAVE: valor, ... }
 */
function readAgendaConfigMap_() {
  var sheet = getAgendaConfigSheet_(false);
  var map = {};

  if (!sheet) {
    return map;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return map;
  }

  var range = sheet.getRange(2, 1, lastRow - 1, 2);
  var values = range.getValues();

  for (var i = 0; i < values.length; i++) {
    var chave = String(values[i][0] || '').trim();
    var valor = String(values[i][1] || '').trim();
    if (!chave) continue;
    map[chave] = valor;
  }

  return map;
}

/**
 * Grava um map chave/valor na aba AgendaConfig.
 *  - Cria a aba se não existir.
 *  - Atualiza as chaves existentes e insere as novas.
 */
function writeAgendaConfigMap_(kvMap) {
  var sheet = getAgendaConfigSheet_(true);
  var lastRow = sheet.getLastRow();

  if (lastRow < 1) {
    sheet.getRange(1, 1).setValue('Chave');
    sheet.getRange(1, 2).setValue('Valor');
    lastRow = 1;
  }

  // Lê todas as chaves existentes para mapear linha
  var existing = {};
  if (lastRow > 1) {
    var range = sheet.getRange(2, 1, lastRow - 1, 2);
    var values = range.getValues();
    for (var i = 0; i < values.length; i++) {
      var chave = String(values[i][0] || '').trim();
      if (chave) {
        existing[chave] = {
          row: i + 2,
          value: values[i][1]
        };
      }
    }
  }

  // Atualiza / insere chaves desejadas
  var keys = Object.keys(kvMap);
  var rowToWrite = lastRow + 1;

  keys.forEach(function (chave) {
    var valor = kvMap[chave];

    if (existing[chave]) {
      // atualiza linha existente
      sheet.getRange(existing[chave].row, 1).setValue(chave);
      sheet.getRange(existing[chave].row, 2).setValue(valor);
    } else {
      // insere nova linha
      sheet.getRange(rowToWrite, 1).setValue(chave);
      sheet.getRange(rowToWrite, 2).setValue(valor);
      rowToWrite++;
    }
  });
}

/**
 * Lê configuração da aba AgendaConfig, aplicando defaults.
 *
 * Retorno:
 * {
 *   medicoNomeCompleto,
 *   medicoCRM,
 *   medicoEspecialidade,
 *
 *   clinicaNome,
 *   clinicaEndereco,
 *   clinicaTelefone,
 *   clinicaEmail,
 *
 *   logoUrl,
 *
 *   hora_inicio_padrao,       // "08:00"
 *   hora_fim_padrao,          // "18:00"
 *   duracao_grade_minutos,    // 30
 *   dias_ativos               // ["SEG","TER","QUA","QUI","SEX"]
 * }
 */
function agendaConfigObter_() {
  var map = readAgendaConfigMap_();

  var defaults = {
    hora_inicio_padrao: '08:00',
    hora_fim_padrao: '18:00',
    duracao_grade_minutos: 30,
    dias_ativos: ['SEG', 'TER', 'QUA', 'QUI', 'SEX']
  };

  var diasStr = map.DIAS_ATIVOS || '';
  var diasAtivos = diasStr
    ? diasStr
        .split(',')
        .map(function (s) {
          return String(s || '').trim();
        })
        .filter(function (s) {
          return !!s;
        })
    : defaults.dias_ativos;

  var duracao = Number(map.DURACAO_GRADE_MINUTOS || defaults.duracao_grade_minutos);
  if (!duracao || duracao <= 0) {
    duracao = defaults.duracao_grade_minutos;
  }

  var cfg = {
    // Médico
    medicoNomeCompleto: map.MEDICO_NOME_COMPLETO || '',
    medicoCRM: map.MEDICO_CRM || '',
    medicoEspecialidade: map.MEDICO_ESPECIALIDADE || '',

    // Clínica
    clinicaNome: map.CLINICA_NOME || '',
    clinicaEndereco: map.CLINICA_ENDERECO || '',
    clinicaTelefone: map.CLINICA_TELEFONE || '',
    clinicaEmail: map.CLINICA_EMAIL || '',

    // Logo
    logoUrl: map.LOGO_URL || '',

    // Agenda
    hora_inicio_padrao: map.HORA_INICIO_PADRAO || defaults.hora_inicio_padrao,
    hora_fim_padrao: map.HORA_FIM_PADRAO || defaults.hora_fim_padrao,
    duracao_grade_minutos: duracao,
    dias_ativos: diasAtivos
  };

  return cfg;
}

/**
 * Salva as configurações enviadas pelo front.
 *
 * payload (exemplo):
 * {
 *   medicoNomeCompleto,
 *   medicoCRM,
 *   medicoEspecialidade,
 *   clinicaNome,
 *   clinicaEndereco,
 *   clinicaTelefone,
 *   clinicaEmail,
 *   logoUrl,
 *   hora_inicio_padrao,
 *   hora_fim_padrao,
 *   duracao_grade_minutos,
 *   dias_ativos: ["SEG","TER","QUA","QUI","SEX"]
 * }
 */
function agendaConfigSalvar_(payload) {
  if (!payload) {
    throw {
      code: 'AGENDACONFIG_MISSING_PAYLOAD',
      message: 'Nenhum dado de configuração recebido.'
    };
  }

  // Validações mínimas – regras completas podem ser expandidas depois
  if (!payload.medicoNomeCompleto) {
    throw {
      code: 'AGENDACONFIG_MISSING_MEDICO_NOME',
      message: 'Nome completo do médico é obrigatório.'
    };
  }
  if (!payload.medicoCRM) {
    throw {
      code: 'AGENDACONFIG_MISSING_MEDICO_CRM',
      message: 'CRM do médico é obrigatório.'
    };
  }

  var kv = {};

  // Médico
  kv.MEDICO_NOME_COMPLETO = String(payload.medicoNomeCompleto || '').trim();
  kv.MEDICO_CRM = String(payload.medicoCRM || '').trim();
  kv.MEDICO_ESPECIALIDADE = String(payload.medicoEspecialidade || '').trim();

  // Clínica
  kv.CLINICA_NOME = String(payload.clinicaNome || '').trim();
  kv.CLINICA_ENDERECO = String(payload.clinicaEndereco || '').trim();
  kv.CLINICA_TELEFONE = String(payload.clinicaTelefone || '').trim();
  kv.CLINICA_EMAIL = String(payload.clinicaEmail || '').trim();

  // Logo
  kv.LOGO_URL = String(payload.logoUrl || '').trim();

  // Agenda / horários
  kv.HORA_INICIO_PADRAO = String(payload.hora_inicio_padrao || '08:00').trim();
  kv.HORA_FIM_PADRAO = String(payload.hora_fim_padrao || '18:00').trim();

  var dur = Number(payload.duracao_grade_minutos || 30);
  if (!dur || dur <= 0) dur = 30;
  kv.DURACAO_GRADE_MINUTOS = String(dur);

  var dias = payload.dias_ativos || [];
  if (!Array.isArray(dias)) dias = [];
  dias = dias
    .map(function (s) {
      return String(s || '').trim();
    })
    .filter(function (s) {
      return !!s;
    });
  kv.DIAS_ATIVOS = dias.join(',');

  // Escreve na planilha
  writeAgendaConfigMap_(kv);

  // Retorna config atualizada
  var cfg = agendaConfigObter_();

  return {
    saved: true,
    config: cfg
  };
}
