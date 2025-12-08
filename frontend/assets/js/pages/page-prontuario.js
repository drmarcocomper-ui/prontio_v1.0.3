/**
 * PRONTIO - Página de Prontuário
 *
 * Responsável por:
 * - Ler o contexto salvo pela Agenda (localStorage.prontio.prontuarioContexto)
 * - Ler parâmetros da URL (idPaciente, idAgenda)
 * - Preencher o cabeçalho "Paciente e atendimento"
 * - Carregar/listar evoluções, histórico, etc.
 *
 * Versão sem ES Modules:
 * - NÃO usa import/export
 * - Usa window.callApi (definido em core/api.js)
 * - Registra a página via PRONTIO.registerPage("prontuario", fn)
 */

(function (global, document) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  const callApi =
    global.callApi ||
    function () {
      console.warn(
        "[PRONTIO.prontuario] callApi não definido – usando apenas dados locais."
      );
      return Promise.reject(
        new Error("API não disponível nesta página (callApi indefinido).")
      );
    };

  function qs(sel) {
    return document.querySelector(sel);
  }

  function getQueryParams() {
    const params = new URLSearchParams(global.location.search || "");
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
      const raw = global.localStorage.getItem("prontio.prontuarioContexto");
      if (raw) ctxStorage = JSON.parse(raw);
    } catch (e) {
      console.warn(
        "[PRONTIO.prontuario] Erro ao ler prontio.prontuarioContexto",
        e
      );
    }

    const contexto = {
      idPaciente:
        params.idPaciente || (ctxStorage && ctxStorage.ID_Paciente) || "",
      idAgenda: params.idAgenda || (ctxStorage && ctxStorage.ID_Agenda) || "",
      data: (ctxStorage && ctxStorage.data) || "",
      hora: (ctxStorage && ctxStorage.hora_inicio) || "",
      status: (ctxStorage && ctxStorage.status) || "",
      nome: (ctxStorage && ctxStorage.nome_paciente) || "",
      documento: (ctxStorage && ctxStorage.documento_paciente) || "",
      telefone: (ctxStorage && ctxStorage.telefone_paciente) || "",
      tipo: (ctxStorage && ctxStorage.tipo) || "",
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

    if (spanNome) {
      spanNome.textContent = contexto.nome || "Paciente";
    }

    if (spanId) {
      spanId.textContent = contexto.idPaciente || "—";
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
          ${autor ? `<span class="evo-autor">${autor}</span>` : ""}
          ${origem ? `<span class="evo-origem badge">${origem}</span>` : ""}
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
      const data = await callApi({
        action: "Evolucao.ListarPorAgenda", // compatível com routeAction_ (prefixo Evolucao.)
        payload: { idAgenda: contexto.idAgenda },
      });

      console.log("Prontuário: Evolucao.ListarPorAgenda =>", data);

      const evolucoes =
        (data && data.evolucoes) ||
        (data && data.lista) ||
        [];

      renderListaEvolucoes(evolucoes, ul, vazio);

      if (!evolucoes.length) {
        vazio.textContent =
          "Nenhuma evolução encontrado para este agendamento.";
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
      const data = await callApi({
        action: "Evolucao.ListarPorPaciente",
        payload: { idPaciente: contexto.idPaciente },
      });

      console.log("Prontuário: Evolucao.ListarPorPaciente =>", data);

      const evolucoes =
        (data && data.evolucoes) ||
        (data && data.lista) ||
        [];

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

      await callApi({
        action: "Evolucao.Salvar",
        payload,
      });

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
  // Inicialização
  // -----------------------------

  function initProntuarioPageInternal() {
    console.log("[PRONTIO.prontuario] initProntuarioPage");

    const contexto = carregarContextoProntuario();
    aplicarContextoNaUI(contexto);

    const formEvo = qs("#formEvolucao");
    if (formEvo) {
      formEvo.addEventListener("submit", function (ev) {
        salvarEvolucao(contexto, ev);
      });
    }

    const btnHistorico = qs("#btnCarregarHistoricoPaciente");
    if (btnHistorico) {
      btnHistorico.addEventListener("click", function () {
        carregarHistoricoCompletoPaciente(contexto);
      });
    }

    carregarEvolucoesDoAtendimento(contexto);

    // Botão "Ir para nova receita" (id = btnNovaReceita)
    const btnNovaReceita = qs("#btnNovaReceita");
    if (btnNovaReceita) {
      btnNovaReceita.addEventListener("click", function () {
        if (!contexto.idPaciente) {
          alert(
            "Nenhum paciente associado ao prontuário. Abra a partir da Agenda ou selecione um paciente."
          );
          return;
        }

        const params = new URLSearchParams();
        params.set("idPaciente", contexto.idPaciente);
        if (contexto.idAgenda) params.set("idAgenda", contexto.idAgenda);

        // Garante que o contexto completo fique salvo para a página de receita
        try {
          global.localStorage.setItem(
            "prontio.prontuarioContexto",
            JSON.stringify({
              ID_Paciente: contexto.idPaciente,
              ID_Agenda: contexto.idAgenda || "",
              nome_paciente: contexto.nome || "",
              documento_paciente: contexto.documento || "",
              telefone_paciente: contexto.telefone || "",
              data: contexto.data || "",
              hora_inicio: contexto.hora || "",
              status: contexto.status || "",
              tipo: contexto.tipo || "",
            })
          );
        } catch (e) {
          console.warn(
            "[PRONTIO.prontuario] Não foi possível salvar contexto para receita:",
            e
          );
        }

        const url = "receita.html?" + params.toString();
        global.location.href = url;
      });
    }
  }

  // Registrar página no namespace PRONTIO
  if (typeof PRONTIO.registerPage === "function") {
    PRONTIO.registerPage("prontuario", initProntuarioPageInternal);
  } else {
    PRONTIO.pages = PRONTIO.pages || {};
    PRONTIO.pages.prontuario = { init: initProntuarioPageInternal };
  }
})(window, document);
