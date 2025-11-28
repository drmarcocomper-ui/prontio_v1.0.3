// assets/js/prontuario.js
// Tela de prontuário: carrega dados do paciente selecionado
// usando o ID salvo em localStorage (prontio_pacienteAtualId)
// e busca na API via Pacientes.ObterPorId.

/* 
  OBS: Mantém o padrão de chamar o backend via callApi
  (implementado em assets/js/api.js) e apenas cuida da
  apresentação na tela. Regras de negócio continuam no backend.
*/

document.addEventListener("DOMContentLoaded", () => {
  inicializarProntuario();
});

function mostrarMensagemPront(texto, tipo = "info") {
  const div = document.getElementById("mensagem");
  if (!div) return;

  div.textContent = texto || "";

  // Zera classes anteriores, mantendo a classe base "mensagem"
  div.className = "mensagem";

  // Adiciona classe específica para estilização via CSS
  // (info | sucesso | erro)
  if (tipo) {
    div.classList.add(tipo);
    // Também mantém compatibilidade com nomes "mensagem-info" etc.
    div.classList.add("mensagem-" + tipo);
  }
}

function formatarDataParaBRPront(valor) {
  if (!valor) return "";

  if (typeof valor === "string") {
    const soData = valor.substring(0, 10);
    const partes = soData.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      if (ano && mes && dia) {
        return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
      }
    }
    return valor;
  }

  if (valor instanceof Date) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${dia}/${mes}/${ano}`;
  }

  return String(valor);
}

async function inicializarProntuario() {
  const idPaciente = localStorage.getItem("prontio_pacienteAtualId");
  const nomePaciente = localStorage.getItem("prontio_pacienteAtualNome");

  const topbarSubtitle = document.getElementById("topbar-subtitle");
  const pacienteIdTopo = document.getElementById("pacienteIdTopo");

  if (!idPaciente) {
    mostrarMensagemPront(
      "Nenhum paciente selecionado. Volte à lista de pacientes e selecione um.",
      "erro"
    );

    if (topbarSubtitle) {
      topbarSubtitle.textContent = "Nenhum paciente selecionado.";
    }
    if (pacienteIdTopo) {
      pacienteIdTopo.textContent = "";
    }
    return;
  }

  if (topbarSubtitle) {
    topbarSubtitle.textContent = nomePaciente
      ? `Carregando dados de: ${nomePaciente}...`
      : "Carregando dados do paciente...";
  }

  mostrarMensagemPront(
    `Carregando dados do paciente ${nomePaciente || ""}...`,
    "info"
  );

  const resposta = await callApi({
    action: "Pacientes.ObterPorId",
    payload: { idPaciente: idPaciente },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao carregar dados do paciente.";
    mostrarMensagemPront(erroTexto, "erro");

    if (topbarSubtitle) {
      topbarSubtitle.textContent = "Erro ao carregar dados do paciente.";
    }
    if (pacienteIdTopo) {
      pacienteIdTopo.textContent = "";
    }
    return;
  }

  const paciente = resposta.data && resposta.data.paciente;
  if (!paciente) {
    mostrarMensagemPront("Paciente não encontrado na base de dados.", "erro");

    if (topbarSubtitle) {
      topbarSubtitle.textContent = "Paciente não encontrado.";
    }
    if (pacienteIdTopo) {
      pacienteIdTopo.textContent = "";
    }
    return;
  }

  // Preenche campos principais
  document.getElementById("pacienteId").textContent =
    paciente.idPaciente || "";
  document.getElementById("pacienteNome").textContent =
    paciente.nomeCompleto || "";
  document.getElementById("pacienteDataNasc").textContent =
    formatarDataParaBRPront(paciente.dataNascimento || "");
  document.getElementById("pacienteTelefone").textContent =
    paciente.telefone || "";
  document.getElementById("pacienteEmail").textContent = paciente.email || "";
  document.getElementById("pacienteObservacoes").textContent =
    paciente.observacoes || "";
  document.getElementById("pacienteAtivo").textContent = paciente.ativo
    ? "SIM"
    : "NÃO";

  // Atualiza topo com informações do paciente
  if (topbarSubtitle) {
    topbarSubtitle.textContent = paciente.nomeCompleto
      ? `Paciente: ${paciente.nomeCompleto}`
      : "Paciente carregado.";
  }

  if (pacienteIdTopo) {
    pacienteIdTopo.textContent = paciente.idPaciente
      ? `ID: ${paciente.idPaciente}`
      : "";
  }

  mostrarMensagemPront("Dados do paciente carregados com sucesso.", "sucesso");
}
