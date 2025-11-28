// assets/js/laudo.js
// Tela de LAUDO PRONTIO
// Usa paciente atual do localStorage (prontio_pacienteAtualId / Nome)
// Ações de API:
//  - Laudos.Criar
//  - Laudos.ListarPorPaciente
//  - Laudos.GerarPdf

document.addEventListener("DOMContentLoaded", () => {
  inicializarLaudo();
});

function mostrarMensagemLaudo(texto, tipo = "info") {
  const div = document.getElementById("mensagemLaudo");
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

function formatarDataHoraBRLaudo(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${dia}/${mes}/${ano} ${hh}:${mm}`;
}

async function inicializarLaudo() {
  const idPaciente = localStorage.getItem("prontio_pacienteAtualId");
  const nomePaciente = localStorage.getItem("prontio_pacienteAtualNome");

  const spanId = document.getElementById("laudoPacienteId");
  const spanNome = document.getElementById("laudoPacienteNome");
  const topbarSubtitle = document.getElementById("topbar-subtitle");
  const form = document.getElementById("formLaudo");
  const btnLimpar = document.getElementById("btnLimparLaudo");

  if (!idPaciente) {
    if (spanId) spanId.textContent = "-";
    if (spanNome) spanNome.textContent = "-";
    if (topbarSubtitle) topbarSubtitle.textContent = "Nenhum paciente selecionado.";

    mostrarMensagemLaudo(
      "Nenhum paciente selecionado. Volte à lista de pacientes, selecione um e depois abra Laudos.",
      "erro"
    );

    if (form) {
      Array.from(form.elements).forEach((el) => (el.disabled = true));
    }
    return;
  }

  if (spanId) spanId.textContent = idPaciente;
  if (spanNome) spanNome.textContent = nomePaciente || "";
  if (topbarSubtitle) {
    topbarSubtitle.textContent = nomePaciente
      ? `Paciente: ${nomePaciente}`
      : `Paciente ID: ${idPaciente}`;
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarLaudo();
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      limparCamposLaudo();
    });
  }

  mostrarMensagemLaudo("Carregando laudos do paciente...", "info");
  await carregarLaudos();
  mostrarMensagemLaudo("", "info");
}

function limparCamposLaudo() {
  const titulo = document.getElementById("laudoTitulo");
  const tipo = document.getElementById("laudoTipo");
  const texto = document.getElementById("laudoTexto");
  const obs = document.getElementById("laudoObservacoes");

  if (titulo) titulo.value = "";
  if (tipo) tipo.value = "";
  if (texto) texto.value = "";
  if (obs) obs.value = "";

  mostrarMensagemLaudo("Campos do laudo limpos.", "info");
}

async function salvarLaudo() {
  const idPaciente = localStorage.getItem("prontio_pacienteAtualId");
  if (!idPaciente) {
    mostrarMensagemLaudo(
      "Nenhum paciente selecionado. Não é possível salvar laudo.",
      "erro"
    );
    return;
  }

  const titulo = document.getElementById("laudoTitulo")?.value.trim() || "";
  const tipo = document.getElementById("laudoTipo")?.value.trim() || "";
  const texto = document.getElementById("laudoTexto")?.value.trim() || "";
  const observacoes =
    document.getElementById("laudoObservacoes")?.value.trim() || "";

  if (!titulo) {
    mostrarMensagemLaudo("Informe o título do laudo.", "erro");
    return;
  }
  if (!texto) {
    mostrarMensagemLaudo("Informe o texto do laudo.", "erro");
    return;
  }

  mostrarMensagemLaudo("Salvando laudo...", "info");

  const resposta = await callApi({
    action: "Laudos.Criar",
    payload: {
      idPaciente,
      titulo,
      tipo,
      texto,
      observacoes,
    },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao salvar laudo.";
    mostrarMensagemLaudo(erroTexto, "erro");
    console.error("Erro Laudos.Criar:", resposta);
    return;
  }

  mostrarMensagemLaudo("Laudo salvo com sucesso.", "sucesso");
  limparCamposLaudo();
  await carregarLaudos();
}

async function carregarLaudos() {
  const idPaciente = localStorage.getItem("prontio_pacienteAtualId");
  if (!idPaciente) return;

  const tbody = document.getElementById("tabelaLaudosBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const resposta = await callApi({
    action: "Laudos.ListarPorPaciente",
    payload: { idPaciente },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao carregar laudos do paciente.";
    mostrarMensagemLaudo(erroTexto, "erro");
    console.error("Erro Laudos.ListarPorPaciente:", resposta);
    return;
  }

  const laudos = (resposta.data && resposta.data.laudos) || [];

  if (!laudos.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Nenhum laudo registrado para este paciente.";
    td.style.textAlign = "center";
    td.style.fontSize = "12px";
    td.style.color = "#777";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  laudos.forEach((laudo) => {
    const tr = document.createElement("tr");
    tr.dataset.idLaudo = laudo.idLaudo || "";

    const tdData = document.createElement("td");
    tdData.className = "col-laudo-data";
    tdData.textContent = formatarDataHoraBRLaudo(
      laudo.dataHoraCriacao || ""
    );
    tr.appendChild(tdData);

    const tdTitulo = document.createElement("td");
    tdTitulo.textContent = laudo.titulo || "";
    tr.appendChild(tdTitulo);

    const tdTipo = document.createElement("td");
    tdTipo.className = "col-laudo-tipo";
    tdTipo.textContent = laudo.tipo || "";
    tr.appendChild(tdTipo);

    const tdObs = document.createElement("td");
    tdObs.textContent = laudo.observacoes || "";
    tr.appendChild(tdObs);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "col-laudo-acoes";

    const divAcoes = document.createElement("div");
    divAcoes.className = "acoes-laudo-lista";

    const btnPdf = document.createElement("button");
    btnPdf.type = "button";
    btnPdf.textContent = "PDF";
    btnPdf.className = "btn secundario";
    btnPdf.addEventListener("click", async () => {
      const idLaudo = laudo.idLaudo;
      if (!idLaudo) {
        alert("ID do laudo não encontrado.");
        return;
      }
      await gerarPdfLaudo(idLaudo);
    });

    const btnModelo = document.createElement("button");
    btnModelo.type = "button";
    btnModelo.textContent = "Usar como modelo";
    btnModelo.className = "btn primario";
    btnModelo.addEventListener("click", () => {
      aplicarLaudoComoModelo(laudo);
    });

    divAcoes.appendChild(btnPdf);
    divAcoes.appendChild(btnModelo);
    tdAcoes.appendChild(divAcoes);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function aplicarLaudoComoModelo(laudo) {
  const titulo = document.getElementById("laudoTitulo");
  const tipo = document.getElementById("laudoTipo");
  const texto = document.getElementById("laudoTexto");
  const obs = document.getElementById("laudoObservacoes");

  if (titulo) titulo.value = laudo.titulo || "";
  if (tipo) tipo.value = laudo.tipo || "";
  if (texto) texto.value = laudo.texto || "";
  if (obs) obs.value = laudo.observacoes || "";

  mostrarMensagemLaudo("Laudo carregado no formulário para edição.", "info");
  if (texto) texto.focus();
}

async function gerarPdfLaudo(idLaudo) {
  mostrarMensagemLaudo("Gerando laudo em PDF...", "info");

  const resposta = await callApi({
    action: "Laudos.GerarPdf",
    payload: { idLaudo },
  });

  if (!resposta || !resposta.success) {
    const erroTexto =
      (resposta && (resposta.errors || []).join(" | ")) ||
      "Erro ao gerar PDF do laudo.";
    mostrarMensagemLaudo(erroTexto, "erro");
    console.error("Erro Laudos.GerarPdf:", resposta);
    return;
  }

  const html =
    resposta.data && resposta.data.html ? resposta.data.html : null;

  if (!html) {
    mostrarMensagemLaudo(
      "PDF gerado, mas o HTML do laudo não foi retornado.",
      "erro"
    );
    return;
  }

  mostrarMensagemLaudo(
    "Laudo gerado com sucesso. Abrindo em nova aba...",
    "sucesso"
  );

  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "Não foi possível abrir a nova aba. Verifique se o bloqueador de pop-up está ativo."
    );
    return;
  }

  win.document.open();
  win.document.write(
    html + "<script>setTimeout(function(){window.print();},500);<\/script>"
  );
  win.document.close();
}
