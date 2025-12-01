// assets/js/pages/agenda.js
// Lógica específica da página Agenda
// - Carrega lista de pacientes para seleção
// - Carrega agenda do dia (TODOS os horários: livre/ocupado/bloqueado/cancelado)
// - Controla o formulário de novo agendamento / edição / cancelamento
//
// Depende de: core/api.js (callApi)

import { callApi } from "../core/api.js";

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// Cache de pacientes carregados para o select (para mostrar CPF/telefone)
let pacientesCache = [];

// Cache da agenda carregada (para filtros de status)
let slotsAtual = [];
let slotsDataAtualISO = null;

// Estado de edição de agendamento (null = modo "novo")
let editingAgendamento = null;

// -----------------------------
// Helpers de UI
// -----------------------------

function setMensagemAgenda({ tipo = "info", texto = "" }) {
  const box = qs("#mensagemAgenda");
  if (!box) return;

  if (!texto) {
    box.classList.add("is-hidden");
    box.textContent = "";
    return;
  }

  box.textContent = texto;
  box.classList.remove("is-hidden");
  box.classList.remove("mensagem-erro", "mensagem-sucesso", "mensagem-info");

  const tipoClasse =
    tipo === "erro"
      ? "mensagem-erro"
      : tipo === "sucesso"
      ? "mensagem-sucesso"
      : "mensagem-info";

  box.classList.add(tipoClasse);
}

function formatDocumento(doc) {
  if (!doc) return "—";
  return String(doc);
}

function formatTelefone(tel) {
  if (!tel) return "—";
  return String(tel);
}

// Atualiza o resumo com CPF / telefone do paciente selecionado
function atualizarResumoPacienteSelecionado() {
  const select = qs("#pacienteSelect");
  const box = qs("#pacienteResumo");
  const docSpan = qs("#pacienteResumoDocumento");
  const telSpan = qs("#pacienteResumoTelefone");

  if (!select || !box || !docSpan || !telSpan) return;

  const id = select.value;
  if (!id) {
    box.classList.add("is-hidden");
    docSpan.textContent = "—";
    telSpan.textContent = "—";
    return;
  }

  const paciente = pacientesCache.find(
    (p) => String(p.ID_Paciente) === String(id)
  );

  if (!paciente) {
    box.classList.add("is-hidden");
    docSpan.textContent = "—";
    telSpan.textContent = "—";
    return;
  }

  box.classList.remove("is-hidden");
  docSpan.textContent = formatDocumento(
    paciente.documento || paciente.cpf || paciente.CPF
  );
  telSpan.textContent = formatTelefone(
    paciente.telefone || paciente.celular || paciente.whatsapp
  );
}

// -----------------------------
// Modo de paciente (existente x novo)
// -----------------------------

function setupModoPaciente() {
  const radios = qsa('input[name="modoPaciente"]');
  const blocoExistente = qs(".bloco-paciente-existente");
  const blocoNovo = qs(".bloco-paciente-novo");
  const selectPaciente = qs("#pacienteSelect");
  const resumoBox = qs("#pacienteResumo");

  function aplicarModo(valor) {
    const modo = valor || "existente";

    if (modo === "novo") {
      blocoNovo?.classList.remove("is-hidden");
      blocoExistente?.classList.add("is-hidden");
      if (selectPaciente) {
        selectPaciente.required = false;
        selectPaciente.value = "";
      }
      if (resumoBox) {
        resumoBox.classList.add("is-hidden");
      }
    } else {
      blocoNovo?.classList.add("is-hidden");
      blocoExistente?.classList.remove("is-hidden");
      if (selectPaciente) {
        selectPaciente.required = true;
      }
      atualizarResumoPacienteSelecionado();
    }
  }

  radios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      aplicarModo(e.target.value);
    });
  });

  const selecionado = radios.find((r) => r.checked);
  aplicarModo(selecionado ? selecionado.value : "existente");
}

function selecionarModoPacienteExistente() {
  const radioExistente = qs('input[name="modoPaciente"][value="existente"]');
  if (radioExistente) {
    radioExistente.checked = true;
    radioExistente.dispatchEvent(new Event("change"));
  }
}

function getModoPacienteAtual() {
  const selecionado = qs('input[name="modoPaciente"]:checked');
  return selecionado ? selecionado.value : "existente";
}

// -----------------------------
// API helpers
// -----------------------------

async function carregarPacientesParaSelecao() {
  const select = qs("#pacienteSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Carregando pacientes...</option>`;
  pacientesCache = [];

  try {
    const resposta = await callApi({
      action: "Pacientes.ListarSelecao",
      payload: {},
    });

    console.log("Agenda: resposta Pacientes.ListarSelecao:", resposta);

    if (!resposta?.success) {
      throw new Error(
        (resposta && resposta.errors && resposta.errors[0]) ||
          "Erro ao carregar pacientes."
      );
    }

    const pacientes = resposta.data?.pacientes || [];
    pacientesCache = pacientes;

    if (!pacientes.length) {
      select.innerHTML =
        '<option value="">Nenhum paciente cadastrado</option>';
      atualizarResumoPacienteSelecionado();
      return;
    }

    select.innerHTML =
      '<option value="">Selecione um paciente...</option>' +
      pacientes
        .map(
          (p) =>
            `<option value="${p.ID_Paciente}">${p.nomeCompleto || p.nome}</option>`
        )
        .join("");

    select.addEventListener("change", () => {
      atualizarResumoPacienteSelecionado();
    });

    atualizarResumoPacienteSelecionado();
  } catch (e) {
    console.error("Agenda: erro ao carregar pacientes:", e);
    select.innerHTML =
      '<option value="">Erro ao carregar pacientes</option>';
    pacientesCache = [];
    atualizarResumoPacienteSelecionado();
  }
}

function getHojeISO() {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = String(hoje.getMonth() + 1).padStart(2, "0");
  const day = String(hoje.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// -----------------------------
// FILTRO POR STATUS (front-end)
// -----------------------------

function criarUIFiltrosStatus() {
  const tbody = qs("#tabelaAgendaBody");
  if (!tbody) return;

  const table = tbody.closest("table");
  if (!table || !table.parentElement) return;

  if (qs("#agendaFiltroStatusBar")) return;

  const container = table.parentElement;
  const bar = document.createElement("div");
  bar.id = "agendaFiltroStatusBar";
  bar.className = "agenda-filtros-status";

  bar.innerHTML = `
    <div class="agenda-filtros-status-inner">
      <label class="lbl-filtro-status">
        Filtrar por status:
        <select id="filtroStatusAgenda">
          <option value="TODOS">Todos</option>
          <option value="LIVRE">Somente livres</option>
          <option value="OCUPADO">Somente ocupados</option>
          <option value="AGENDADO">Somente AGENDADOS</option>
          <option value="CONFIRMADO">Somente CONFIRMADOS</option>
          <option value="BLOQUEADO">Somente BLOQUEADOS</option>
          <option value="CANCELADO">Somente CANCELADOS</option>
        </select>
      </label>
      <button type="button" id="btnLimparFiltroStatus" class="btn secundario btn-sm">
        Limpar
      </button>
    </div>
  `;

  container.insertBefore(bar, table);

  const select = bar.querySelector("#filtroStatusAgenda");
  const btnLimpar = bar.querySelector("#btnLimparFiltroStatus");

  if (select) {
    select.addEventListener("change", () => {
      aplicarFiltroStatusAtual();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (select) select.value = "TODOS";
      aplicarFiltroStatusAtual();
    });
  }
}

function aplicarFiltroStatusAtual() {
  const select = qs("#filtroStatusAgenda");
  const filtro = (select ? select.value : "TODOS").toUpperCase();

  // Quando "Todos" → SEMPRE mostra o array completo (inclui LIVRE)
  if (filtro === "TODOS") {
    renderTabelaSlots(slotsAtual || [], slotsDataAtualISO || "");
    return;
  }

  const slotsFiltrados = filtrarSlotsPorStatus(slotsAtual || [], filtro);
  renderTabelaSlots(slotsFiltrados, slotsDataAtualISO || "");
}

function filtrarSlotsPorStatus(slots, filtroStatus) {
  const alvo = (filtroStatus || "TODOS").toUpperCase();
  if (alvo === "TODOS") return slots;

  return slots.filter((slot) => {
    const status = String(slot.status || "").toUpperCase();
    const statusHumano = String(slot.status_humano || "").toUpperCase();

    switch (alvo) {
      case "LIVRE":
        return status === "LIVRE";
      case "OCUPADO":
        return status === "OCUPADO";
      case "AGENDADO":
        return status === "OCUPADO" && statusHumano.includes("AGEND");
      case "CONFIRMADO":
        return status === "OCUPADO" && statusHumano.includes("CONFIRM");
      case "BLOQUEADO":
        return status === "BLOQUEADO";
      case "CANCELADO":
        return status === "CANCELADO" || statusHumano.includes("CANCEL");
      default:
        return true;
    }
  });
}

// -----------------------------
// AÇÕES: PRONTUÁRIO, EDITAR, CANCELAR
// -----------------------------

function abrirProntuarioPaciente(slot, dataISO) {
  const idAgenda = slot.id_agenda || slot.idAgenda || "";
  const idPaciente =
    slot.id_paciente ||
    slot.idPaciente ||
    slot.ID_Paciente ||
    "";

  if (!idPaciente) {
    alert("Não foi possível identificar o paciente deste agendamento.");
    return;
  }

  const ctx = {
    idAgenda,
    idPaciente,
    data: dataISO || "",
    hora: slot.hora || "",
    status: slot.status_humano || slot.status || "",
    origem: "agenda->prontuario",
  };

  try {
    localStorage.setItem("PRONTIO_CTX_AGENDA_PACIENTE", JSON.stringify(ctx));
  } catch (e) {
    console.warn("Não foi possível gravar contexto da agenda no localStorage:", e);
  }

  const params = new URLSearchParams();
  params.set("idPaciente", idPaciente);
  if (idAgenda) params.set("idAgenda", idAgenda);

  window.location.href = `prontuario.html?${params.toString()}`;
}

function abrirEdicaoAgendamento(slot, dataISO) {
  const idAgenda = slot.id_agenda || slot.idAgenda || "";
  const idPacienteSlot =
    slot.id_paciente ||
    slot.idPaciente ||
    slot.ID_Paciente ||
    "";

  if (!idAgenda) {
    alert("Este slot não parece vinculado a um agendamento salvo.");
    return;
  }

  editingAgendamento = {
    idAgenda,
    idPaciente: idPacienteSlot || "",
    data: dataISO || "",
    hora: slot.hora || "",
    tipo: slot.tipo || "",
    status: slot.status_humano || slot.status || "",
    observacoes: slot.observacoes || "",
  };

  const dataConsulta = qs("#dataConsulta");
  const horaConsulta = qs("#horaConsulta");
  const tipoConsulta = qs("#tipoConsulta");
  const obsAgenda = qs("#obsAgenda");
  const selectPaciente = qs("#pacienteSelect");
  const statusConsulta = qs("#statusConsulta");

  if (dataConsulta) dataConsulta.value = dataISO || "";
  if (horaConsulta) horaConsulta.value = slot.hora || "";
  if (tipoConsulta) tipoConsulta.value = slot.tipo || "";
  if (obsAgenda) obsAgenda.value = slot.observacoes || "";

  selecionarModoPacienteExistente();
  if (selectPaciente && editingAgendamento.idPaciente) {
    selectPaciente.value = editingAgendamento.idPaciente;
    atualizarResumoPacienteSelecionado();
  }

  if (statusConsulta) {
    const statusAg = (editingAgendamento.status || "").toUpperCase();
    if (statusAg) statusConsulta.value = statusAg;
  }

  const tituloDrawer = qs("#drawerAgendaTitle");
  if (tituloDrawer) {
    tituloDrawer.textContent = "Editar agendamento";
  }

  const btnNovoAgendamento = qs("#btnNovoAgendamento");
  if (btnNovoAgendamento) {
    btnNovoAgendamento.click();
  }

  console.log("Agenda: modo edição ativado para", editingAgendamento);
}

function resetModoEdicao() {
  editingAgendamento = null;

  const tituloDrawer = qs("#drawerAgendaTitle");
  if (tituloDrawer) {
    tituloDrawer.textContent = "Novo agendamento";
  }

  const obsAgenda = qs("#obsAgenda");
  const tipoConsulta = qs("#tipoConsulta");
  const horaConsulta = qs("#horaConsulta");
  const selectPaciente = qs("#pacienteSelect");
  const statusConsulta = qs("#statusConsulta");

  if (obsAgenda) obsAgenda.value = "";
  if (tipoConsulta) tipoConsulta.value = "";
  if (horaConsulta) horaConsulta.value = "";
  if (selectPaciente) {
    selectPaciente.value = "";
  }
  if (statusConsulta) {
    if (statusConsulta.querySelector('option[value="AGENDADO"]')) {
      statusConsulta.value = "AGENDADO";
    }
  }
  atualizarResumoPacienteSelecionado();
}

/**
 * Cancela um agendamento (status = CANCELADO), mantendo o paciente
 * visível na agenda, porém marcado como cancelado.
 */
async function cancelarAgendamento(slot, dataISO) {
  const idAgenda = slot.id_agenda || slot.idAgenda || "";
  if (!idAgenda) {
    alert("Não foi possível identificar o agendamento para cancelar.");
    return;
  }

  const confirma = window.confirm(
    "Tem certeza que deseja CANCELAR esta consulta?\n\n" +
      "O horário continuará aparecendo na agenda, porém como 'Cancelado'."
  );
  if (!confirma) return;

  try {
    const resp = await callApi({
      action: "Agenda.Atualizar",
      payload: {
        idAgenda,
        status: "CANCELADO",
      },
    });

    console.log("Agenda: resposta Agenda.Atualizar (cancelar) =>", resp);

    if (!resp?.success) {
      throw new Error(
        (resp && resp.errors && resp.errors[0]) ||
          "Erro ao cancelar agendamento."
      );
    }

    setMensagemAgenda({
      tipo: "sucesso",
      texto: "Consulta cancelada com sucesso.",
    });

    await carregarAgendaPorData(dataISO);
  } catch (e) {
    console.error("Agenda: erro ao cancelar agendamento:", e);
    setMensagemAgenda({
      tipo: "erro",
      texto: "Não foi possível cancelar a consulta. Tente novamente.",
    });
  }
}

// -----------------------------
// Carregar agenda do dia
// -----------------------------

async function carregarAgendaPorData(dataISO) {
  const tbody = qs("#tabelaAgendaBody");
  const totalSpan = qs("#topbar-agenda-total");
  const confirmadosSpan = qs("#topbar-agenda-confirmados");
  const abertosSpan = qs("#topbar-agenda-abertos");
  const topbarDataSpan = qs("#topbar-agenda-data");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="linha-vazia">Carregando horários...</td>
    </tr>
  `;

  setMensagemAgenda({
    tipo: "info",
    texto: "Carregando agenda do dia...",
  });

  try {
    const resp = await callApi({
      action: "Agenda.ListSlotsOfDay",
      payload: { data: dataISO },
    });

    console.log("Agenda: resposta Agenda.ListSlotsOfDay:", resp);

    if (!resp?.success) {
      throw new Error(
        (resp && resp.errors && resp.errors[0]) ||
          "Erro ao carregar agenda do dia."
      );
    }

    const data = resp.data || {};
    let slots = data.slots || [];
    let resumo = data.resumo || {};

    // Fallback: se vier só agendamentos
    if ((!slots || slots.length === 0) && Array.isArray(data.agendamentos)) {
      console.warn(
        "Agenda: fallback - backend não retornou slots, só agendamentos. Montando slots ocupados a partir de agendamentos."
      );
      slots = data.agendamentos.map((ag) => ({
        hora: ag.horaConsulta || ag.hora || "",
        status: "OCUPADO",
        status_humano: ag.status || "Agendado",
        id_agenda: ag.idAgenda || ag.id_agenda || "",
        id_paciente: ag.idPaciente || ag.id_paciente || "",
        paciente_nome: ag.nomePaciente || "",
        tipo: ag.tipo || "",
        observacoes: ag.observacoes || "",
      }));
      resumo = {
        data: data.data || dataISO,
        total_slots: slots.length,
        ocupados: slots.length,
        livres: 0,
        primeiro_livre: null,
      };
    }

    slotsAtual = Array.isArray(slots) ? slots.slice() : [];
    slotsDataAtualISO = data.data || dataISO || null;

    if (topbarDataSpan && slotsDataAtualISO) {
      topbarDataSpan.textContent = slotsDataAtualISO
        .split("-")
        .reverse()
        .join("/");
    }

    aplicarFiltroStatusAtual();

    const total =
      resumo.total_slots != null ? resumo.total_slots : slotsAtual.length;
    const ocupados =
      resumo.ocupados != null
        ? resumo.ocupados
        : slotsAtual.filter((s) => s.status === "OCUPADO").length;
    const livres =
      resumo.livres != null
        ? resumo.livres
        : slotsAtual.filter((s) => s.status === "LIVRE").length;

    if (totalSpan) totalSpan.textContent = String(total);
    if (confirmadosSpan) confirmadosSpan.textContent = String(ocupados);
    if (abertosSpan) abertosSpan.textContent = String(livres);

    setMensagemAgenda({
      tipo: "sucesso",
      texto: `Agenda carregada: ${total} horário(s), ${ocupados} ocupado(s), ${livres} livre(s).`,
    });
  } catch (e) {
    console.error("Agenda: erro ao carregar agenda do dia:", e);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="linha-vazia">
          Erro ao carregar agenda para esta data.
        </td>
      </tr>
    `;
    setMensagemAgenda({
      tipo: "erro",
      texto: "Erro ao carregar a agenda. Tente novamente.",
    });
  }
}

/**
 * Monta a tabela da agenda com TODOS os horários (já filtrados)
 */
function renderTabelaSlots(slots, dataISO) {
  const tbody = qs("#tabelaAgendaBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!slots || !slots.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="linha-vazia">
          Nenhum horário configurado para esta combinação de filtros.
        </td>
      </tr>
    `;
    return;
  }

  slots.forEach((slot) => {
    const tr = document.createElement("tr");
    tr.dataset.hora = slot.hora || "";

    const tdHora = document.createElement("td");
    const tdPaciente = document.createElement("td");
    const tdTipo = document.createElement("td");
    const tdStatus = document.createElement("td");
    const tdObs = document.createElement("td"); // <- AQUI estava o erro de sintaxe
    const tdAcoes = document.createElement("td");

    tdHora.textContent = slot.hora || "--:--";

    const statusCode = (slot.status || "").toUpperCase();
    const statusHuman = (slot.status_humano || "").toUpperCase();
    const isCancelado =
      statusCode === "CANCELADO" || statusHuman.includes("CANCEL");
    const isBloqueado =
      statusCode === "BLOQUEADO" || statusHuman.includes("BLOQUE");
    const isOcupado = statusCode === "OCUPADO" && !isCancelado && !isBloqueado;

    if (isOcupado) {
      tdPaciente.textContent = slot.paciente_nome || "—";
      tdTipo.textContent = slot.tipo || "";
      tdStatus.textContent = slot.status_humano || "Agendado";
      tdObs.textContent = slot.observacoes || "";

      const btnProntuario = document.createElement("button");
      btnProntuario.type = "button";
      btnProntuario.className = "btn primario";
      btnProntuario.textContent = "Prontuário";
      btnProntuario.addEventListener("click", () => {
        abrirProntuarioPaciente(slot, dataISO);
      });

      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.className = "btn secundario";
      btnEditar.textContent = "Editar";
      btnEditar.addEventListener("click", () => {
        abrirEdicaoAgendamento(slot, dataISO);
      });

      const btnCancelar = document.createElement("button");
      btnCancelar.type = "button";
      btnCancelar.className = "btn perigo btn-sm";
      btnCancelar.textContent = "Cancelar";
      btnCancelar.addEventListener("click", () => {
        cancelarAgendamento(slot, dataISO);
      });

      tdAcoes.appendChild(btnProntuario);
      tdAcoes.appendChild(btnEditar);
      tdAcoes.appendChild(btnCancelar);

      tr.classList.add("slot-ocupado");
    } else if (isCancelado) {
      tdPaciente.textContent = slot.paciente_nome || "—";
      tdTipo.textContent = slot.tipo || "";
      tdStatus.textContent = slot.status_humano || "Cancelado";
      tdObs.textContent = slot.observacoes || "";

      // Risco VISUAL direto via JS (independe de CSS)
      [tdPaciente, tdTipo, tdStatus, tdObs].forEach((td) => {
        td.style.textDecoration = "line-through";
        td.style.color = "#9ca3af";
      });

      const btnProntuario = document.createElement("button");
      btnProntuario.type = "button";
      btnProntuario.className = "btn secundario btn-sm";
      btnProntuario.textContent = "Prontuário";
      btnProntuario.addEventListener("click", () => {
        abrirProntuarioPaciente(slot, dataISO);
      });

      tdAcoes.appendChild(btnProntuario);

      tr.classList.add("slot-cancelado");
    } else if (isBloqueado) {
      tdPaciente.textContent = "—";
      tdTipo.textContent = "Bloqueado";
      tdStatus.textContent = slot.status_humano || "Bloqueado";
      tdObs.textContent = slot.observacoes || "";

      tr.classList.add("slot-bloqueado");
    } else {
      // LIVRE
      tdPaciente.textContent = "—";
      tdTipo.textContent = "—";
      tdStatus.textContent = "Livre";
      tdObs.textContent = "";

      const btnAgendar = document.createElement("button");
      btnAgendar.type = "button";
      btnAgendar.className = "btn primario";
      btnAgendar.textContent = "Agendar aqui";
      btnAgendar.addEventListener("click", () => {
        abrirDrawerNovoAgendamento(slot.hora, dataISO);
      });
      tdAcoes.appendChild(btnAgendar);

      tr.classList.add("slot-livre");
    }

    tr.appendChild(tdHora);
    tr.appendChild(tdPaciente);
    tr.appendChild(tdTipo);
    tr.appendChild(tdStatus);
    tr.appendChild(tdObs);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

/**
 * Novo agendamento: limpa modo edição e abre drawer na data/hora
 */
function abrirDrawerNovoAgendamento(hora, dataISO) {
  const inputData = qs("#dataConsulta");
  const inputHora = qs("#horaConsulta");

  resetModoEdicao();

  if (inputData && dataISO) {
    inputData.value = dataISO;
  }
  if (inputHora && hora) {
    inputHora.value = hora;
  }

  const btnNovoAgendamento = qs("#btnNovoAgendamento");
  if (btnNovoAgendamento) {
    btnNovoAgendamento.click();
  }
}

// -----------------------------
// Salvar (criar ou atualizar) agendamento
// -----------------------------

async function salvarNovoAgendamento(event) {
  event.preventDefault();

  const modo = getModoPacienteAtual();

  const selectPaciente = qs("#pacienteSelect");
  const nomeNovo = qs("#novoPacienteNome");
  const nascimentoNovo = qs("#novoPacienteNascimento");
  const telefoneNovo = qs("#novoPacienteTelefone");
  const documentoNovo = qs("#novoPacienteDocumento");
  const emailNovo = qs("#novoPacienteEmail");
  const sexoNovo = qs("#novoPacienteSexo");
  const cidadeNova = qs("#novoPacienteCidade");
  const bairroNovo = qs("#novoPacienteBairro");
  const profissaoNova = qs("#novoPacienteProfissao");
  const planoSaudeNovo = qs("#novoPacientePlanoSaude");

  const dataConsulta = qs("#dataConsulta");
  const horaConsulta = qs("#horaConsulta");
  const tipoConsulta = qs("#tipoConsulta");
  const obsAgenda = qs("#obsAgenda");
  const statusConsulta = qs("#statusConsulta");

  if (!dataConsulta?.value || !horaConsulta?.value) {
    setMensagemAgenda({
      tipo: "erro",
      texto: "Preencha data e hora da consulta.",
    });
    return;
  }

  let idPacienteFinal = null;

  try {
    if (editingAgendamento) {
      idPacienteFinal =
        (selectPaciente && selectPaciente.value) ||
        editingAgendamento.idPaciente ||
        "";
      if (!idPacienteFinal) {
        setMensagemAgenda({
          tipo: "erro",
          texto: "Não foi possível identificar o paciente para edição.",
        });
        return;
      }
    } else if (modo === "existente") {
      if (!selectPaciente?.value) {
        setMensagemAgenda({
          tipo: "erro",
          texto: "Selecione um paciente já cadastrado.",
        });
        return;
      }
      idPacienteFinal = selectPaciente.value;
    } else {
      if (!nomeNovo?.value.trim()) {
        setMensagemAgenda({
          tipo: "erro",
          texto: "Informe o nome do novo paciente.",
        });
        return;
      }

      const payloadNovoPaciente = {
        nomeCompleto: nomeNovo.value.trim(),
        dataNascimento: nascimentoNovo?.value || "",
        telefone: telefoneNovo?.value || "",
        documento: documentoNovo?.value || "",
        email: emailNovo?.value || "",
        planoSaude: planoSaudeNovo?.value || "",
        sexo: sexoNovo?.value || "",
        cidade: cidadeNova?.value || "",
        bairro: bairroNovo?.value || "",
        profissao: profissaoNova?.value || "",
      };

      const respPaciente = await callApi({
        action: "Pacientes.CriarBasico",
        payload: payloadNovoPaciente,
      });

      console.log("Agenda: resposta Pacientes.CriarBasico:", respPaciente);

      if (!respPaciente?.success) {
        throw new Error(
          (respPaciente &&
            respPaciente.errors &&
            respPaciente.errors[0]) ||
            "Erro ao cadastrar novo paciente."
        );
      }

      const idPaciente =
        respPaciente.data?.ID_Paciente || respPaciente.data?.idPaciente;

      if (!idPaciente) {
        throw new Error(
          "Backend não retornou ID_Paciente ao criar novo paciente."
        );
      }

      idPacienteFinal = idPaciente;

      await carregarPacientesParaSelecao();
      if (selectPaciente) {
        selectPaciente.value = idPacienteFinal;
        atualizarResumoPacienteSelecionado();
      }
    }

    const payloadAgendaBase = {
      idPaciente: idPacienteFinal,
      data: dataConsulta.value,
      hora: horaConsulta.value,
      tipo: tipoConsulta?.value || "",
      obs: obsAgenda?.value || "",
    };

    if (statusConsulta && statusConsulta.value) {
      payloadAgendaBase.status = statusConsulta.value;
    }

    let respAgenda;
    if (editingAgendamento && editingAgendamento.idAgenda) {
      const payloadEdicao = {
        idAgenda: editingAgendamento.idAgenda,
        ...payloadAgendaBase,
      };

      respAgenda = await callApi({
        action: "Agenda.Atualizar",
        payload: payloadEdicao,
      });

      console.log("Agenda: resposta Agenda.Atualizar:", respAgenda);
    } else {
      respAgenda = await callApi({
        action: "Agenda.Criar",
        payload: payloadAgendaBase,
      });

      console.log("Agenda: resposta Agenda.Criar:", respAgenda);
    }

    if (!respAgenda?.success) {
      throw new Error(
        (respAgenda && respAgenda.errors && respAgenda.errors[0]) ||
          "Erro ao salvar agendamento."
      );
    }

    setMensagemAgenda({
      tipo: "sucesso",
      texto: editingAgendamento
        ? "Agendamento atualizado com sucesso."
        : "Agendamento salvo com sucesso.",
    });

    if (obsAgenda) obsAgenda.value = "";

    const dataFiltro = qs("#dataFiltro");
    const dataParaRecarregar = dataConsulta.value;

    if (dataFiltro && dataParaRecarregar) {
      dataFiltro.value = dataParaRecarregar;
    }

    resetModoEdicao();
    await carregarAgendaPorData(dataParaRecarregar);
  } catch (e) {
    console.error("Agenda: erro ao salvar agendamento:", e);
    setMensagemAgenda({
      tipo: "erro",
      texto:
        "Não foi possível salvar o agendamento. Verifique os dados (inclusive se há conflito de horário) e tente novamente.",
    });
  }
}

// -----------------------------
// Inicialização da página
// -----------------------------

export function initAgendaPage() {
  console.log("Agenda: initAgendaPage chamado.");

  const hojeISO = getHojeISO();

  const dataFiltro = qs("#dataFiltro");
  if (dataFiltro) {
    dataFiltro.value = hojeISO;
  }

  const dataConsulta = qs("#dataConsulta");
  if (dataConsulta) {
    dataConsulta.value = hojeISO;
  }

  const topbarDataSpan = qs("#topbar-agenda-data");
  if (topbarDataSpan) {
    topbarDataSpan.textContent = hojeISO.split("-").reverse().join("/");
  }

  const btnCarregarAgenda = qs("#btnCarregarAgenda");
  if (btnCarregarAgenda && dataFiltro) {
    btnCarregarAgenda.addEventListener("click", () => {
      if (!dataFiltro.value) return;
      carregarAgendaPorData(dataFiltro.value);
    });
  }

  setupModoPaciente();
  const formAgenda = qs("#formAgenda");
  if (formAgenda) {
    formAgenda.addEventListener("submit", salvarNovoAgendamento);
  }

  criarUIFiltrosStatus();
  carregarPacientesParaSelecao();
  carregarAgendaPorData(hojeISO);
}
