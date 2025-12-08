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
// IMPORTANTE:
// - O FRONT NÃO SABE DOS NOMES/ORDENS DAS COLUNAS.
// - O FRONT conversa APENAS via ações de API, por exemplo:
//
//   Leves (agenda, seleção):
//   - Pacientes_ListarSelecao      (ou Pacientes.ListarSelecao)
//   - Pacientes_CriarBasico        (ou Pacientes.CriarBasico)
//   - Pacientes_BuscarSimples
//
//   CRUD mais completo (tela de pacientes):
//   - Pacientes_Listar
//   - Pacientes_ObterPorId
//   - Pacientes_Atualizar
//   - Pacientes_AlterarStatus
//
// ESTE MÓDULO:
// - devolve APENAS o "data" (objeto / array);
// - em caso de erro, lança { code, message, details }.
// - Api.gs é quem monta { success, data, errors }.
// ---------------------------------------------------------------------------

/** Nome da aba de pacientes na planilha */
var PACIENTES_SHEET_NAME = 'Pacientes';

/** Obtém (ou cria) a aba Pacientes */
function getPacientesSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PACIENTES_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(PACIENTES_SHEET_NAME);
    var header = [
      'ID_Paciente',
      'NomeCompleto',
      'CPF',
      'Telefone',
      'DataNascimento',
      'E-mail',
      'Sexo',
      'Cidade',
      'Bairro',
      'Profissão',
      'PlanoSaude',
      'DataCadastro',
      'Ativo'
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
  if (lastCol < 1) {
    throw {
      code: 'PACIENTES_HEADER_EMPTY',
      message: 'Cabeçalho da aba Pacientes está vazio.',
      details: null
    };
  }

  var headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];

  var map = {};
  headerRow.forEach(function (colName, index) {
    var nome = String(colName || '').trim();
    if (nome) {
      map[nome] = index; // índice baseado em 0
    }
  });

  return map;
}

/**
 * Gera um ID_Paciente único e estável.
 * Formato: "PAC-<timestamp>-<random>"
 */
function gerarIdPaciente_() {
  var prefix = 'PAC-';
  var now = new Date().getTime();
  var rand = Math.floor(Math.random() * 1000); // 0–999
  var randStr = ('000' + rand).slice(-3);
  return prefix + now + '-' + randStr;
}

/**
 * Converte Date -> "yyyy-MM-dd".
 */
function formatDateYMD_(date) {
  if (!(date instanceof Date)) return '';
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone() || 'America/Sao_Paulo',
    'yyyy-MM-dd'
  );
}

/**
 * Converte uma linha da planilha em objeto "paciente completo" para o front.
 *
 * Retorno:
 * {
 *   ID_Paciente,
 *   nomeCompleto,
 *   cpf,
 *   telefone,
 *   dataNascimento,   // "yyyy-MM-dd" ou ""
 *   email,
 *   sexo,
 *   cidade,
 *   bairro,
 *   profissao,
 *   planoSaude,
 *   dataCadastro,     // string como está gravada (ISO ou outro)
 *   ativo             // boolean
 * }
 */
function pacienteRowToObject_(row, headerMap) {
  function get(colName) {
    var idx = headerMap[colName];
    if (idx == null) return '';
    return row[idx];
  }

  var dataNascCell = get('DataNascimento');
  var dataNascimentoStr = '';
  if (dataNascCell instanceof Date) {
    dataNascimentoStr = formatDateYMD_(dataNascCell);
  } else if (dataNascCell) {
    // se vier string, assume que já está no padrão desejado
    dataNascimentoStr = String(dataNascCell).trim();
  }

  var dataCadCell = get('DataCadastro');
  var dataCadastroStr = '';
  if (dataCadCell instanceof Date) {
    // se estiver em formato Date, converte para ISO
    dataCadastroStr = new Date(dataCadCell).toISOString();
  } else if (dataCadCell) {
    dataCadastroStr = String(dataCadCell).trim();
  }

  var ativoCell = String(get('Ativo') || '').trim().toUpperCase();
  var ativoBool = !(
    ativoCell === 'NAO' ||
    ativoCell === 'N' ||
    ativoCell === 'FALSE' ||
    ativoCell === '0'
  );

  return {
    ID_Paciente: String(get('ID_Paciente') || '').trim(),
    nomeCompleto: String(get('NomeCompleto') || '').trim(),
    cpf: String(get('CPF') || '').trim(),
    telefone: String(get('Telefone') || '').trim(),
    dataNascimento: dataNascimentoStr,
    email: String(get('E-mail') || '').trim(),
    sexo: String(get('Sexo') || '').trim(),
    cidade: String(get('Cidade') || '').trim(),
    bairro: String(get('Bairro') || '').trim(),
    profissao: String(get('Profissão') || '').trim(),
    planoSaude: String(get('PlanoSaude') || '').trim(),
    dataCadastro: dataCadastroStr,
    ativo: ativoBool
  };
}

/**
 * Lê todos os pacientes em forma de objetos.
 *
 * Retorno: [
 *   {
 *     ID_Paciente,
 *     nomeCompleto,
 *     cpf,
 *     telefone,
 *     dataNascimento ("yyyy-MM-dd" ou ""),
 *     email,
 *     sexo,
 *     cidade,
 *     bairro,
 *     profissao,
 *     planoSaude,
 *     dataCadastro,
 *     ativo (boolean)
 *   },
 *   ...
 * ]
 */
function readAllPacientes_() {
  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return [];
  }

  var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var list = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    // se estiver completamente vazio, pula
    if (String(row.join('')).trim() === '') continue;

    var paciente = pacienteRowToObject_(row, headerMap);

    // Se não tem ID nem nome, ignora
    if (!paciente.ID_Paciente && !paciente.nomeCompleto) continue;

    list.push(paciente);
  }

  return list;
}

/**
 * Roteador de ações específicas de Pacientes.
 * Chamado a partir de Api.gs com (action, payload).
 *
 * Cada case retorna APENAS o "data" (objeto / array),
 * deixando Api.gs montar {success, data, errors}.
 */
function handlePacientesAction(action, payload) {
  // Compatibilidade: aceitar tanto "Pacientes_X" quanto "Pacientes.X"
  if (action === 'Pacientes.ListarSelecao') {
    action = 'Pacientes_ListarSelecao';
  }
  if (action === 'Pacientes.CriarBasico') {
    action = 'Pacientes_CriarBasico';
  }
  if (action === 'Pacientes.BuscarSimples') {
    action = 'Pacientes_BuscarSimples';
  }
  if (action === 'Pacientes.Listar') {
    action = 'Pacientes_Listar';
  }
  if (action === 'Pacientes.ObterPorId') {
    action = 'Pacientes_ObterPorId';
  }
  if (action === 'Pacientes.Atualizar') {
    action = 'Pacientes_Atualizar';
  }
  if (action === 'Pacientes.AlterarStatus') {
    action = 'Pacientes_AlterarStatus';
  }

  switch (action) {
    case 'Pacientes_ListarSelecao':
      return Pacientes_ListarSelecao(payload);

    case 'Pacientes_CriarBasico':
      return Pacientes_CriarBasico(payload);

    case 'Pacientes_BuscarSimples':
      return Pacientes_BuscarSimples(payload);

    case 'Pacientes_Listar':
      return Pacientes_Listar(payload);

    case 'Pacientes_ObterPorId':
      return Pacientes_ObterPorId(payload);

    case 'Pacientes_Atualizar':
      return Pacientes_Atualizar(payload);

    case 'Pacientes_AlterarStatus':
      return Pacientes_AlterarStatus(payload);

    default:
      throw {
        code: 'PACIENTES_UNKNOWN_ACTION',
        message: 'Ação de Pacientes desconhecida: ' + action,
        details: null
      };
  }
}

/**
 * Pacientes_ListarSelecao
 *
 * Retorna lista resumida de pacientes para selects etc.
 *
 * Retorno (data):
 * {
 *   pacientes: [
 *     {
 *       ID_Paciente,
 *       nomeCompleto,
 *       documento,
 *       telefone
 *     },
 *     ...
 *   ]
 * }
 */
function Pacientes_ListarSelecao(payload) {
  var todos = readAllPacientes_();
  var ativos = todos.filter(function (p) {
    return p.ativo;
  });

  var pacientes = ativos.map(function (p) {
    return {
      ID_Paciente: p.ID_Paciente,
      nomeCompleto: p.nomeCompleto,
      documento: p.cpf,
      telefone: p.telefone
    };
  });

  return { pacientes: pacientes };
}

/**
 * Pacientes_CriarBasico
 *
 * Cria um paciente novo com dados mínimos.
 *
 * payload esperado:
 * {
 *   nomeCompleto: "Fulano",
 *   dataNascimento: "1980-01-01", // opcional, preferencialmente yyyy-MM-dd
 *   telefone: "(11) 99999-0000", // opcional
 *   documento: "12345678900",    // opcional -> gravado em CPF
 *   email: "x@x.com",            // opcional
 *   planoSaude: "Unimed",        // opcional
 *   sexo: "M" | "F" | "O",       // opcional
 *   cidade: "...",               // opcional
 *   bairro: "...",               // opcional
 *   profissao: "..."             // opcional
 * }
 *
 * Retorno (data):
 * {
 *   ID_Paciente: "PAC-..."
 * }
 */
function Pacientes_CriarBasico(payload) {
  if (!payload || !payload.nomeCompleto) {
    throw {
      code: 'PACIENTES_MISSING_NOME',
      message: 'nomeCompleto é obrigatório para criar paciente.',
      details: null
    };
  }

  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastCol = sh.getLastColumn();

  var idPaciente = gerarIdPaciente_();
  var agoraISO = new Date().toISOString();

  var linha = new Array(lastCol).fill('');

  function setCol(colName, value) {
    var idx = headerMap[colName];
    if (idx == null) return;
    linha[idx] = value || '';
  }

  setCol('ID_Paciente', idPaciente);
  setCol('NomeCompleto', payload.nomeCompleto);
  setCol('CPF', payload.documento || '');
  setCol('Telefone', payload.telefone || '');
  setCol('DataNascimento', payload.dataNascimento || '');
  setCol('E-mail', payload.email || '');
  setCol('Sexo', payload.sexo || '');
  setCol('Cidade', payload.cidade || '');
  setCol('Bairro', payload.bairro || '');
  setCol('Profissão', payload.profissao || '');
  setCol('PlanoSaude', payload.planoSaude || '');
  setCol('DataCadastro', agoraISO);
  setCol('Ativo', 'SIM');

  var nextRow = sh.getLastRow() + 1;
  sh.getRange(nextRow, 1, 1, lastCol).setValues([linha]);

  return { ID_Paciente: idPaciente };
}

/**
 * Pacientes_BuscarSimples
 *
 * Usado na Agenda para digitar um termo e filtrar pacientes
 * por nome, documento ou telefone.
 *
 * payload:
 * {
 *   termo: "maria",   // obrigatório
 *   limite: 30        // opcional, default 30
 * }
 *
 * Retorno (data):
 * {
 *   pacientes: [
 *     { ID_Paciente, nome, documento, telefone, data_nascimento },
 *     ...
 *   ]
 * }
 */
function Pacientes_BuscarSimples(payload) {
  payload = payload || {};
  var termo = String(payload.termo || '').toLowerCase().trim();
  var limite = Number(payload.limite || 30);
  if (!limite || limite <= 0) limite = 30;

  if (!termo) {
    // sem termo → devolve lista vazia
    return { pacientes: [] };
  }

  var todos = readAllPacientes_();
  if (!todos.length) {
    return { pacientes: [] };
  }

  var resultados = [];

  for (var i = 0; i < todos.length; i++) {
    var p = todos[i];
    if (!p.ativo) continue;

    var haystack = [
      p.nomeCompleto || '',
      p.cpf || '',
      p.telefone || ''
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.indexOf(termo) !== -1) {
      resultados.push({
        ID_Paciente: p.ID_Paciente,
        nome: p.nomeCompleto,
        documento: p.cpf,
        telefone: p.telefone,
        data_nascimento: p.dataNascimento
      });

      if (resultados.length >= limite) {
        break;
      }
    }
  }

  return { pacientes: resultados };
}

/**
 * Pacientes_Listar
 *
 * Usado pela tela de Pacientes para listar registros completos.
 *
 * payload (opcional):
 * {
 *   termo: "joao",           // filtro texto (nome, cpf, telefone, email)
 *   somenteAtivos: true/false,
 *   ordenacao: "dataCadastroDesc" | "dataCadastroAsc" | "nomeAsc" | "nomeDesc"
 * }
 *
 * Retorno (data):
 * {
 *   pacientes: [ { ..paciente completo.. }, ... ]
 * }
 */
function Pacientes_Listar(payload) {
  payload = payload || {};
  var termo = String(payload.termo || '').toLowerCase().trim();
  var somenteAtivos = !!payload.somenteAtivos;
  var ordenacao = String(payload.ordenacao || 'dataCadastroDesc');

  var todos = readAllPacientes_();

  var filtrados = todos.filter(function (p) {
    if (somenteAtivos && !p.ativo) {
      return false;
    }

    if (!termo) return true;

    var texto = [
      p.nomeCompleto || '',
      p.cpf || '',
      p.telefone || '',
      p.email || ''
    ]
      .join(' ')
      .toLowerCase();

    return texto.indexOf(termo) !== -1;
  });

  // Ordenação
  filtrados.sort(function (a, b) {
    if (ordenacao === 'nomeAsc' || ordenacao === 'nomeDesc') {
      var na = (a.nomeCompleto || '').toLowerCase();
      var nb = (b.nomeCompleto || '').toLowerCase();
      if (na < nb) return ordenacao === 'nomeAsc' ? -1 : 1;
      if (na > nb) return ordenacao === 'nomeAsc' ? 1 : -1;
      return 0;
    }

    // dataCadastroAsc / dataCadastroDesc
    var da = Date.parse(a.dataCadastro || '') || 0;
    var db = Date.parse(b.dataCadastro || '') || 0;
    if (da < db) return ordenacao === 'dataCadastroAsc' ? -1 : 1;
    if (da > db) return ordenacao === 'dataCadastroAsc' ? 1 : -1;
    return 0;
  });

  return { pacientes: filtrados };
}

/**
 * Pacientes_ObterPorId
 *
 * payload:
 * {
 *   ID_Paciente: "PAC-..."
 * }
 *
 * Retorno (data):
 * {
 *   paciente: { ..paciente completo.. }
 * }
 */
function Pacientes_ObterPorId(payload) {
  var id = payload && payload.ID_Paciente ? String(payload.ID_Paciente).trim() : '';
  if (!id) {
    throw {
      code: 'PACIENTES_MISSING_ID',
      message: 'ID_Paciente é obrigatório em Pacientes_ObterPorId.',
      details: null
    };
  }

  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  if (lastRow < 2) {
    throw {
      code: 'PACIENTES_NOT_FOUND',
      message: 'Paciente não encontrado para ID_Paciente: ' + id,
      details: null
    };
  }

  var idxId = headerMap['ID_Paciente'];
  if (idxId == null) {
    throw {
      code: 'PACIENTES_ID_COL_NOT_FOUND',
      message: 'Coluna ID_Paciente não encontrada na aba Pacientes.',
      details: null
    };
  }

  var range = sh.getRange(2, 1, lastRow - 1, lastCol);
  var values = range.getValues();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowId = String(row[idxId] || '').trim();
    if (rowId === id) {
      var paciente = pacienteRowToObject_(row, headerMap);
      return { paciente: paciente };
    }
  }

  throw {
    code: 'PACIENTES_NOT_FOUND',
    message: 'Paciente não encontrado para ID_Paciente: ' + id,
    details: null
  };
}

/**
 * Pacientes_Atualizar
 *
 * Atualiza dados básicos de um paciente já existente.
 *
 * payload (exemplo):
 * {
 *   ID_Paciente: "PAC-...",
 *   nomeCompleto: "...",      // opcional
 *   dataNascimento: "yyyy-MM-dd", // opcional
 *   telefone: "...",          // opcional
 *   documento: "...",         // opcional -> CPF
 *   email: "...",             // opcional
 *   sexo: "...",              // opcional
 *   cidade: "...",            // opcional
 *   bairro: "...",            // opcional
 *   profissao: "...",         // opcional
 *   planoSaude: "..."         // opcional
 * }
 *
 * Retorno (data):
 * {
 *   paciente: { ..paciente completo após atualização.. }
 * }
 */
function Pacientes_Atualizar(payload) {
  if (!payload || !payload.ID_Paciente) {
    throw {
      code: 'PACIENTES_MISSING_ID',
      message: 'ID_Paciente é obrigatório em Pacientes_Atualizar.',
      details: null
    };
  }

  var id = String(payload.ID_Paciente).trim();

  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  if (lastRow < 2) {
    throw {
      code: 'PACIENTES_NOT_FOUND',
      message: 'Paciente não encontrado para ID_Paciente: ' + id,
      details: null
    };
  }

  var idxId = headerMap['ID_Paciente'];
  if (idxId == null) {
    throw {
      code: 'PACIENTES_ID_COL_NOT_FOUND',
      message: 'Coluna ID_Paciente não encontrada na aba Pacientes.',
      details: null
    };
  }

  var range = sh.getRange(2, 1, lastRow - 1, lastCol);
  var values = range.getValues();

  var foundRowIndex = -1;
  for (var i = 0; i < values.length; i++) {
    var rowId = String(values[i][idxId] || '').trim();
    if (rowId === id) {
      foundRowIndex = i;
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw {
      code: 'PACIENTES_NOT_FOUND',
      message: 'Paciente não encontrado para ID_Paciente: ' + id,
      details: null
    };
  }

  var row = values[foundRowIndex];

  function setField(colName, propName) {
    if (typeof payload[propName] === 'undefined') return;
    var idx = headerMap[colName];
    if (idx == null) return;
    row[idx] = payload[propName] || '';
  }

  // Atualiza campos conforme payload
  setField('NomeCompleto', 'nomeCompleto');
  setField('CPF', 'documento');
  setField('Telefone', 'telefone');
  setField('DataNascimento', 'dataNascimento');
  setField('E-mail', 'email');
  setField('Sexo', 'sexo');
  setField('Cidade', 'cidade');
  setField('Bairro', 'bairro');
  setField('Profissão', 'profissao');
  setField('PlanoSaude', 'planoSaude');

  // Escreve a linha inteira de volta
  var writeRowIndex = foundRowIndex + 2; // +2 por causa do cabeçalho
  sh.getRange(writeRowIndex, 1, 1, lastCol).setValues([row]);

  // Converte novamente para objeto de retorno
  var pacienteAtualizado = pacienteRowToObject_(row, headerMap);
  return { paciente: pacienteAtualizado };
}

/**
 * Pacientes_AlterarStatus
 *
 * Altera somente o status Ativo (SIM/NAO) do paciente.
 *
 * payload:
 * {
 *   ID_Paciente: "PAC-...",
 *   ativo: true/false
 * }
 *
 * Retorno (data):
 * {
 *   ID_Paciente: "PAC-...",
 *   ativo: true/false
 * }
 */
function Pacientes_AlterarStatus(payload) {
  if (!payload || !payload.ID_Paciente) {
    throw {
      code: 'PACIENTES_MISSING_ID',
      message: 'ID_Paciente é obrigatório em Pacientes_AlterarStatus.',
      details: null
    };
  }

  if (typeof payload.ativo === 'undefined') {
    throw {
      code: 'PACIENTES_MISSING_ATIVO',
      message: 'Campo "ativo" (true/false) é obrigatório em Pacientes_AlterarStatus.',
      details: null
    };
  }

  var id = String(payload.ID_Paciente).trim();
  var ativoBool = !!payload.ativo;
  var novoValor = ativoBool ? 'SIM' : 'NAO';

  var sh = getPacientesSheet_();
  var headerMap = getPacientesHeaderMap_();
  var lastRow = sh.getLastRow();

  if (lastRow < 2) {
    throw {
      code: 'PACIENTES_NOT_FOUND',
      message: 'Paciente não encontrado para ID_Paciente: ' + id,
      details: null
    };
  }

  var idxId = headerMap['ID_Paciente'];
  var idxAtivo = headerMap['Ativo'];

  if (idxId == null || idxAtivo == null) {
    throw {
      code: 'PACIENTES_COL_NOT_FOUND',
      message: 'Colunas ID_Paciente ou Ativo não encontradas na aba Pacientes.',
      details: null
    };
  }

  var range = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn());
  var values = range.getValues();

  var foundRowIndex = -1;
  for (var i = 0; i < values.length; i++) {
    var rowId = String(values[i][idxId] || '').trim();
    if (rowId === id) {
      foundRowIndex = i;
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw {
      code: 'PACIENTES_NOT_FOUND',
      message: 'Paciente não encontrado para ID_Paciente: ' + id,
      details: null
    };
  }

  values[foundRowIndex][idxAtivo] = novoValor;

  // Escreve apenas a célula ou a linha inteira (seguiremos linha inteira pra simplicidade)
  var writeRowIndex = foundRowIndex + 2;
  sh.getRange(writeRowIndex, 1, 1, sh.getLastColumn()).setValues([
    values[foundRowIndex]
  ]);

  return {
    ID_Paciente: id,
    ativo: ativoBool
  };
}
