/**
 * Agenda.gs
 *
 * Estrutura fixa das planilhas:
 *
 * ABA "Agenda"
 *  Col A: ID_Agenda
 *  Col B: ID_Paciente
 *  Col C: DataConsulta  (YYYY-MM-DD, DD/MM/YYYY ou Date)
 *  Col D: HoraConsulta  (HH:MM ou H:MM)
 *  Col E: Tipo
 *  Col F: Observacoes
 *  Col G: Status        (AGENDADO, CONFIRMADO, CANCELADO, BLOQUEADO, etc.)
 *  Col H: DataCriacao   (Date)
 *
 * ABA "Pacientes"
 *  Col A: ID_Paciente
 *  Col B: NomeCompleto
 */

var AGENDA_SHEET_NAME    = "Agenda";
var PACIENTES_SHEET_NAME = "Pacientes";
var CONFIG_AGENDA_SHEET_NAME = "ConfigAgenda";

// Índices 0-based das colunas na aba AGENDA (linhas de dados, NÃO cabeçalho)
var AGENDA_COL = {
  ID_AGENDA:   0, // A
  ID_PACIENTE: 1, // B
  DATA:        2, // C - DataConsulta
  HORA:        3, // D - HoraConsulta
  TIPO:        4, // E
  OBS:         5, // F - Observacoes
  STATUS:      6, // G
  DATACRIACAO: 7  // H
};

// Índices 0-based das colunas na aba PACIENTES (linhas de dados, NÃO cabeçalho)
var PAC_COL = {
  ID_PACIENTE: 0, // A
  NOME:        1  // B - NomeCompleto
};

/* ============================================================================
 * ACTION: Agenda.ListSlotsOfDay
 * ============================================================================
 */

/**
 * action: "Agenda.ListSlotsOfDay"
 * payload: { data: "YYYY-MM-DD" }
 */
function Agenda_ListSlotsOfDay(payload) {
  var dataISO = payload && payload.data ? String(payload.data) : null;
  if (!dataISO) {
    throw new Error("Agenda.ListSlotsOfDay: payload.data (YYYY-MM-DD) obrigatório.");
  }

  var cfg = getConfigAgenda_();
  var agendamentos = listarAgendamentosDoDia_(dataISO);
  var resultado = montarSlotsDoDia_(dataISO, agendamentos, cfg);

  return resultado;
}

/* ============================================================================
 * ACTION: Agenda.Criar
 * ============================================================================
 */

/**
 * action: "Agenda.Criar"
 * payload:
 * {
 *   idPaciente: "P-0001",
 *   data: "YYYY-MM-DD",
 *   hora: "HH:MM",
 *   tipo: "Retorno",
 *   obs: "observações",
 *   status: "AGENDADO" (opcional)
 * }
 */
function Agenda_Criar(payload) {
  if (!payload) {
    throw new Error("Agenda.Criar: payload vazio.");
  }

  var idPaciente = payload.idPaciente;
  var dataISO    = payload.data;
  var hora       = payload.hora;

  if (!idPaciente || !dataISO || !hora) {
    throw new Error("Agenda.Criar: idPaciente, data e hora são obrigatórios.");
  }

  var tipo   = payload.tipo   || "";
  var obs    = payload.obs    || "";
  var status = payload.status || "AGENDADO";

  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(AGENDA_SHEET_NAME);
  if (!sheet) {
    throw new Error('Planilha "Agenda" não encontrada.');
  }

  var lastRow = sheet.getLastRow();
  var now     = new Date();

  var idAgenda = gerarIdAgenda_(sheet, lastRow);

  // linha de dados (após cabeçalho)
  var linha = lastRow + 1;
  var valores = [];
  valores[AGENDA_COL.ID_AGENDA]   = idAgenda;
  valores[AGENDA_COL.ID_PACIENTE] = idPaciente;
  valores[AGENDA_COL.DATA]        = dataISO;                     // já vem ISO
  valores[AGENDA_COL.HORA]        = normalizarHoraHHMM_(hora);   // garante HH:MM
  valores[AGENDA_COL.TIPO]        = tipo;
  valores[AGENDA_COL.OBS]         = obs;
  valores[AGENDA_COL.STATUS]      = status;
  valores[AGENDA_COL.DATACRIACAO] = now;

  // garante 8 colunas
  for (var i = 0; i < 8; i++) {
    if (valores[i] === undefined) valores[i] = "";
  }

  sheet.getRange(linha, 1, 1, 8).setValues([valores]);

  return {
    idAgenda: idAgenda,
    data: dataISO,
    hora: normalizarHoraHHMM_(hora)
  };
}

/* ============================================================================
 * ACTION: Agenda.Atualizar
 * ============================================================================
 */

/**
 * action: "Agenda.Atualizar"
 * payload:
 * {
 *   idAgenda: "AG-000123",
 *   idPaciente: "P-0001" (opcional),
 *   data: "YYYY-MM-DD" (opcional),
 *   hora: "HH:MM" (opcional),
 *   tipo: "Retorno" (opcional),
 *   obs: "..." (opcional),
 *   status: "CONFIRMADO" / "CANCELADO" / ... (opcional)
 * }
 */
function Agenda_Atualizar(payload) {
  if (!payload || !payload.idAgenda) {
    throw new Error("Agenda.Atualizar: idAgenda é obrigatório.");
  }

  var idAgenda = String(payload.idAgenda);

  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(AGENDA_SHEET_NAME);
  if (!sheet) {
    throw new Error('Planilha "Agenda" não encontrada.');
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("Agenda.Atualizar: não há registros na agenda.");
  }

  var range = sheet.getRange(2, 1, lastRow - 1, 8); // dados sem cabeçalho
  var data  = range.getValues();

  var rowIndex = -1; // índice dentro de "data" (0 = linha 2 do sheet)
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][AGENDA_COL.ID_AGENDA] || "") === idAgenda) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error("Agenda.Atualizar: ID_Agenda não encontrado: " + idAgenda);
  }

  var row = data[rowIndex];

  if (payload.idPaciente != null) {
    row[AGENDA_COL.ID_PACIENTE] = payload.idPaciente;
  }
  if (payload.data != null) {
    row[AGENDA_COL.DATA] = payload.data;
  }
  if (payload.hora != null) {
    row[AGENDA_COL.HORA] = normalizarHoraHHMM_(payload.hora);
  }
  if (payload.tipo != null) {
    row[AGENDA_COL.TIPO] = payload.tipo;
  }
  if (payload.obs != null) {
    row[AGENDA_COL.OBS] = payload.obs;
  }
  if (payload.status != null) {
    row[AGENDA_COL.STATUS] = payload.status;
  }

  // grava de volta apenas a linha alterada
  sheet.getRange(2 + rowIndex, 1, 1, 8).setValues([row]);

  return { idAgenda: idAgenda };
}

/* ============================================================================
 * CONFIGURAÇÃO DE AGENDA (horário de trabalho)
 * ============================================================================
 */

function getConfigAgenda_() {
  var cfg = {
    inicio: "08:00",
    fim: "18:00",
    intervaloMin: 30
  };

  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(CONFIG_AGENDA_SHEET_NAME);
  if (!sheet) {
    return cfg;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return cfg;
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  values.forEach(function (row) {
    var chave = String(row[0] || "").toLowerCase().trim();
    var valor = row[1];

    if (!chave) return;

    switch (chave) {
      case "inicio_jornada":
        if (valor) cfg.inicio = String(valor);
        break;
      case "fim_jornada":
        if (valor) cfg.fim = String(valor);
        break;
      case "intervalo_minutos":
        var n = parseInt(valor, 10);
        if (!isNaN(n) && n > 0) {
          cfg.intervaloMin = n;
        }
        break;
    }
  });

  return cfg;
}

/* ============================================================================
 * PACIENTES: buscar nome pelo ID (usando estrutura fixa)
 * ============================================================================
 */

function buscarNomePacientePorId_(idPaciente) {
  if (!idPaciente) return "";

  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(PACIENTES_SHEET_NAME);
  if (!sheet) {
    return "";
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return "";
  }

  var range = sheet.getRange(2, 1, lastRow - 1, 2); // A:B
  var data  = range.getValues();

  for (var i = 0; i < data.length; i++) {
    var rowId = String(data[i][PAC_COL.ID_PACIENTE] || "");
    if (rowId === String(idPaciente)) {
      var nome = String(data[i][PAC_COL.NOME] || "");
      return nome;
    }
  }

  return "";
}

/* ============================================================================
 * LEITURA DE AGENDAMENTOS DO DIA (usando colunas fixas)
 * ============================================================================
 */

function listarAgendamentosDoDia_(dataISO) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(AGENDA_SHEET_NAME);
  if (!sheet) {
    return [];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  var range = sheet.getRange(2, 1, lastRow - 1, 8); // A:H sem cabeçalho
  var data  = range.getValues();

  var resultado = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var rawData = row[AGENDA_COL.DATA];
    if (!rawData) continue;

    var rowDataISO = normalizarDataISO_(rawData);
    if (rowDataISO !== dataISO) continue;

    var rawHora    = row[AGENDA_COL.HORA];
    var horaNorm   = normalizarHoraHHMM_(rawHora);

    var idPaciente = String(row[AGENDA_COL.ID_PACIENTE] || "");
    var nomePaciente = idPaciente ? (buscarNomePacientePorId_(idPaciente) || "") : "";

    var ag = {
      idAgenda:      String(row[AGENDA_COL.ID_AGENDA] || ""),
      dataISO:       rowDataISO,
      hora:          horaNorm,
      idPaciente:    idPaciente,
      paciente_nome: nomePaciente,
      tipo:          String(row[AGENDA_COL.TIPO] || ""),
      status:        String(row[AGENDA_COL.STATUS] || "AGENDADO"),
      observacoes:   String(row[AGENDA_COL.OBS] || "")
    };

    resultado.push(ag);
  }

  return resultado;
}

/* ============================================================================
 * MONTAR GRADE DE SLOTS
 *  - CANCELADO: libera o horário (entra como LIVRE)
 * ============================================================================
 */

function montarSlotsDoDia_(dataISO, agendamentos, cfg) {
  cfg = cfg || getConfigAgenda_();

  var inicioMin  = horaParaMinutos_(cfg.inicio || "08:00");
  var fimMin     = horaParaMinutos_(cfg.fim    || "18:00");
  var intervalo  = cfg.intervaloMin || 30;

  // mapa: "HH:MM" -> agendamento (apenas NÃO cancelados)
  var mapaPorHora = {};
  var cancelados  = 0;

  agendamentos.forEach(function (ag) {
    var h = ag.hora || "";
    if (!h) return;

    var statusUpper = (ag.status || "AGENDADO").toUpperCase();

    if (statusUpper === "CANCELADO") {
      // conta cancelados, mas NÃO ocupa o horário → ele ficará LIVRE
      cancelados++;
      return;
    }

    // outros status (AGENDADO, CONFIRMADO, BLOQUEADO etc.) ocupam o horário
    mapaPorHora[h] = ag;
  });

  var slots         = [];
  var total         = 0;
  var ocupados      = 0;
  var livres        = 0;
  var bloqueados    = 0;
  var primeiroLivre = null;

  for (var t = inicioMin; t < fimMin; t += intervalo) {
    var horaStr = minutosParaHora_(t);

    var slot = {
      hora:          horaStr,
      status:        "LIVRE",
      status_humano: "Livre",
      id_agenda:     "",
      id_paciente:   "",
      paciente_nome: "",
      tipo:          "",
      observacoes:   ""
    };

    var agendamento = mapaPorHora[horaStr];

    if (agendamento) {
      var statusUpper = (agendamento.status || "AGENDADO").toUpperCase();

      slot.id_agenda     = agendamento.idAgenda   || "";
      slot.id_paciente   = agendamento.idPaciente || "";
      slot.paciente_nome = agendamento.paciente_nome || "";
      slot.tipo          = agendamento.tipo || "";
      slot.observacoes   = agendamento.observacoes || "";

      if (statusUpper === "BLOQUEADO") {
        slot.status        = "BLOQUEADO";
        slot.status_humano = "Bloqueado";
        bloqueados++;
      } else {
        // AGENDADO, CONFIRMADO, etc. (CANCELADO já foi filtrado antes)
        slot.status        = "OCUPADO";
        slot.status_humano = agendamento.status || "Agendado";
        ocupados++;
      }
    } else {
      // LIVRE
      livres++;
      if (!primeiroLivre) {
        primeiroLivre = horaStr;
      }
    }

    total++;
    slots.push(slot);
  }

  var resumo = {
    data:           dataISO,
    total_slots:    total,
    ocupados:       ocupados,
    livres:         livres,
    bloqueados:     bloqueados,
    cancelados:     cancelados,   // quantidade de cancelamentos no dia
    primeiro_livre: primeiroLivre
  };

  return {
    data:  dataISO,
    slots: slots,
    resumo: resumo
  };
}

/* ============================================================================
 * HORA / MINUTOS + NORMALIZAÇÕES
 * ============================================================================
 */

function horaParaMinutos_(hhmm) {
  if (!hhmm) return 0;
  var partes = String(hhmm).split(":");
  var h = parseInt(partes[0], 10) || 0;
  var m = parseInt(partes[1], 10) || 0;
  return h * 60 + m;
}

function minutosParaHora_(min) {
  var h = Math.floor(min / 60);
  var m = min % 60;
  var hh = h < 10 ? "0" + h : String(h);
  var mm = m < 10 ? "0" + m : String(m);
  return hh + ":" + mm;
}

/**
 * Normaliza qualquer representação de hora para "HH:MM"
 */
function normalizarHoraHHMM_(valor) {
  if (!valor && valor !== 0) return "";

  // Se for Date
  if (Object.prototype.toString.call(valor) === "[object Date]") {
    var h = valor.getHours();
    var m = valor.getMinutes();
    return minutosParaHora_(h * 60 + m);
  }

  var str = String(valor).trim();
  if (!str) return "";

  var partes = str.split(":");
  var h = parseInt(partes[0], 10) || 0;
  var m = partes.length > 1 ? (parseInt(partes[1], 10) || 0) : 0;

  return minutosParaHora_(h * 60 + m);
}

/**
 * Normaliza data para ISO "YYYY-MM-DD"
 */
function normalizarDataISO_(valor) {
  if (!valor) return "";

  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  var str = String(valor).trim();
  if (!str) return "";

  // Já está em ISO
  var isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(str)) {
    return str;
  }

  // Formato BR dd/mm/yyyy
  var brRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  var m = str.match(brRegex);
  if (m) {
    var dia = m[1];
    var mes = m[2];
    var ano = m[3];
    return ano + "-" + mes + "-" + dia;
  }

  return str;
}

/* ============================================================================
 * GERAR ID DE AGENDA
 * ============================================================================
 */

function gerarIdAgenda_(sheet, lastRow) {
  var prefixo = "AG-";
  var proximoNumero = 1;

  if (lastRow >= 2) {
    var rangeIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < rangeIds.length; i++) {
      var id = String(rangeIds[i][0] || "");
      if (!id || id.indexOf(prefixo) !== 0) continue;
      var numStr = id.substring(prefixo.length);
      var num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= proximoNumero) {
        proximoNumero = num + 1;
      }
    }
  }

  var numStrFinal = ("000000" + proximoNumero).slice(-6);
  return prefixo + numStrFinal;
}
