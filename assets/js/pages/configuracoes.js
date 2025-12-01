// assets/js/configuracoes.js
// Front-end de Configurações do PRONTIO
// - Carrega configurações gerais (Configuracoes.Obter)
// - Salva configurações gerais (Configuracoes.Salvar)
// - Mantém tudo em um objeto "config" para o front

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formConfiguracoes");
  const btnRecarregar = document.getElementById("btnRecarregarConfig");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await salvarConfiguracoes();
    });
  }

  if (btnRecarregar) {
    btnRecarregar.addEventListener("click", async () => {
      await carregarConfiguracoes();
    });
  }

  carregarConfiguracoes();
});

function mostrarMensagemConfig(texto, tipo = "info") {
  const div = document.getElementById("mensagemConfig");
  if (!div) return;

  if (!texto) {
    div.style.display = "none";
    div.textContent = "";
    div.className = "mensagem";
    return;
  }

  div.style.display = "block";
  div.textContent = texto;
  div.className = "mensagem";

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

/**
 * Lê os campos de checkbox dos dias da semana e retorna um array de códigos (SEG, TER, ...).
 */
function obterDiasAtivosDoFormulario() {
  const chks = document.querySelectorAll(".chk-dia-ativo");
  const dias = [];
  chks.forEach((chk) => {
    if (chk.checked) {
      dias.push(chk.value);
    }
  });
  return dias;
}

/**
 * Marca os checkboxes de dias da semana com base em um array de códigos.
 * @param {string[]} dias
 */
function aplicarDiasAtivosNoFormulario(dias) {
  const chks = document.querySelectorAll(".chk-dia-ativo");
  const setDias = new Set(dias || []);
  chks.forEach((chk) => {
    chk.checked = setDias.has(chk.value);
  });
}

/**
 * Carrega as configurações do backend.
 */
async function carregarConfiguracoes() {
  mostrarMensagemConfig("Carregando configurações...", "info");

  const resposta = await callApi({
    action: "Configuracoes.Obter",
    payload: {},
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao carregar configurações.";
    mostrarMensagemConfig(erroTexto, "erro");
    return;
  }

  const cfg = (resposta.data && resposta.data.configuracoes) || {};

  // Dados do médico
  document.getElementById("medicoNomeCompleto").value =
    cfg.medicoNomeCompleto || "";
  document.getElementById("medicoCRM").value = cfg.medicoCRM || "";
  document.getElementById("medicoEspecialidade").value =
    cfg.medicoEspecialidade || "";

  // Dados da clínica
  document.getElementById("clinicaNome").value = cfg.clinicaNome || "";
  document.getElementById("clinicaEndereco").value =
    cfg.clinicaEndereco || "";
  document.getElementById("clinicaTelefone").value =
    cfg.clinicaTelefone || "";
  document.getElementById("clinicaEmail").value = cfg.clinicaEmail || "";

  // Preferências da agenda
  document.getElementById("agendaHoraInicioPadrao").value =
    cfg.agendaHoraInicioPadrao || "";
  document.getElementById("agendaHoraFimPadrao").value =
    cfg.agendaHoraFimPadrao || "";
  document.getElementById("agendaIntervaloMinutos").value =
    cfg.agendaIntervaloMinutos || "";

  aplicarDiasAtivosNoFormulario(cfg.agendaDiasAtivos || []);

  mostrarMensagemConfig("Configurações carregadas com sucesso.", "sucesso");
}

/**
 * Coleta as configurações dos campos do formulário e envia ao backend.
 */
async function salvarConfiguracoes() {
  // Coleta campos
  const medicoNomeCompleto = document.getElementById("medicoNomeCompleto")
    .value.trim();
  const medicoCRM = document.getElementById("medicoCRM").value.trim();
  const medicoEspecialidade = document
    .getElementById("medicoEspecialidade")
    .value.trim();

  const clinicaNome = document.getElementById("clinicaNome").value.trim();
  const clinicaEndereco = document
    .getElementById("clinicaEndereco")
    .value.trim();
  const clinicaTelefone = document
    .getElementById("clinicaTelefone")
    .value.trim();
  const clinicaEmail = document.getElementById("clinicaEmail").value.trim();

  const agendaHoraInicioPadrao = document.getElementById(
    "agendaHoraInicioPadrao"
  ).value;
  const agendaHoraFimPadrao = document.getElementById(
    "agendaHoraFimPadrao"
  ).value;
  const agendaIntervaloMinutos = document.getElementById(
    "agendaIntervaloMinutos"
  ).value;

  const agendaDiasAtivos = obterDiasAtivosDoFormulario();

  // Validação mínima no front (regras de negócio ficam no backend)
  if (!medicoNomeCompleto) {
    mostrarMensagemConfig("Informe o nome completo do médico.", "erro");
    return;
  }
  if (!medicoCRM) {
    mostrarMensagemConfig("Informe o CRM.", "erro");
    return;
  }

  mostrarMensagemConfig("Salvando configurações...", "info");

  const payloadConfig = {
    medicoNomeCompleto,
    medicoCRM,
    medicoEspecialidade,
    clinicaNome,
    clinicaEndereco,
    clinicaTelefone,
    clinicaEmail,
    agendaHoraInicioPadrao,
    agendaHoraFimPadrao,
    agendaIntervaloMinutos,
    agendaDiasAtivos, // array de códigos [ "SEG", "TER", ... ]
  };

  const resposta = await callApi({
    action: "Configuracoes.Salvar",
    payload: {
      configuracoes: payloadConfig,
    },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao salvar configurações.";
    mostrarMensagemConfig(erroTexto, "erro");
    return;
  }

  mostrarMensagemConfig("Configurações salvas com sucesso.", "sucesso");
}
