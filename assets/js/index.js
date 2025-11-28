// assets/js/index.js
// Tela inicial (index) = Lista de Atendimento
// Mostra todos os agendamentos do dia de hoje para frente,
// ordenados por data e hora, usando a ação de API: Agenda.ListarAFuturo

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("tabelaAtendimentoBody");
  const mensagemEl = document.getElementById("mensagemListaAtendimento");
  const btnRecarregar = document.getElementById("btnRecarregarLista");
  const infoUltimaAtualizacao = document.getElementById("infoUltimaAtualizacao");

  function formatarDataBR(dataYMD) {
    if (!dataYMD || typeof dataYMD !== "string") return "";
    const partes = dataYMD.split("-");
    if (partes.length !== 3) return dataYMD;
    const [yyyy, mm, dd] = partes;
    return `${dd}/${mm}/${yyyy}`;
  }

  function atualizarMensagem(texto, tipo) {
    if (!mensagemEl) return;

    if (!texto) {
      mensagemEl.style.display = "none";
      return;
    }

    mensagemEl.style.display = "block";
    mensagemEl.textContent = texto;

    // Limpa classes e aplica o tipo
    mensagemEl.className = "mensagem";
    if (tipo === "sucesso") {
      mensagemEl.classList.add("mensagem-sucesso");
    } else if (tipo === "erro") {
      mensagemEl.classList.add("mensagem-erro");
    } else {
      mensagemEl.classList.add("mensagem-info");
    }
  }

  function criarBadgeStatus(status) {
    const span = document.createElement("span");
    span.classList.add("badge-status");

    if (!status) {
      span.textContent = "N/A";
      span.classList.add("badge-outro");
      return span;
    }

    const s = String(status).toUpperCase();

    span.textContent = status;

    if (s === "AGENDADO") {
      span.classList.add("badge-agendado");
    } else if (s === "CONFIRMADO") {
      span.classList.add("badge-confirmado");
    } else if (s === "CANCELADO") {
      span.classList.add("badge-cancelado");
    } else if (s === "FALTOU") {
      span.classList.add("badge-faltou");
    } else {
      span.classList.add("badge-outro");
    }

    return span;
  }

  function limparTabela() {
    if (!tbody) return;
    tbody.innerHTML = "";
  }

  function renderizarLinhas(agendamentos) {
    limparTabela();

    if (!tbody) return;

    if (!agendamentos || agendamentos.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.classList.add("linha-vazia");
      td.textContent = "Nenhum atendimento agendado a partir de hoje.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    agendamentos.forEach((ag) => {
      const tr = document.createElement("tr");

      const tdData = document.createElement("td");
      tdData.classList.add("col-data");
      tdData.textContent = formatarDataBR(ag.dataConsulta || "");
      tr.appendChild(tdData);

      const tdHora = document.createElement("td");
      tdHora.classList.add("col-hora");
      tdHora.textContent = ag.horaConsulta || "";
      tr.appendChild(tdHora);

      const tdPaciente = document.createElement("td");
      tdPaciente.classList.add("col-paciente");
      tdPaciente.textContent = ag.nomePaciente || "";
      tr.appendChild(tdPaciente);

      const tdTipo = document.createElement("td");
      tdTipo.classList.add("col-tipo");
      tdTipo.textContent = ag.tipo || "";
      tr.appendChild(tdTipo);

      const tdStatus = document.createElement("td");
      tdStatus.classList.add("col-status");
      tdStatus.appendChild(criarBadgeStatus(ag.status));
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    });
  }

  async function carregarListaAtendimento() {
    atualizarMensagem("Carregando lista de atendimento...", "info");
    limparTabela();
    if (btnRecarregar) btnRecarregar.disabled = true;

    try {
      const resposta = await callApi({
        action: "Agenda.ListarAFuturo",
        payload: {},
      });

      if (!resposta || !resposta.success) {
        const msgErro =
          (resposta && resposta.errors && resposta.errors.join(" | ")) ||
          "Erro ao carregar lista de atendimento.";
        atualizarMensagem(msgErro, "erro");
        return;
      }

      const agendamentos =
        (resposta.data && resposta.data.agendamentos) || [];

      renderizarLinhas(agendamentos);

      const qtd = agendamentos.length;
      const msgInfo =
        qtd === 0
          ? "Nenhum atendimento agendado a partir de hoje."
          : `Encontrado(s) ${qtd} atendimento(s) do dia de hoje para frente.`;
      atualizarMensagem(msgInfo, "sucesso");

      if (infoUltimaAtualizacao) {
        const agora = new Date();
        const dd = String(agora.getDate()).padStart(2, "0");
        const mm = String(agora.getMonth() + 1).padStart(2, "0");
        const yyyy = agora.getFullYear();
        const hh = String(agora.getHours()).padStart(2, "0");
        const min = String(agora.getMinutes()).padStart(2, "0");
        infoUltimaAtualizacao.textContent = `Atualizado em ${dd}/${mm}/${yyyy} às ${hh}:${min}`;
      }
    } catch (erro) {
      console.error("Erro ao carregar Lista de Atendimento:", erro);
      atualizarMensagem(
        "Falha na comunicação com o servidor. Verifique sua conexão ou tente novamente.",
        "erro"
      );
    } finally {
      if (btnRecarregar) btnRecarregar.disabled = false;
    }
  }

  if (btnRecarregar) {
    btnRecarregar.addEventListener("click", (ev) => {
      ev.preventDefault();
      carregarListaAtendimento();
    });
  }

  // Carrega automaticamente ao abrir a página
  carregarListaAtendimento();
});
