// assets/js/pages/prontuario.js
// Página de prontuário do paciente
// - Lê idPaciente / idAgenda da URL e do localStorage
// - Mostra informações do agendamento (data/hora/status)
// - Lista evoluções ligadas a esse agendamento (Evolucao.ListarPorAgenda)
// - Permite salvar nova evolução (Evolucao.Salvar)
// - Opcional: carrega histórico completo do paciente (Evolucao.ListarPorPaciente)

import { callApi } from "../core/api.js";

function qs(sel) {
  return document.querySelector(sel);
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function getQueryParams() {
  const params = new URLSearchParams(window.location.search || "");
  const obj = {};
  params.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

function setMensagemEvolucao({ tipo = "info", texto = "" }) {
  const box = qs("#mensagemEvolucao");
  if (!box) return;

  if (!texto) {
    box.classList.add("is-hidden");
    box.textContent = "";
    return;
  }

  box.textContent = texto;
  box.classList.remove("is-hidden");
  box.classList.remove("mensagem-erro", "mensagem-sucesso", "mensagem-info");

  const classe =
    tipo === "erro"
      ? "mensagem-erro"
      : tipo === "sucesso"
      ? "mensagem-sucesso"
      : "mensagem-info";

  box.classList.add(classe);
}

// -----------------------------
// CONTEXTO (URL + localStorage)
// -----------------------------

function carregarContextoProntuario() {
  const params = getQueryParams();
  let ctxStorage = null;

  try {
    const raw = localStorage.getItem("PRONTIO_CTX_AGENDA_PACIENTE");
    if (raw) ctxStorage = JSON.parse(raw);
  } catch (e) {
    console.warn("Prontuário: erro ao ler contexto do localStorage", e);
  }

  const contexto = {
    idPaciente: params.idPaciente || ctxStorage?.idPaciente || "",
    idAgenda: params.idAgenda || ctxStorage?.idAgenda || "",
    data: ctxStorage?.data || "",
    hora: ctxStorage?.hora || "",
    status: ctxStorage?.status || "",
  };

  return contexto;
}

function aplicarContextoNaUI(contexto) {
  const spanNome = qs("#prontuario-paciente-nome");
  const spanId = qs("#prontuario-paciente-id");
  const spanData = qs("#info-agenda-data");
  const spanHora = qs("#info-agenda-hora");
  const spanStatus = qs("#info-agenda-status");
  const spanIdAgenda = qs("#info-agenda-id");
  const topbarMetaContext = qs("#topbar-meta-context");

  if (spanId) {
    spanId.textContent = contexto.idPaciente
      ? `ID Paciente: ${contexto.idPaciente}`
      : "ID Paciente: —";
  }

  if (spanNome && !spanNome.textContent.trim()) {
    spanNome.textContent = "Paciente";
  }

  if (spanData) {
    spanData.textContent = contexto.data
      ? contexto.data.split("-").reverse().join("/")
      : "—";
  }
  if (spanHora) {
    spanHora.textContent = contexto.hora || "—";
  }
  if (spanStatus) {
    spanStatus.textContent = contexto.status || "—";
  }
  if (spanIdAgenda) {
    spanIdAgenda.textContent = contexto.idAgenda || "—";
  }

  if (topbarMetaContext && contexto.idPaciente) {
    topbarMetaContext.textContent = `Paciente #${contexto.idPaciente}`;
  }
}

// -----------------------------
// LISTAGEM DE EVOLUÇÕES
// -----------------------------

function renderListaEvolucoes(lista, ulElement, emptyElement) {
  if (!ulElement || !emptyElement) return;

  ulElement.innerHTML = "";

  if (!lista || !lista.length) {
    emptyElement.classList.remove("is-hidden");
    return;
  }

  emptyElement.classList.add("is-hidden");

  lista.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "evolucao-item";

    const dataHora =
      ev.dataHoraRegistro || ev.dataHora || ev.data || "";
    const autor = ev.autor || ev.profissional || "";
    const origem = ev.origem || "";

    let dataHoraFmt = dataHora;
    if (dataHora && dataHora.includes("T")) {
      const [d, t] = dataHora.split("T");
      const [ano, mes, dia] = d.split("-");
      const hhmm = t.substring(0, 5);
      dataHoraFmt = `${dia}/${mes}/${ano} ${hhmm}`;
    }

    li.innerHTML = `
      <div class="evo-header">
        <span class="evo-data">${dataHoraFmt || "Data/Hora não informada"}</span>
        ${
          autor
            ? `<span class="evo-autor">${autor}</span>`
            : ""
        }
        ${
          origem
            ? `<span class="evo-origem badge">${origem}</span>`
            : ""
        }
      </div>
      <div class="evo-texto">${(ev.texto || "").replace(/\n/g, "<br>")}</div>
    `;

    ulElement.appendChild(li);
  });
}

async function carregarEvolucoesDoAtendimento(contexto) {
  const ul = qs("#listaEvolucoes");
  const vazio = qs("#listaEvolucoesVazia");
  if (!ul || !vazio) return;

  if (!contexto.idAgenda) {
    vazio.textContent =
      "Nenhum ID de agendamento informado. Este prontuário não está vinculado a um atendimento específico.";
    vazio.classList.remove("is-hidden");
    ul.innerHTML = "";
    return;
  }

  vazio.textContent = "Carregando evoluções...";
  vazio.classList.remove("is-hidden");
  ul.innerHTML = "";

  try {
    const resp = await callApi({
      action: "Evolucao.ListarPorAgenda",
      payload: { idAgenda: contexto.idAgenda },
    });

    console.log("Prontuário: Evolucao.ListarPorAgenda =>", resp);

    if (!resp?.success) {
      throw new Error(
        (resp && resp.errors && resp.errors[0]) ||
          "Erro ao carregar evoluções."
      );
    }

    const evolucoes = resp.data?.evolucoes || [];
    renderListaEvolucoes(evolucoes, ul, vazio);

    if (!evolucoes.length) {
      vazio.textContent =
        "Nenhuma evolução encontrada para este agendamento.";
    }
  } catch (e) {
    console.error("Prontuário: erro ao carregar evoluções do atendimento:", e);
    vazio.textContent =
      "Erro ao carregar evoluções deste atendimento. Tente novamente.";
    vazio.classList.remove("is-hidden");
  }
}

async function carregarHistoricoCompletoPaciente(contexto) {
  const ul = qs("#listaEvolucoesPaciente");
  const vazio = qs("#listaEvolucoesPacienteVazia");
  if (!ul || !vazio) return;

  if (!contexto.idPaciente) {
    vazio.textContent =
      "Não é possível carregar histórico: ID do paciente não informado.";
    vazio.classList.remove("is-hidden");
    ul.innerHTML = "";
    return;
  }

  vazio.textContent = "Carregando histórico...";
  vazio.classList.remove("is-hidden");
  ul.innerHTML = "";

  try {
    const resp = await callApi({
      action: "Evolucao.ListarPorPaciente",
      payload: { idPaciente: contexto.idPaciente },
    });

    console.log("Prontuário: Evolucao.ListarPorPaciente =>", resp);

    if (!resp?.success) {
      throw new Error(
        (resp && resp.errors && resp.errors[0]) ||
          "Erro ao carregar histórico do paciente."
      );
    }

    const evolucoes = resp.data?.evolucoes || [];
    renderListaEvolucoes(evolucoes, ul, vazio);

    if (!evolucoes.length) {
      vazio.textContent =
        "Nenhuma evolução encontrada para este paciente.";
    }
  } catch (e) {
    console.error("Prontuário: erro ao carregar histórico do paciente:", e);
    vazio.textContent =
      "Erro ao carregar histórico do paciente. Tente novamente.";
    vazio.classList.remove("is-hidden");
  }
}

// -----------------------------
// SALVAR EVOLUÇÃO
// -----------------------------

async function salvarEvolucao(contexto, event) {
  event.preventDefault();

  const textarea = qs("#textoEvolucao");
  if (!textarea || !textarea.value.trim()) {
    setMensagemEvolucao({
      tipo: "erro",
      texto: "Digite o texto da evolução antes de salvar.",
    });
    return;
  }

  if (!contexto.idPaciente) {
    setMensagemEvolucao({
      tipo: "erro",
      texto:
        "ID do paciente não informado. Não é possível salvar evolução.",
    });
    return;
  }

  try {
    setMensagemEvolucao({
      tipo: "info",
      texto: "Salvando evolução...",
    });

    const payload = {
      idPaciente: contexto.idPaciente,
      idAgenda: contexto.idAgenda || "",
      texto: textarea.value.trim(),
      dataReferencia: contexto.data || "",
      horaReferencia: contexto.hora || "",
      origem: "PRONTUARIO",
    };

    const resp = await callApi({
      action: "Evolucao.Salvar",
      payload,
    });

    console.log("Prontuário: Evolucao.Salvar =>", resp);

    if (!resp?.success) {
      throw new Error(
        (resp && resp.errors && resp.errors[0]) ||
          "Erro ao salvar evolução."
      );
    }

    setMensagemEvolucao({
      tipo: "sucesso",
      texto: "Evolução salva com sucesso.",
    });
    textarea.value = "";

    await carregarEvolucoesDoAtendimento(contexto);
  } catch (e) {
    console.error("Prontuário: erro ao salvar evolução:", e);
    setMensagemEvolucao({
      tipo: "erro",
      texto:
        "Não foi possível salvar a evolução. Verifique os dados e tente novamente.",
    });
  }
}

// -----------------------------
// Inicialização (chamada pelo main.js)
// -----------------------------

export function initProntuarioPage() {
  console.log("Prontuário: initProntuarioPage");

  const contexto = carregarContextoProntuario();
  aplicarContextoNaUI(contexto);

  const formEvo = qs("#formEvolucao");
  if (formEvo) {
    formEvo.addEventListener("submit", (ev) =>
      salvarEvolucao(contexto, ev)
    );
  }

  const btnHistorico = qs("#btnCarregarHistoricoPaciente");
  if (btnHistorico) {
    btnHistorico.addEventListener("click", () =>
      carregarHistoricoCompletoPaciente(contexto)
    );
  }

  carregarEvolucoesDoAtendimento(contexto);
}
