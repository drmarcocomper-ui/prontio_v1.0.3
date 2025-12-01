// assets/js/receita.js
// Tela de receita do paciente (ES Module)
// Usa o ID_Paciente salvo no state/localStorage
// Ações de API usadas:
// - Receita.Criar
// - Receita.ListarPorPaciente
// - Receita.GerarPdf
// - Medicamentos.ListarTodos
// - Medicamentos.BuscarPorTermo (no futuro, se quiser)

import { callApi } from './core/api.js';
import { getPacienteAtual } from './core/state.js';
import { formatarDataBR, formatarHora } from './core/utils.js';
import { createPageMessages } from './ui/messages.js';

let cacheMedicamentos = [];

// Mensagens da página (usa #mensagemReceita)
const msgs = createPageMessages('#mensagemReceita');

// Wrapper para manter assinatura antiga
function mostrarMensagemReceita(texto, tipo = 'info') {
  if (!texto) {
    msgs.clear();
    return;
  }

  switch (tipo) {
    case 'erro':
      msgs.erro(texto);
      break;
    case 'sucesso':
      msgs.sucesso(texto);
      break;
    default:
      msgs.info(texto);
      break;
  }
}

/**
 * Formata data/hora (ISO) para padrão brasileiro.
 */
function formatarDataHoraBRRec(isoString) {
  if (!isoString) return '';

  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return isoString;
  }

  const data = formatarDataBR(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
  );
  const hora = formatarHora(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}`
  );

  return `${data} ${hora}`;
}

/**
 * Obtém paciente atual do state ou fallback para localStorage.
 */
function obterPacienteAtual() {
  const p = getPacienteAtual();
  if (p && p.id) {
    return { idPaciente: p.id, nomePaciente: p.nome || '' };
  }

  const id = localStorage.getItem('prontio_pacienteAtualId') || '';
  const nome = localStorage.getItem('prontio_pacienteAtualNome') || '';
  if (!id) return null;

  return { idPaciente: id, nomePaciente: nome };
}

/**
 * EXPORT: Inicializa a tela de receita.
 * Chamado pelo main.js: initReceitaPage()
 */
export async function initReceitaPage() {
  console.log('PRONTIO: initReceitaPage');
  await inicializarReceita();
}

/**
 * Inicializa a tela de receita: dados do paciente, eventos, lista de receitas e catálogo de medicamentos.
 */
async function inicializarReceita() {
  const atual = obterPacienteAtual();
  const spanId = document.getElementById('recPacienteId');
  const spanNome = document.getElementById('recPacienteNome');
  const form = document.getElementById('formReceita');
  const btnLimpar = document.getElementById('btnLimparCamposReceita');
  const inputBuscaMed = document.getElementById('buscaMedicamento');
  const btnRecarregarMed = document.getElementById('btnRecarregarMedicamentos');

  if (!atual || !atual.idPaciente) {
    if (spanId) spanId.textContent = '-';
    if (spanNome) spanNome.textContent = '-';

    mostrarMensagemReceita(
      'Nenhum paciente selecionado. Volte à lista de pacientes, selecione um e depois abra o prontuário/receita.',
      'erro'
    );

    if (form) {
      Array.from(form.elements).forEach((el) => {
        el.disabled = true;
      });
    }
    return;
  }

  const { idPaciente, nomePaciente } = atual;

  if (spanId) spanId.textContent = idPaciente;
  if (spanNome) spanNome.textContent = nomePaciente || '';

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await salvarReceita();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      limparCamposReceita();
    });
  }

  // Eventos do catálogo de medicamentos
  if (inputBuscaMed) {
    inputBuscaMed.addEventListener('input', () => {
      aplicarFiltroMedicamentosLocal();
    });
  }

  if (btnRecarregarMed) {
    btnRecarregarMed.addEventListener('click', async () => {
      await carregarMedicamentos();
    });
  }

  mostrarMensagemReceita('Carregando receitas do paciente...', 'info');
  await carregarReceitas();

  // Carrega catálogo de medicamentos
  await carregarMedicamentos();
}

/**
 * Limpa apenas os campos da receita (texto e observações).
 */
function limparCamposReceita() {
  const campoTexto = document.getElementById('textoMedicamentos');
  const campoObs = document.getElementById('obsReceita');

  if (campoTexto) campoTexto.value = '';
  if (campoObs) campoObs.value = '';

  mostrarMensagemReceita('Campos da receita limpos.', 'info');
}

/**
 * Envia uma nova receita para o backend.
 */
async function salvarReceita() {
  const atual = obterPacienteAtual();
  if (!atual || !atual.idPaciente) {
    mostrarMensagemReceita(
      'Nenhum paciente selecionado. Volte à lista de pacientes.',
      'erro'
    );
    return;
  }

  const { idPaciente } = atual;

  const campoTexto = document.getElementById('textoMedicamentos');
  const campoObs = document.getElementById('obsReceita');

  const textoMedicamentos = campoTexto ? campoTexto.value.trim() : '';
  const obsReceita = campoObs ? campoObs.value.trim() : '';

  if (!textoMedicamentos) {
    mostrarMensagemReceita(
      'O campo de medicamentos/posologia é obrigatório.',
      'erro'
    );
    return;
  }

  mostrarMensagemReceita('Salvando receita...', 'info');

  const resposta = await callApi({
    action: 'Receita.Criar',
    payload: {
      idPaciente,
      textoMedicamentos,
      observacoes: obsReceita,
    },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(' | ')) ||
      'Erro ao salvar receita. Tente novamente.';
    mostrarMensagemReceita(erroTexto, 'erro');
    return;
  }

  mostrarMensagemReceita('Receita salva com sucesso.', 'sucesso');

  limparCamposReceita();
  await carregarReceitas();
}

/**
 * Carrega as receitas anteriores do paciente e atualiza a tabela.
 */
async function carregarReceitas() {
  const atual = obterPacienteAtual();
  if (!atual || !atual.idPaciente) return;

  const { idPaciente } = atual;

  const resposta = await callApi({
    action: 'Receita.ListarPorPaciente',
    payload: { idPaciente },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(' | ')) ||
      'Erro ao carregar receitas do paciente.';
    mostrarMensagemReceita(erroTexto, 'erro');
    return;
  }

  const receitas = (resposta.data && resposta.data.receitas) || [];
  const tbody = document.getElementById('tabelaReceitasBody');
  if (!tbody) {
    mostrarMensagemReceita(
      'Tabela de receitas não encontrada na tela.',
      'erro'
    );
    return;
  }

  tbody.innerHTML = '';

  if (receitas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'Nenhuma receita registrada para este paciente.';
    td.style.textAlign = 'center';
    td.style.color = '#777';
    tr.appendChild(td);
    tbody.appendChild(tr);

    mostrarMensagemReceita(
      'Nenhuma receita encontrada para este paciente.',
      'info'
    );
    return;
  }

  receitas.forEach((rec) => {
    const tr = document.createElement('tr');
    tr.dataset.idReceita = rec.idReceita || '';

    const tdDataHora = document.createElement('td');
    tdDataHora.className = 'col-data-receita';
    tdDataHora.textContent = formatarDataHoraBRRec(
      rec.dataHoraCriacao || rec.dataHora || rec.dataReceita || ''
    );
    tr.appendChild(tdDataHora);

    const tdTexto = document.createElement('td');
    tdTexto.className = 'texto-medicamentos-preview';
    tdTexto.textContent = rec.textoMedicamentos || '';
    tr.appendChild(tdTexto);

    const tdObs = document.createElement('td');
    tdObs.className = 'texto-obs-preview';
    tdObs.textContent = rec.observacoes || '';
    tr.appendChild(tdObs);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'col-acoes-receita';

    const divAcoes = document.createElement('div');
    divAcoes.className = 'acoes-receita-lista';

    const btnPdf = document.createElement('button');
    btnPdf.type = 'button';
    btnPdf.textContent = 'PDF';
    btnPdf.className = 'btn secundario';
    btnPdf.addEventListener('click', async () => {
      const idReceita = rec.idReceita;
      if (!idReceita) {
        alert('ID da receita não encontrado.');
        return;
      }
      await gerarPdfReceita(idReceita);
    });

    const btnModelo = document.createElement('button');
    btnModelo.type = 'button';
    btnModelo.textContent = 'Usar como modelo';
    btnModelo.className = 'btn primario';
    btnModelo.addEventListener('click', () => {
      aplicarReceitaComoModelo(rec);
    });

    divAcoes.appendChild(btnPdf);
    divAcoes.appendChild(btnModelo);
    tdAcoes.appendChild(divAcoes);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });

  mostrarMensagemReceita(
    `Receitas carregadas: ${receitas.length} registro(s).`,
    'sucesso'
  );
}

/**
 * Copia o conteúdo de uma receita anterior para o formulário atual,
 * permitindo reaproveitar a prescrição com ajustes.
 */
function aplicarReceitaComoModelo(receita) {
  const campoTexto = document.getElementById('textoMedicamentos');
  const campoObs = document.getElementById('obsReceita');

  if (campoTexto) {
    campoTexto.value = receita.textoMedicamentos || '';
  }
  if (campoObs) {
    campoObs.value = receita.observacoes || '';
  }

  mostrarMensagemReceita(
    'Receita carregada no formulário para edição.',
    'info'
  );

  if (campoTexto) {
    campoTexto.focus();
  }
}

/**
 * Solicita ao backend o HTML da receita e abre para impressão/PDF.
 */
async function gerarPdfReceita(idReceita) {
  mostrarMensagemReceita('Gerando documento da receita...', 'info');

  const resposta = await callApi({
    action: 'Receita.GerarPdf',
    payload: { idReceita },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(' | ')) ||
      'Erro ao gerar documento da receita.';
    mostrarMensagemReceita(erroTexto, 'erro');
    return;
  }

  const html =
    resposta.data && resposta.data.html ? resposta.data.html : null;

  if (!html) {
    mostrarMensagemReceita(
      'Documento gerado, mas o HTML não foi retornado.',
      'erro'
    );
    return;
  }

  mostrarMensagemReceita(
    'Documento gerado com sucesso. Abrindo em nova aba...',
    'sucesso'
  );

  const win = window.open('', '_blank');
  if (!win) {
    alert(
      'Não foi possível abrir a nova aba. Verifique se o bloqueador de pop-up está ativo.'
    );
    return;
  }

  win.document.open();
  win.document.write(
    html +
      "<script>setTimeout(function(){window.print();},500);<\/script>"
  );
  win.document.close();
}

/* ============================
   CATÁLOGO DE MEDICAMENTOS
============================ */

/**
 * Carrega a lista de medicamentos do backend.
 */
async function carregarMedicamentos() {
  const tbody = document.getElementById('tabelaMedicamentosBody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="font-size:12px; text-align:center; padding:6px;">Carregando medicações...</td></tr>`;
  }

  const resposta = await callApi({
    action: 'Medicamentos.ListarTodos',
    payload: {},
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(' | ')) ||
      'Erro ao carregar catálogo de medicamentos.';
    console.error('Erro Medicamentos.ListarTodos:', resposta);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" style="font-size:12px; text-align:center; padding:6px; color:#c62828;">${erroTexto}</td></tr>`;
    }
    return;
  }

  cacheMedicamentos =
    (resposta.data && resposta.data.medicamentos) || [];

  aplicarFiltroMedicamentosLocal();
}

/**
 * Aplica filtro local (nome, posologia, via) sobre cacheMedicamentos.
 */
function aplicarFiltroMedicamentosLocal() {
  const inputBusca = document.getElementById('buscaMedicamento');
  const termo = inputBusca ? inputBusca.value.trim().toLowerCase() : '';

  let lista = cacheMedicamentos.slice();

  if (termo) {
    lista = lista.filter((m) => {
      const comp =
        (m.nomeMedicacao || '') +
        ' ' +
        (m.posologia || '') +
        ' ' +
        (m.quantidade || '') +
        ' ' +
        (m.viaAdministracao || '');
      return comp.toLowerCase().includes(termo);
    });
  }

  renderizarTabelaMedicamentos(lista);
}

/**
 * Renderiza tabela de medicamentos sugeridos.
 */
function renderizarTabelaMedicamentos(lista) {
  const tbody = document.getElementById('tabelaMedicamentosBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista || !lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="font-size:12px; text-align:center; padding:6px; color:#777;">Nenhum medicamento encontrado na tabela.</td></tr>`;
    return;
  }

  lista.forEach((m) => {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = m.nomeMedicacao || '';
    tr.appendChild(tdNome);

    const tdPoso = document.createElement('td');
    tdPoso.textContent = m.posologia || '';
    tr.appendChild(tdPoso);

    const tdQtd = document.createElement('td');
    tdQtd.textContent = m.quantidade || '';
    tr.appendChild(tdQtd);

    const tdVia = document.createElement('td');
    tdVia.textContent = m.viaAdministracao || '';
    tr.appendChild(tdVia);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'col-med-acoes';

    const btnInserir = document.createElement('button');
    btnInserir.type = 'button';
    btnInserir.className = 'btn primario';
    btnInserir.style.padding = '3px 8px';
    btnInserir.style.fontSize = '11px';
    btnInserir.textContent = 'Inserir';
    btnInserir.addEventListener('click', () => {
      inserirMedicamentoNaReceita(m);
    });

    tdAcoes.appendChild(btnInserir);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

/**
 * Insere um BLOCO formatado no campo de prescrição
 * com base no medicamento escolhido.
 *
 * Formato sugerido:
 *  Nome da Medicação – Posologia
 *  Qtd: X • Via: Y
 *
 * Cada medicação entra separada por uma linha em branco.
 */
function inserirMedicamentoNaReceita(med) {
  const campoTexto = document.getElementById('textoMedicamentos');
  if (!campoTexto) return;

  const linhas = [];

  // 1ª linha: Nome + Posologia
  let linha1 = '';
  if (med.nomeMedicacao) {
    linha1 += med.nomeMedicacao;
  }
  if (med.posologia) {
    if (linha1) linha1 += ' – ';
    linha1 += med.posologia;
  }
  if (linha1) {
    linhas.push(linha1);
  }

  // 2ª linha: Qtd / Via (se existirem)
  const detalhes = [];
  if (med.quantidade) {
    detalhes.push('Qtd: ' + med.quantidade);
  }
  if (med.viaAdministracao) {
    detalhes.push('Via: ' + med.viaAdministracao);
  }
  if (detalhes.length) {
    linhas.push(detalhes.join(' • '));
  }

  const bloco = linhas.join('\n');

  // Se já existe texto, adiciona uma linha em branco antes
  if (campoTexto.value && campoTexto.value.trim().length > 0) {
    if (!campoTexto.value.endsWith('\n')) {
      campoTexto.value += '\n';
    }
    campoTexto.value += '\n';
  }

  campoTexto.value += bloco;
  campoTexto.focus();

  mostrarMensagemReceita(
    'Medicação inserida na receita em bloco separado. Ajuste o texto se necessário.',
    'info'
  );
}

// -----------------------------------------------------
// Retrocompatibilidade com window.PRONTIO
// -----------------------------------------------------
try {
  const prontio = (window.PRONTIO = window.PRONTIO || {});
  prontio.pages = prontio.pages || {};
  prontio.pages.receita = {
    init: initReceitaPage,
  };
} catch (e) {
  // ambiente sem window, ignora
}
