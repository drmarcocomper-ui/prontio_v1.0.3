// Receita.gs
// ---------------------------------------------------------------------------
// Módulo de backend para receitas do PRONTIO
//
// Aba sugerida na planilha: "Receitas"
//
// COLUNAS (linha 1 = cabeçalho):
// A: ID_Receita        (string UUID)
// B: ID_Paciente       (string)
// C: DataHoraCriacao   (string ISO ex: 2025-11-27T10:22:00.000Z)
// D: TextoMedicamentos (string - prescrição completa)
// E: Observacoes       (string)
//
// O FRONT não conhece esses detalhes; só trabalha com JSON.
//
// Ações de API expostas:
//   - Receita.Criar
//   - Receita.ListarPorPaciente
//   - Receita.ListarRecentesPorPaciente  ✅ (nova)
//   - Receita.GerarPdf
//
// IMPORTANTE:
// - Configurações do médico/clínica vêm de Configuracoes.gs (obterConfiguracoes_()).
// - Nome e CPF do paciente vêm da aba "Pacientes" (busca dinâmica pelo cabeçalho).
// ---------------------------------------------------------------------------

var RECEITA_SHEET_NAME = "Receitas";

/**
 * Roteador interno do módulo Receita.
 */
function handleReceitaAction(action, payload) {
  try {

    if (action === "Receita.Criar") {
      return receitaCriar_(payload);
    }

    if (action === "Receita.ListarPorPaciente") {
      return receitaListarPorPaciente_(payload);
    }

    // ✅ NOVA AÇÃO para resumo clínico do prontuário
    if (action === "Receita.ListarRecentesPorPaciente") {
      return receitaListarRecentesPorPaciente_(payload);
    }

    if (action === "Receita.GerarPdf") {
      return receitaGerarPdf_(payload);
    }

    return createApiResponse_(false, null, [
      "Ação não reconhecida em Receita.gs: " + action
    ]);

  } catch (e) {
    return createApiResponse_(false, null, [
      "Erro interno em Receita.gs: " + e.toString()
    ]);
  }
}

/**
 * Retorna (e cria, se necessário) a aba de Receitas.
 */
function getReceitaSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(RECEITA_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(RECEITA_SHEET_NAME);
    var header = [
      "ID_Receita",
      "ID_Paciente",
      "DataHoraCriacao",
      "TextoMedicamentos",
      "Observacoes"
    ];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }

  return sheet;
}

/**
 * Constrói objeto Receita a partir de uma linha da planilha.
 * row: [ID_Receita, ID_Paciente, DataHoraCriacao, TextoMedicamentos, Observacoes]
 */
function buildReceitaFromRow_(row) {
  return {
    idReceita: row[0] || "",
    idPaciente: row[1] || "",
    dataHoraCriacao: row[2] || "",
    textoMedicamentos: row[3] || "",
    observacoes: row[4] || ""
  };
}

/**
 * Cria uma nova receita.
 * payload esperado:
 * {
 *   idPaciente: string (obrigatório),
 *   textoMedicamentos: string (obrigatório),
 *   observacoes?: string
 * }
 */
function receitaCriar_(payload) {
  var sheet = getReceitaSheet_();

  var idPaciente = payload && payload.idPaciente
    ? String(payload.idPaciente).trim()
    : "";
  var textoMedicamentos = payload && payload.textoMedicamentos
    ? String(payload.textoMedicamentos).trim()
    : "";
  var observacoes = payload && payload.observacoes
    ? String(payload.observacoes).trim()
    : "";

  if (!idPaciente) {
    return createApiResponse_(false, null, [
      "idPaciente é obrigatório para Receita.Criar."
    ]);
  }

  if (!textoMedicamentos) {
    return createApiResponse_(false, null, [
      "textoMedicamentos é obrigatório para Receita.Criar."
    ]);
  }

  var idReceita = Utilities.getUuid();
  var dataHoraCriacao = new Date().toISOString();

  var linha = [
    idReceita,
    idPaciente,
    dataHoraCriacao,
    textoMedicamentos,
    observacoes
  ];

  sheet.appendRow(linha);

  var recObj = buildReceitaFromRow_(linha);

  return createApiResponse_(true, {
    receita: recObj
  }, []);
}

/**
 * Lista todas as receitas de um paciente.
 * payload:
 * {
 *   idPaciente: string (obrigatório)
 * }
 */
function receitaListarPorPaciente_(payload) {
  var idPaciente = payload && payload.idPaciente
    ? String(payload.idPaciente).trim()
    : "";

  if (!idPaciente) {
    return createApiResponse_(false, null, [
      "idPaciente é obrigatório para Receita.ListarPorPaciente."
    ]);
  }

  var sheet = getReceitaSheet_();
  var range = sheet.getDataRange();
  var values = range.getValues();

  if (!values || values.length <= 1) {
    return createApiResponse_(true, { receitas: [] }, []);
  }

  var dados = values.slice(1);
  var receitas = [];

  for (var i = 0; i < dados.length; i++) {
    var row = dados[i];
    var idPacRow = row[1];

    if (String(idPacRow) === idPaciente) {
      var rec = buildReceitaFromRow_(row);
      receitas.push(rec);
    }
  }

  // Ordem: mais recente primeiro
  receitas.sort(function (a, b) {
    var da = a.dataHoraCriacao || "";
    var db = b.dataHoraCriacao || "";
    if (da > db) return -1;
    if (da < db) return 1;
    return 0;
  });

  return createApiResponse_(true, {
    receitas: receitas
  }, []);
}

/**
 * ✅ NOVA FUNÇÃO
 * Lista apenas as N últimas receitas de um paciente,
 * reaproveitando a lógica de receitaListarPorPaciente_.
 *
 * payload:
 * {
 *   idPaciente: string (obrigatório),
 *   limite?: number (default = 5)
 * }
 */
function receitaListarRecentesPorPaciente_(payload) {
  var limite = (payload && payload.limite) || 5;

  var baseResp = receitaListarPorPaciente_(payload);
  if (!baseResp || !baseResp.success) {
    return baseResp;
  }

  var receitas = (baseResp.data && baseResp.data.receitas) || [];

  if (limite > 0 && receitas.length > limite) {
    receitas = receitas.slice(0, limite);
  }

  return createApiResponse_(true, { receitas: receitas }, []);
}

/**
 * Busca NOME e CPF de um paciente na aba "Pacientes" a partir do ID.
 *
 * Estrutura esperada (flexível):
 *  - Linha 1: cabeçalho contendo pelo menos:
 *      "ID_Paciente" (ou similar) na primeira coluna (A)
 *      "Nome" ou "NomeCompleto" em alguma coluna
 *      "CPF" em alguma coluna
 *
 * Se o cabeçalho não for exatamente assim, ele tenta localizar
 * "CPF" dinamicamente pelo nome da coluna.
 */
function obterDadosPacientePorId_(idPaciente) {
  var resultado = {
    nomePaciente: "",
    cpfPaciente: ""
  };

  if (!idPaciente) return resultado;

  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("Pacientes");
  if (!sheet) return resultado;

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return resultado;

  var header = values[0];

  // Por padrão: ID em A (0), Nome em B (1)
  var idxId = 0;
  var idxNome = 1;
  var idxCpf = -1;

  // Procura dinamicamente colunas pelo texto do cabeçalho
  for (var c = 0; c < header.length; c++) {
    var titulo = (header[c] || "").toString().trim().toLowerCase();

    if (titulo === "id_paciente" || titulo === "idpaciente") {
      idxId = c;
    }
    if (
      titulo === "nome" ||
      titulo === "nomecompleto" ||
      titulo === "nome completo"
    ) {
      idxNome = c;
    }
    if (titulo === "cpf") {
      idxCpf = c;
    }
  }

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var idRow = row[idxId];

    if (String(idRow) === String(idPaciente)) {
      var nome = row[idxNome];
      var cpf = idxCpf >= 0 ? row[idxCpf] : "";

      resultado.nomePaciente = nome ? String(nome) : "";
      resultado.cpfPaciente = cpf ? String(cpf) : "";
      return resultado;
    }
  }

  return resultado;
}

/**
 * Gera HTML da receita para impressão (PDF).
 *
 * payload:
 * {
 *   idReceita: string (obrigatório)
 * }
 */
function receitaGerarPdf_(payload) {
  var idReceita = payload && payload.idReceita
    ? String(payload.idReceita).trim()
    : "";

  if (!idReceita) {
    return createApiResponse_(false, null, [
      "idReceita é obrigatório para Receita.GerarPdf."
    ]);
  }

  var sheet = getReceitaSheet_();
  var range = sheet.getDataRange();
  var values = range.getValues();

  if (!values || values.length <= 1) {
    return createApiResponse_(false, null, [
      "Nenhuma receita encontrada na planilha."
    ]);
  }

  var dados = values.slice(1);
  var receitaRow = null;

  for (var i = 0; i < dados.length; i++) {
    var row = dados[i];
    var idRow = row[0];

    if (String(idRow) === idReceita) {
      receitaRow = row;
      break;
    }
  }

  if (!receitaRow) {
    return createApiResponse_(false, null, [
      "Receita não encontrada para o ID informado."
    ]);
  }

  var rec = buildReceitaFromRow_(receitaRow);

  // ==============================
  // CONFIGURAÇÕES (médico/clínica/logo)
  // ==============================
  var cfg = {};
  try {
    var cfgResp = obterConfiguracoes_(); // de Configuracoes.gs
    if (cfgResp && cfgResp.success && cfgResp.data && cfgResp.data.configuracoes) {
      cfg = cfgResp.data.configuracoes;
    }
  } catch (e) {
    cfg = {};
  }

  var medicoNomeCompleto   = cfg.medicoNomeCompleto   || "";
  var medicoCRM            = cfg.medicoCRM            || "";
  var medicoEspecialidade  = cfg.medicoEspecialidade  || "";
  var clinicaNome          = cfg.clinicaNome          || "";
  var clinicaEndereco      = cfg.clinicaEndereco      || "";
  var clinicaTelefone      = cfg.clinicaTelefone      || "";
  var clinicaEmail         = cfg.clinicaEmail         || "";
  var clinicaLogoUrl       = cfg.clinicaLogoUrl       || "";

  // ==============================
  // NOME / CPF DO PACIENTE
  // ==============================
  var dadosPac = obterDadosPacientePorId_(rec.idPaciente);
  var nomePaciente = dadosPac.nomePaciente;
  var cpfPaciente  = dadosPac.cpfPaciente;

  // Data em formato dd/MM/yyyy
  var dataBR = "";
  if (rec.dataHoraCriacao) {
    var d = new Date(rec.dataHoraCriacao);
    if (!isNaN(d.getTime())) {
      var dia = ("0" + d.getDate()).slice(-2);
      var mes = ("0" + (d.getMonth() + 1)).slice(-2);
      var ano = d.getFullYear();
      dataBR = dia + "/" + mes + "/" + ano;
    }
  }
  if (!dataBR) {
    var hoje = new Date();
    var dd = ("0" + hoje.getDate()).slice(-2);
    var mm = ("0" + (hoje.getMonth() + 1)).slice(-2);
    var yy = hoje.getFullYear();
    dataBR = dd + "/" + mm + "/" + yy;
  }

  // ==============================
  // MONTA HTML
  // ==============================
  var html = "";
  html += "<!DOCTYPE html>";
  html += '<html lang="pt-BR">';
  html += "<head>";
  html += '<meta charset="UTF-8">';
  html += "<title>Receita Médica</title>";
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; font-size: 13px; margin: 24px; color:#111; }";
  html += ".cabecalho { text-align: center; margin-bottom: 16px; }";
  html += ".cabecalho-logo { margin-bottom: 6px; }";
  html += ".cabecalho-logo img { max-height: 70px; }";
  html += ".cabecalho-clinica { font-size: 14px; font-weight: bold; }";
  html += ".cabecalho-medico { font-size: 13px; margin-top: 4px; }";
  html += ".cabecalho-contato { font-size: 11px; color:#555; margin-top:4px; }";
  html += ".linha-divisoria { border-top: 1px solid #444; margin: 12px 0 16px 0; }";
  html += ".titulo-receita { font-size: 16px; font-weight: bold; text-align:center; margin-bottom: 10px; }";
  html += ".bloco-info { margin-bottom: 10px; }";
  html += ".rotulo { font-weight:bold; }";
  html += ".texto-prescricao { white-space: pre-wrap; border:1px solid #ccc; padding:10px; border-radius:6px; min-height:120px; }";
  html += ".texto-obs { white-space: pre-wrap; border:1px solid #ccc; padding:8px; border-radius:6px; min-height:60px; font-size:12px; }";
  html += ".rodape-assinatura { margin-top: 40px; text-align:center; }";
  html += ".linha-assinatura { border-top:1px solid #000; width:260px; margin:0 auto 4px auto; }";
  html += ".rodape-assinatura small { display:block; font-size:11px; color:#333; }";
  html += "@page { margin: 18mm; }";
  html += "</style>";
  html += "</head>";
  html += "<body>";

  // Cabeçalho
  html += '<div class="cabecalho">';

  // LOGO (se existir)
  if (clinicaLogoUrl) {
    html += '<div class="cabecalho-logo">';
    html += '<img src="' + clinicaLogoUrl + '" alt="Logo da clínica">';
    html += "</div>";
  }

  if (clinicaNome) {
    html += '<div class="cabecalho-clinica">' + escapeHtml_(clinicaNome) + "</div>";
  }
  if (clinicaEndereco) {
    html += '<div class="cabecalho-contato">' + escapeHtml_(clinicaEndereco) + "</div>";
  }

  var contatoLinha = [];
  if (clinicaTelefone) contatoLinha.push("Tel/WhatsApp: " + clinicaTelefone);
  if (clinicaEmail) contatoLinha.push("E-mail: " + clinicaEmail);
  if (contatoLinha.length) {
    html += '<div class="cabecalho-contato">' + escapeHtml_(contatoLinha.join(" • ")) + "</div>";
  }

  if (medicoNomeCompleto || medicoCRM || medicoEspecialidade) {
    var medicoLinha = medicoNomeCompleto;
    if (medicoCRM) medicoLinha += (medicoLinha ? " - " : "") + "CRM: " + medicoCRM;
    if (medicoEspecialidade) medicoLinha += (medicoLinha ? " - " : "") + medicoEspecialidade;
    html += '<div class="cabecalho-medico">' + escapeHtml_(medicoLinha) + "</div>";
  }

  html += "</div>"; // cabecalho
  html += '<div class="linha-divisoria"></div>';

  // Título
  html += '<div class="titulo-receita">RECEITA MÉDICA</div>';

  // Info paciente / data
  html += '<div class="bloco-info">';
  html += '<span class="rotulo">Data: </span>' + escapeHtml_(dataBR) + "<br>";
  if (nomePaciente) {
    html += '<span class="rotulo">Paciente: </span>' + escapeHtml_(nomePaciente) + "<br>";
  }
  if (cpfPaciente) {
    html += '<span class="rotulo">CPF: </span>' + escapeHtml_(cpfPaciente) + "<br>";
  }
  html += "</div>";

  // Prescrição
  html += '<div class="bloco-info">';
  html += '<div class="rotulo">Prescrição:</div>';
  html += '<div class="texto-prescricao">' + escapeHtml_(rec.textoMedicamentos || "") + "</div>";
  html += "</div>";

  // Observações
  if (rec.observacoes) {
    html += '<div class="bloco-info">';
    html += '<div class="rotulo">Observações:</div>';
    html += '<div class="texto-obs">' + escapeHtml_(rec.observacoes || "") + "</div>";
    html += "</div>";
  }

  // Assinatura
  html += '<div class="rodape-assinatura">';
  html += '<div class="linha-assinatura"></div>';
  if (medicoNomeCompleto) {
    html += "<small>" + escapeHtml_(medicoNomeCompleto) + "</small>";
  }
  if (medicoCRM) {
    html += "<small>CRM: " + escapeHtml_(medicoCRM) + "</small>";
  }
  if (medicoEspecialidade) {
    html += "<small>" + escapeHtml_(medicoEspecialidade) + "</small>";
  }
  html += "</div>";

  html += "</body></html>";

  return createApiResponse_(true, { html: html }, []);
}

/**
 * Pequeno helper para escapar HTML.
 */
function escapeHtml_(texto) {
  if (!texto && texto !== 0) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
