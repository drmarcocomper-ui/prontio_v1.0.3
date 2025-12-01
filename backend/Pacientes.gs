// Pacientes.gs
// ---------------------------------------------------------------------------
// Módulo backend de Pacientes do PRONTIO
//
// ABA ESPERADA NA PLANILHA (linha 1):
//  A: ID_Paciente
//  B: NomeCompleto
//  C: CPF
//  D: Telefone
//  E: DataNascimento
//  F: E-mail
//  G: Sexo
//  H: Cidade
//  I: Bairro
//  J: Profissão
//  K: PlanoSaude
//  L: DataCadastro
//  M: Ativo  (SIM / NAO)
//
// IMPORTANTE: o FRONT NÃO SABE DOS NOMES/ORDENS DAS COLUNAS.
// Ele conversa APENAS via ações de API:
//
// - Pacientes.ListarSelecao
// - Pacientes.CriarBasico
//
// Este módulo cuida do mapeamento de colunas, geração de ID_Paciente
// e formatação da resposta.
// ---------------------------------------------------------------------------

/** Nome da aba de pacientes na planilha */
var PACIENTES_SHEET_NAME = "Pacientes";

/** Obtém (ou cria) a aba Pacientes */
function getPacientesSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PACIENTES_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(PACIENTES_SHEET_NAME);
    var header = [
      "ID_Paciente",
      "NomeCompleto",
      "CPF",
      "Telefone",
      "DataNascimento",
      "E-mail",
      "Sexo",
      "Cidade",
      "Bairro",
      "Profissão",
      "PlanoSaude",
      "DataCadastro",
      "Ativo"
    ];
    sh.getRange(1, 1, 1, header.length).setValues([header]);
  }
  return sh;
}

/**
 * Lê o cabeçalho da aba (linha 1) e monta um mapa:
 * { "ID_Paciente": 0, "NomeCompleto": 1, ... }
 */
function getPacientesHeaderMap_() {
  var sh = getPacientesSheet_();
  var lastCol = sh.getLastColumn();
  var headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];

  var map = {};
  headerRow.forEach(function (colName, index) {
    var nome = String(colName || "").trim();
    if (nome) {
      map[nome] = index; // índice baseado em 0
    }
  });

  return map;
}

/** Gera um ID_Paciente único e estável */
function gerarIdPaciente_() {
  var prefix = "PAC-";
  var now = new Date().getTime();
  return prefix + now;
}

/**
 * Roteador de ações específicas de Pacientes.
 * Chamado a partir de Api.gs com (action, payload).
 */
function handlePacientesAction(action, payload) {
  try {
    // Compatibilidade com nomes antigos com underline
    if (action === "Pacientes_ListarSelecao") {
      action = "Pacientes.ListarSelecao";
    }
    if (action === "Pacientes_CriarBasico") {
      action = "Pacientes.CriarBasico";
    }

    if (action === "Pacientes.ListarSelecao") {
      return pacientesListarSelecao_();
    }

    if (action === "Pacientes.CriarBasico") {
      return pacientesCriarBasico_(payload);
    }

    return createApiResponse_(false, null, [
      'Ação de Pacientes desconhecida: "' + action + '"'
    ]);
  } catch (err) {
    return createApiResponse_(false, null, [
      "Erro em handlePacientesAction: " + err.message
    ]);
  }
}

/**
 * Pacientes.ListarSelecao
 *
 * Retorna uma lista resumida de pacientes para preencher o <select>
 * e o resumo (CPF/telefone) na agenda.
 *
 * Formato da resposta:
 * {
 *   success: true,
 *   data: {
 *     pacientes: [
 *       {
 *         ID_Paciente: "PAC-123",
 *         nomeCompleto: "Fulano de Tal",
 *         documento: "12345678900",
 *         telefone: "(11) 99999-0000"
 *       },
 *       ...
 *     ]
 *   },
 *   errors: []
 * }
 */
function pacientesListarSelecao_() {
  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastRow = sh.getLastRow();

  if (lastRow < 2) {
    // Não há dados
    return createApiResponse_(true, { pacientes: [] }, []);
  }

  var lastCol = sh.getLastColumn();
  var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var idxId = headerMap["ID_Paciente"];
  var idxNome = headerMap["NomeCompleto"];
  var idxTelefone = headerMap["Telefone"];
  var idxCPF = headerMap["CPF"];
  var idxAtivo = headerMap["Ativo"]; // opcional

  var pacientes = [];

  values.forEach(function (row) {
    var id = idxId != null ? row[idxId] : "";
    var nome = idxNome != null ? row[idxNome] : "";

    if (!id || !nome) {
      return; // linha em branco ou incompleta
    }

    // Se tiver coluna Ativo, filtra
    if (idxAtivo != null) {
      var ativoVal = String(row[idxAtivo] || "").toUpperCase();
      if (ativoVal === "NAO" || ativoVal === "N" || ativoVal === "FALSE") {
        return; // pula inativos
      }
    }

    var telefone =
      idxTelefone != null && row[idxTelefone] != null
        ? String(row[idxTelefone])
        : "";
    var cpf =
      idxCPF != null && row[idxCPF] != null ? String(row[idxCPF]) : "";

    pacientes.push({
      ID_Paciente: String(id),
      nomeCompleto: String(nome),
      documento: cpf,
      telefone: telefone
    });
  });

  return createApiResponse_(true, { pacientes: pacientes }, []);
}

/**
 * Pacientes.CriarBasico
 *
 * Cria um paciente novo com dados mínimos, usado pelo fluxo
 * "Novo paciente" dentro do drawer da Agenda.
 *
 * Espera no payload:
 * {
 *   nomeCompleto: "Fulano",
 *   dataNascimento: "1980-01-01", // opcional
 *   telefone: "(11) 99999-0000", // opcional
 *   documento: "12345678900",    // opcional -> será gravado como CPF
 *   email: "x@x.com",            // opcional
 *   planoSaude: "Unimed",        // opcional
 *   sexo: "M" | "F" | "O",       // opcional
 *   cidade: "...",               // opcional
 *   bairro: "...",               // opcional
 *   profissao: "..."             // opcional
 * }
 */
function pacientesCriarBasico_(payload) {
  if (!payload || !payload.nomeCompleto) {
    return createApiResponse_(false, null, [
      "nomeCompleto é obrigatório para criar paciente."
    ]);
  }

  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastCol = sh.getLastColumn();

  var idPaciente = gerarIdPaciente_();
  var agoraISO = new Date().toISOString();

  // Monta vetor de linha com o tamanho exato do cabeçalho
  var linha = new Array(lastCol).fill("");

  function setCol(colName, value) {
    var idx = headerMap[colName];
    if (idx == null) return;
    linha[idx] = value || "";
  }

  // Preenche as colunas com base no payload
  setCol("ID_Paciente", idPaciente);
  setCol("NomeCompleto", payload.nomeCompleto);
  setCol("CPF", payload.documento || "");
  setCol("Telefone", payload.telefone || "");
  setCol("DataNascimento", payload.dataNascimento || "");
  setCol("E-mail", payload.email || "");
  setCol("Sexo", payload.sexo || "");
  setCol("Cidade", payload.cidade || "");
  setCol("Bairro", payload.bairro || "");
  setCol("Profissão", payload.profissao || "");
  setCol("PlanoSaude", payload.planoSaude || "");
  setCol("DataCadastro", agoraISO);
  setCol("Ativo", "SIM");

  var nextRow = sh.getLastRow() + 1;
  sh.getRange(nextRow, 1, 1, lastCol).setValues([linha]);

  return createApiResponse_(true, { ID_Paciente: idPaciente }, []);
}
