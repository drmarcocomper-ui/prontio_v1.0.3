// assets/js/agenda.js
// Front-end da Agenda PRONTIO
// - Carrega lista de pacientes (Pacientes.ListarTodos) para o select
// - Cria agendamentos (Agenda.Criar)
// - Lista agendamentos por data (Agenda.ListarPorData)
// - Permite abrir prontuário direto da agenda

document.addEventListener("DOMContentLoaded", () => {
  const formAgenda = document.getElementById("formAgenda");
  const btnCarregarAgenda = document.getElementById("btnCarregarAgenda");

  if (formAgenda) {
    formAgenda.addEventListener("submit", async (event) => {
      event.preventDefault();
      await salvarAgendamento();
    });
  }

  if (btnCarregarAgenda) {
    btnCarregarAgenda.addEventListener("click", async () => {
      await carregarAgendaPorData();
    });
  }

  // Define data de hoje como padrão nos campos de data
  const hoje = new Date();
  const yyyy = hoje.getFullYear();
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const dd = String(hoje.getDate()).padStart(2, "0");
  const hojeStr = `${yyyy}-${mm}-${dd}`;

  const inputDataConsulta = document.getElementById("dataConsulta");
  const inputDataFiltro = document.getElementById("dataFiltro");

  if (inputDataConsulta && !inputDataConsulta.value) {
    inputDataConsulta.value = hojeStr;
  }
  if (inputDataFiltro && !inputDataFiltro.value) {
    inputDataFiltro.value = hojeStr;
  }

  // Carrega pacientes para o select
  carregarPacientesNoSelect();

  // Carrega agenda do dia
  carregarAgendaPorData();
});

function mostrarMensagemAgenda(texto, tipo = "info") {
  const div = document.getElementById("mensagemAgenda");
  if (!div) return;

  div.textContent = texto || "";
  if (!texto) {
    div.style.display = "none";
    return;
  }

  div.style.display = "block";

  // Reseta classes básicas
  div.className = "mensagem";

  // Aplica classe conforme tipo, usando estilos do layout.css
  switch (tipo) {
    case "sucesso":
      div.classList.add("mensagem-sucesso");
      break;
    case "erro":
      div.classList.add("mensagem-erro");
      break;
    default:
      div.classList.add("mensagem-info");
      break;
  }
}

async function carregarPacientesNoSelect() {
  const select = document.getElementById("pacienteSelect");
  if (!select) return;

  select.innerHTML = "<option value=''>Carregando pacientes...</option>";

  const resposta = await callApi({
    action: "Pacientes.ListarTodos",
    payload: {},
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao carregar pacientes.";
    mostrarMensagemAgenda(erroTexto, "erro");
    select.innerHTML = "<option value=''>Erro ao carregar pacientes</option>";
    return;
  }

  const pacientes = (resposta.data && resposta.data.pacientes) || [];

  if (pacientes.length === 0) {
    select.innerHTML = "<option value=''>Nenhum paciente cadastrado</option>";
    return;
  }

  // Mantém apenas pacientes ativos
  const ativos = pacientes.filter((p) => p.ativo);

  if (ativos.length === 0) {
    select.innerHTML = "<option value=''>Nenhum paciente ativo</option>";
    return;
  }

  // Tenta pré-selecionar o paciente atual do prontuário, se existir
  const idAtual = localStorage.getItem("prontio_pacienteAtualId") || "";

  select.innerHTML = "<option value=''>Selecione um paciente...</option>";

  ativos.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.idPaciente;
    opt.textContent = p.nomeCompleto;
    if (idAtual && idAtual === p.idPaciente) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

async function salvarAgendamento() {
  const pacienteSelect = document.getElementById("pacienteSelect");
  const dataConsulta = document.getElementById("dataConsulta")
    ? document.getElementById("dataConsulta").value
    : "";
  const horaConsulta = document.getElementById("horaConsulta")
    ? document.getElementById("horaConsulta").value
    : "";
  const tipoConsulta = document.getElementById("tipoConsulta")
    ? document.getElementById("tipoConsulta").value
    : "";
  const obsAgenda = document.getElementById("obsAgenda")
    ? document.getElementById("obsAgenda").value.trim()
    : "";

  if (!pacienteSelect) {
    mostrarMensagemAgenda("Campo de paciente não encontrado na tela.", "erro");
    return;
  }

  const idPaciente = pacienteSelect.value;
  const nomePaciente = pacienteSelect.options[pacienteSelect.selectedIndex]
    ? pacienteSelect.options[pacienteSelect.selectedIndex].textContent
    : "";

  if (!idPaciente) {
    mostrarMensagemAgenda("Selecione um paciente.", "erro");
    return;
  }

  if (!dataConsulta) {
    mostrarMensagemAgenda("Informe a data da consulta.", "erro");
    return;
  }

  if (!horaConsulta) {
    mostrarMensagemAgenda("Informe a hora da consulta.", "erro");
    return;
  }

  mostrarMensagemAgenda("Salvando agendamento...", "info");

  const resposta = await callApi({
    action: "Agenda.Criar",
    payload: {
      idPaciente,
      dataConsulta, // yyyy-mm-dd
      horaConsulta, // HH:MM
      tipo: tipoConsulta,
      observacoes: obsAgenda,
    },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao salvar agendamento.";
    mostrarMensagemAgenda(erroTexto, "erro");
    return;
  }

  mostrarMensagemAgenda("Agendamento salvo com sucesso!", "sucesso");

  // Limpa apenas observações e tipo (deixa data/hora e paciente)
  const obsEl = document.getElementById("obsAgenda");
  const tipoEl = document.getElementById("tipoConsulta");
  if (obsEl) obsEl.value = "";
  if (tipoEl) tipoEl.value = "";

  // Atualiza dataFiltro com a data da consulta e recarrega agenda
  const dataFiltroEl = document.getElementById("dataFiltro");
  if (dataFiltroEl) {
    dataFiltroEl.value = dataConsulta;
  }
  await carregarAgendaPorData();
}

async function carregarAgendaPorData() {
  const dataFiltroEl = document.getElementById("dataFiltro");
  const dataFiltro = dataFiltroEl ? dataFiltroEl.value : "";

  if (!dataFiltro) {
    mostrarMensagemAgenda("Informe uma data para carregar a agenda.", "erro");
    return;
  }

  mostrarMensagemAgenda("Carregando agenda...", "info");

  const resposta = await callApi({
    action: "Agenda.ListarPorData",
    payload: {
      dataConsulta: dataFiltro, // yyyy-mm-dd
    },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao carregar agenda.";
    mostrarMensagemAgenda(erroTexto, "erro");
    return;
  }

  const agendamentos = (resposta.data && resposta.data.agendamentos) || [];

  const tbody = document.getElementById("tabelaAgendaBody");
  if (!tbody) {
    mostrarMensagemAgenda("Tabela da agenda não encontrada na tela.", "erro");
    return;
  }

  tbody.innerHTML = "";

  if (agendamentos.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Nenhum agendamento para esta data.";
    td.className = "linha-vazia";
    tr.appendChild(td);
    tbody.appendChild(tr);

    mostrarMensagemAgenda("Agenda carregada: 0 itens.", "sucesso");
    return;
  }

  agendamentos.forEach((ag) => {
    const tr = document.createElement("tr");

    const tdHora = document.createElement("td");
    tdHora.textContent = ag.horaConsulta || "";
    tr.appendChild(tdHora);

    const tdPaciente = document.createElement("td");
    tdPaciente.textContent = ag.nomePaciente || `(ID: ${ag.idPaciente || ""})`;
    tr.appendChild(tdPaciente);

    const tdTipo = document.createElement("td");
    tdTipo.textContent = ag.tipo || "";
    tr.appendChild(tdTipo);

    const tdStatus = document.createElement("td");
    tdStatus.textContent = ag.status || "";
    tr.appendChild(tdStatus);

    const tdObs = document.createElement("td");
    tdObs.textContent = ag.observacoes || "";
    tr.appendChild(tdObs);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "acoes-agenda";

    const btnProntuario = document.createElement("button");
    btnProntuario.type = "button";
    btnProntuario.textContent = "Prontuário";
    btnProntuario.className = "btn secundario";

    btnProntuario.addEventListener("click", () => {
      if (ag.idPaciente) {
        localStorage.setItem("prontio_pacienteAtualId", ag.idPaciente);
      }
      if (ag.idAgenda) {
        localStorage.setItem("prontio_agendaAtualId", ag.idAgenda);
      }
      window.location.href = "prontuario.html";
    });

    tdAcoes.appendChild(btnProntuario);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });

  mostrarMensagemAgenda(
    `Agenda carregada: ${agendamentos.length} item(s).`,
    "sucesso"
  );
}
