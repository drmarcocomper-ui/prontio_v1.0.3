// assets/js/pages/configuracoes.js
// Página de Configurações do PRONTIO
// - Usa AgendaConfig_Obter / AgendaConfig_Salvar
// - Lê/escreve dados do médico, clínica, logo e agenda

// callApi vem de ./core/api.js (já importado por main.js)
// aqui usamos como função global
// eslint-disable-next-line no-undef
const apiCall = typeof callApi === "function" ? callApi : null;

/**
 * Inicializador chamado pelo main.js quando data-page-id="configuracoes".
 */
export function initConfiguracoesPage() {
  const body = document.body;
  const pageId = body.dataset.pageId || null;
  if (pageId !== "configuracoes") return;

  const form = document.getElementById("formConfiguracoes");
  const btnRecarregar = document.getElementById("btnRecarregarConfig");

  if (!apiCall) {
    console.error("configuracoes.js: callApi não encontrado. Verifique core/api.js.");
    mostrarMensagemConfig(
      "Erro interno: API não disponível no front. Verifique console.",
      "erro"
    );
    return;
  }

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
}

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
 * Lê os checkboxes dos dias da semana e retorna um array de códigos (SEG, TER, ...).
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
 * Carrega as configurações do backend via AgendaConfig_Obter.
 */
async function carregarConfiguracoes() {
  try {
    mostrarMensagemConfig("Carregando configurações...", "info");

    const cfg = await apiCall({
      action: "AgendaConfig_Obter",
      payload: {},
    });

    if (!cfg) {
      mostrarMensagemConfig(
        "Não foi possível carregar as configurações (resposta vazia).",
        "erro"
      );
      return;
    }

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

    // Logo
    const logoInput = document.getElementById("clinicaLogoUrl");
    if (logoInput) {
      logoInput.value = cfg.logoUrl || "";
    }

    // Preferências da agenda (usadas pela agenda diária/semanal)
    document.getElementById("agendaHoraInicioPadrao").value =
      cfg.hora_inicio_padrao || "";
    document.getElementById("agendaHoraFimPadrao").value =
      cfg.hora_fim_padrao || "";
    document.getElementById("agendaIntervaloMinutos").value =
      cfg.duracao_grade_minutos || "";

    aplicarDiasAtivosNoFormulario(cfg.dias_ativos || []);

    mostrarMensagemConfig("Configurações carregadas com sucesso.", "sucesso");
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    mostrarMensagemConfig(
      "Erro ao carregar configurações: " + error.message,
      "erro"
    );
  }
}

/**
 * Coleta as configurações dos campos do formulário e envia ao backend via AgendaConfig_Salvar.
 */
async function salvarConfiguracoes() {
  const medicoNomeCompleto = document
    .getElementById("medicoNomeCompleto")
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

  const clinicaLogoUrlEl = document.getElementById("clinicaLogoUrl");
  const logoUrl = clinicaLogoUrlEl ? clinicaLogoUrlEl.value.trim() : "";

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
    logoUrl,
    hora_inicio_padrao: agendaHoraInicioPadrao,
    hora_fim_padrao: agendaHoraFimPadrao,
    duracao_grade_minutos: Number(agendaIntervaloMinutos || 30),
    dias_ativos: agendaDiasAtivos,
  };

  try {
    await apiCall({
      action: "AgendaConfig_Salvar",
      payload: payloadConfig,
    });

    mostrarMensagemConfig("Configurações salvas com sucesso.", "sucesso");
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    mostrarMensagemConfig(
      "Erro ao salvar configurações: " + error.message,
      "erro"
    );
  }
}
