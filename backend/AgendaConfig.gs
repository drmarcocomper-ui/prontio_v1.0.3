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
 *  - HORA_INICIO_PADRAO      (ex.: "08:00")
 *  - HORA_FIM_PADRAO         (ex.: "18:00")
 *  - DURACAO_GRADE_MINUTOS   (ex.: "15")
 *  - DIAS_ATIVOS             (ex.: "SEG,TER,QUA,QUI,SEX")
 *
 * O front NUNCA acessa a planilha direto. Usa:
 *  - AgendaConfig_Obter
 *  - AgendaConfig_Salvar
 */

var AGENDA_CONFIG_SHEET_NAME = 'AgendaConfig';

/**
 * Roteador interno da AgendaConfig.
 * Chamado a partir de Api.gs -> handleAgendaConfigAction(action, payload)
 */
function handleAgendaConfigAction(action, payload) {
  switch (action) {
    case 'AgendaConfig_Obter':
      return agendaConfigObter_();

    case 'AgendaConfig_Salvar':
      return agendaConfigSalvar_(payload);

    default:
      throw {
        code: 'AGENDA_CONFIG_UNKNOWN_ACTION',
        message: 'Ação de configuração de agenda desconhecida: ' + action
      };
  }
}

/**
 * Retorna o objeto de configuração da Agenda / Sistema.
 *
 * Retorno exemplo:
 * {
 *   medico_nome_completo: "...",
 *   medico_crm: "...",
 *   medico_especialidade: "...",
 *   clinica_nome: "...",
 *   clinica_endereco: "...",
 *   clinica_telefone: "...",
 *   clinica_email: "...",
 *   logo_url: "...",
 *   hora_inicio_padrao: "08:00",
 *   hora_fim_padrao: "18:00",
 *   duracao_grade_minutos: 15,
 *   dias_ativos: "SEG,TER,QUA,QUI,SEX"
 * }
 */
function agendaConfigObter_() {
  var defaults = {
    medico_nome_completo: '',
    medico_crm: '',
    medico_especialidade: '',
    clinica_nome: '',
    clinica_endereco: '',
    clinica_telefone: '',
    clinica_email: '',
    logo_url: '',
    hora_inicio_padrao: '08:00',
    hora_fim_padrao: '18:00',
    duracao_grade_minutos: 15,
    dias_ativos: 'SEG,TER,QUA,QUI,SEX'
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AGENDA_CONFIG_SHEET_NAME);
  if (!sheet) {
    return defaults;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return defaults;
  }

  var range = sheet.getRange(2, 1, lastRow - 1, 2); // Chave/Valor
  var values = range.getValues();

  var map = {};
  for (var i = 0; i < values.length; i++) {
    var chave = String(values[i][0] || '').trim();
    var valor = values[i][1];
    if (!chave) continue;
    map[chave] = valor;
  }

  var cfg = {
    medico_nome_completo: String(map.MEDICO_NOME_COMPLETO || defaults.medico_nome_completo),
    medico_crm: String(map.MEDICO_CRM || defaults.medico_crm),
    medico_especialidade: String(map.MEDICO_ESPECIALIDADE || defaults.medico_especialidade),

    clinica_nome: String(map.CLINICA_NOME || defaults.clinica_nome),
    clinica_endereco: String(map.CLINICA_ENDERECO || defaults.clinica_endereco),
    clinica_telefone: String(map.CLINICA_TELEFONE || defaults.clinica_telefone),
    clinica_email: String(map.CLINICA_EMAIL || defaults.clinica_email),

    logo_url: String(map.LOGO_URL || defaults.logo_url),

    hora_inicio_padrao: String(map.HORA_INICIO_PADRAO || defaults.hora_inicio_padrao),
    hora_fim_padrao: String(map.HORA_FIM_PADRAO || defaults.hora_fim_padrao),
    duracao_grade_minutos: parseInt(
      map.DURACAO_GRADE_MINUTOS || defaults.duracao_grade_minutos,
      10
    ),
    dias_ativos: String(map.DIAS_ATIVOS || defaults.dias_ativos)
  };

  if (isNaN(cfg.duracao_grade_minutos) || cfg.duracao_grade_minutos <= 0) {
    cfg.duracao_grade_minutos = defaults.duracao_grade_minutos;
  }

  return cfg;
}

/**
 * Salva configurações na aba AgendaConfig.
 *
 * payload pode conter qualquer subset das chaves de configuração.
 */
function agendaConfigSalvar_(payload) {
  payload = payload || {};

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(AGENDA_CONFIG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AGENDA_CONFIG_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Chave', 'Valor']]);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, 2).setValues([['Chave', 'Valor']]);
    lastRow = 1;
  }

  var range = sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 2);
  var values = range.getValues();

  // Mapa de chave -> linha
  var rowByKey = {};
  for (var i = 0; i < values.length; i++) {
    var chave = String(values[i][0] || '').trim();
    if (!chave) continue;
    rowByKey[chave] = i + 2; // linha real
  }

  function upsert(key, value) {
    if (typeof value === 'undefined') return;

    var rowIndex = rowByKey[key];
    if (rowIndex) {
      sheet.getRange(rowIndex, 2).setValue(value);
    } else {
      var newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 2).setValues([[key, value]]);
      rowByKey[key] = newRow;
    }
  }

  upsert('MEDICO_NOME_COMPLETO', payload.medico_nome_completo);
  upsert('MEDICO_CRM', payload.medico_crm);
  upsert('MEDICO_ESPECIALIDADE', payload.medico_especialidade);

  upsert('CLINICA_NOME', payload.clinica_nome);
  upsert('CLINICA_ENDERECO', payload.clinica_endereco);
  upsert('CLINICA_TELEFONE', payload.clinica_telefone);
  upsert('CLINICA_EMAIL', payload.clinica_email);

  upsert('LOGO_URL', payload.logo_url);

  upsert('HORA_INICIO_PADRAO', payload.hora_inicio_padrao);
  upsert('HORA_FIM_PADRAO', payload.hora_fim_padrao);
  upsert('DURACAO_GRADE_MINUTOS', payload.duracao_grade_minutos);
  upsert('DIAS_ATIVOS', payload.dias_ativos);

  var cfg = agendaConfigObter_();
  return cfg;
}
