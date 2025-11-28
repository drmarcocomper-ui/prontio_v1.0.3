// assets/js/pacientes.js
// Módulo de front para cadastro, listagem, seleção e edição de pacientes

let pacienteSelecionadoId = null;
let pacienteSelecionadoNome = null;
let pacienteSelecionadoAtivo = null;
let pacientesCache = [];

let modoEdicao = false;
let idEmEdicao = null;

// Critério de ordenação atual (somente front)
let criterioOrdenacao = "dataCadastroDesc"; // padrão: mais novos primeiro

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPaciente");
  const btnCarregar = document.getElementById("btnCarregarPacientes");
  const btnIrProntuario = document.getElementById("btnIrProntuario");
  const btnInativar = document.getElementById("btnInativar");
  const btnReativar = document.getElementById("btnReativar");
  const btnEditar = document.getElementById("btnEditar");
  const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
  const btnNovoPaciente = document.getElementById("btnNovoPaciente");
  const filtroTexto = document.getElementById("filtroTexto");
  const chkSomenteAtivos = document.getElementById("chkSomenteAtivos");
  const selectOrdenacao = document.getElementById("selectOrdenacao");
  const btnConfigColunas = document.getElementById("btnConfigColunas");
  const painelColunas = document.getElementById("painelColunas");
  const btnFecharPainelColunas = document.getElementById("btnFecharPainelColunas");
  const checkboxesColunas = document.querySelectorAll(".chk-coluna");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await salvarPaciente();
  });

  btnCarregar.addEventListener("click", async () => {
    await carregarPacientes();
  });

  btnIrProntuario.addEventListener("click", () => {
    irParaProntuario();
  });

  btnInativar.addEventListener("click", async () => {
    await alterarStatusPaciente(false);
  });

  btnReativar.addEventListener("click", async () => {
    await alterarStatusPaciente(true);
  });

  btnEditar.addEventListener("click", () => {
    entrarModoEdicaoPacienteSelecionado();
  });

  btnCancelarEdicao.addEventListener("click", () => {
    sairModoEdicao();
  });

  btnNovoPaciente.addEventListener("click", () => {
    sairModoEdicao(false);
    mostrarSecaoCadastro(true);
    document.getElementById("nomeCompleto").focus();
    mostrarMensagem("Novo paciente: preencha os dados e salve.", "info");
  });

  filtroTexto.addEventListener("input", () => {
    aplicarFiltrosETabela();
  });

  chkSomenteAtivos.addEventListener("change", () => {
    aplicarFiltrosETabela();
  });

  selectOrdenacao.addEventListener("change", () => {
    criterioOrdenacao = selectOrdenacao.value;
    aplicarFiltrosETabela();
  });

  btnConfigColunas.addEventListener("click", () => {
    painelColunas.classList.toggle("oculto");
  });

  btnFecharPainelColunas.addEventListener("click", () => {
    painelColunas.classList.add("oculto");
  });

  checkboxesColunas.forEach((chk) => {
    chk.addEventListener("change", () => {
      aplicarVisibilidadeColunas();
    });
  });

  // Carrega preferências de colunas do localStorage
  carregarConfigColunas();

  // Carrega a lista logo ao abrir a página
  carregarPacientes();
});

// ----------------- UI básica -----------------

function mostrarSecaoCadastro(visivel) {
  const sec = document.getElementById("secCadastroPaciente");
  if (!sec) return;
  if (visivel) sec.classList.remove("oculto");
  else sec.classList.add("oculto");
}

function mostrarMensagem(texto, tipo = "info") {
  const div = document.getElementById("mensagem");
  if (!div) return;

  div.textContent = texto;

  const estilos = {
    info: { borderColor: "#90caf9", color: "#333" },
    sucesso: { borderColor: "#2e7d32", color: "#2e7d32" },
    erro: { borderColor: "#c62828", color: "#c62828" },
  };

  const estilo = estilos[tipo] || estilos.info;
  div.style.borderLeftColor = estilo.borderColor;
  div.style.color = estilo.color;
}

// ----------------- Formulário -----------------

function obterDadosFormularioPaciente() {
  const nomeCompleto = document.getElementById("nomeCompleto").value.trim();
  const dataNascimento = document.getElementById("dataNascimento").value;
  const sexo = document.getElementById("sexo").value;
  const cpf = document.getElementById("cpf").value.trim();
  const rg = document.getElementById("rg").value.trim();
  const telefone1 = document.getElementById("telefone1").value.trim();
  const telefone2 = document.getElementById("telefone2").value.trim();
  const email = document.getElementById("email").value.trim();
  const enderecoBairro = document.getElementById("enderecoBairro").value.trim();
  const enderecoCidade = document.getElementById("enderecoCidade").value.trim();
  const enderecoUf = document.getElementById("enderecoUf").value.trim();
  const planoSaude = document.getElementById("planoSaude").value.trim();
  const numeroCarteirinha = document.getElementById("numeroCarteirinha").value.trim();
  const obsImportantes = document.getElementById("obsImportantes").value.trim();

  return {
    nomeCompleto,
    dataNascimento,
    sexo,
    cpf,
    rg,
    telefone1,
    telefone2,
    email,
    enderecoBairro,
    enderecoCidade,
    enderecoUf,
    planoSaude,
    numeroCarteirinha,
    obsImportantes,
  };
}

function preencherFormularioComPaciente(p) {
  document.getElementById("nomeCompleto").value = p.nomeCompleto || "";
  document.getElementById("dataNascimento").value = (p.dataNascimento || "").substring(0, 10);
  document.getElementById("sexo").value = p.sexo || "";
  document.getElementById("cpf").value = p.cpf || "";
  document.getElementById("rg").value = p.rg || "";
  document.getElementById("telefone1").value = p.telefone1 || "";
  document.getElementById("telefone2").value = p.telefone2 || "";
  document.getElementById("email").value = p.email || "";
  document.getElementById("enderecoBairro").value = p.enderecoBairro || "";
  document.getElementById("enderecoCidade").value = p.enderecoCidade || "";
  document.getElementById("enderecoUf").value = p.enderecoUf || "";
  document.getElementById("planoSaude").value = p.planoSaude || "";
  document.getElementById("numeroCarteirinha").value = p.numeroCarteirinha || "";
  document.getElementById("obsImportantes").value = p.obsImportantes || "";
}

function atualizarUIEdicao() {
  const btnSalvar = document.getElementById("btnSalvarPaciente");
  const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

  if (modoEdicao) {
    btnSalvar.textContent = "Atualizar paciente";
    btnCancelarEdicao.classList.remove("oculto");
    mostrarSecaoCadastro(true);
  } else {
    btnSalvar.textContent = "Salvar paciente";
    btnCancelarEdicao.classList.add("oculto");
  }
}

// ----------------- Datas, texto, ordenação -----------------

function formatarDataParaBR(valor) {
  if (!valor) return "";
  if (typeof valor === "string") {
    const soData = valor.substring(0, 10);
    const partes = soData.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
    }
    return valor;
  }
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${dia}/${mes}/${ano}`;
}

function normalizarTexto(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dataParaNumero(v) {
  if (!v) return 0;
  const d = new Date(v);
  if (isNaN(d.getTime())) return 0;
  return d.getTime();
}

function ordenarLista(lista) {
  const listaOrdenada = lista.slice();

  listaOrdenada.sort((a, b) => {
    if (criterioOrdenacao === "nomeAsc" || criterioOrdenacao === "nomeDesc") {
      const an = normalizarTexto(a.nomeCompleto || "");
      const bn = normalizarTexto(b.nomeCompleto || "");
      if (an < bn) return criterioOrdenacao === "nomeAsc" ? -1 : 1;
      if (an > bn) return criterioOrdenacao === "nomeAsc" ? 1 : -1;
      return 0;
    }

    // dataCadastroAsc / dataCadastroDesc
    const da = dataParaNumero(a.dataCadastro);
    const db = dataParaNumero(b.dataCadastro);
    if (da === db) return 0;

    if (criterioOrdenacao === "dataCadastroAsc") return da - db;
    // dataCadastroDesc
    return db - da;
  });

  return listaOrdenada;
}

// ----------------- API -----------------

async function salvarPaciente() {
  const dados = obterDadosFormularioPaciente();

  if (!dados.nomeCompleto) {
    mostrarMensagem("Nome completo é obrigatório.", "erro");
    return;
  }

  let acao = "Pacientes.Criar";
  let mensagemProcesso = "Salvando paciente...";
  let mensagemSucesso = "Paciente salvo com sucesso!";

  const estaEditando = modoEdicao && idEmEdicao;

  if (estaEditando) {
    acao = "Pacientes.Atualizar";
    mensagemProcesso = "Atualizando paciente...";
    mensagemSucesso = "Paciente atualizado com sucesso!";
  }

  mostrarMensagem(mensagemProcesso, "info");

  const payload = estaEditando
    ? { idPaciente: idEmEdicao, ...dados }
    : dados;

  const resposta = await callApi({ action: acao, payload });

  if (!resposta || !resposta.success) {
    const erroTexto = (resposta && resposta.errors || []).join(" | ") || "Erro ao salvar/atualizar paciente.";
    mostrarMensagem(erroTexto, "erro");
    return;
  }

  // ✅ Sucesso
  if (estaEditando) {
    // Atualiza APENAS o cache local (para não depender do backend na mesma hora)
    const idx = pacientesCache.findIndex(p => p.idPaciente === idEmEdicao);
    if (idx !== -1) {
      pacientesCache[idx] = {
        ...pacientesCache[idx],
        ...dados,
      };
    }
    aplicarFiltrosETabela(); // redesenha a tabela com os dados novos
  } else {
    // Novo paciente: recarregamos da API para trazer ID e dataCadastro
    await carregarPacientes();
  }

  mostrarMensagem(mensagemSucesso, "sucesso");
  document.getElementById("formPaciente").reset();
  if (estaEditando) {
    sairModoEdicao(false);
  }
  mostrarSecaoCadastro(false);

  // ⚠️ Observação importante:
  // Ainda é FUNDAMENTAL que o backend (Pacientes.Atualizar) grave as mudanças na planilha.
  // Se ele não estiver gravando, a lista ficará certa agora,
  // mas ao recarregar a página (F5) você verá os dados antigos.
}

async function carregarPacientes() {
  const resposta = await callApi({
    action: "Pacientes.ListarTodos",
    payload: {}, // ordenação só no front
  });

  if (!resposta.success) {
    const erroTexto = (resposta.errors || []).join(" | ") || "Erro ao carregar pacientes.";
    mostrarMensagem(erroTexto, "erro");
    return;
  }

  pacientesCache = (resposta.data && resposta.data.pacientes) || [];
  aplicarFiltrosETabela();
  mostrarMensagem(`Pacientes carregados: ${pacientesCache.length}`, "sucesso");

  if (pacientesCache.length === 0) {
    atualizarSelecaoPaciente(null, null, null);
  }
}

// ----------------- Tabela / filtros -----------------

function aplicarFiltrosETabela() {
  const filtroTextoBruto = document.getElementById("filtroTexto").value.trim();
  const somenteAtivos = document.getElementById("chkSomenteAtivos").checked;

  const filtroTextoNorm = normalizarTexto(filtroTextoBruto);
  const tbody = document.getElementById("tabelaPacientesBody");
  tbody.innerHTML = "";

  let listaFiltrada = pacientesCache.slice();

  if (somenteAtivos) {
    listaFiltrada = listaFiltrada.filter((p) => p.ativo);
  }

  if (filtroTextoNorm) {
    listaFiltrada = listaFiltrada.filter((p) => {
      const nomeNorm = normalizarTexto(p.nomeCompleto || "");
      const cpfNorm = normalizarTexto(p.cpf || "");
      const rgNorm = normalizarTexto(p.rg || "");
      const tel1Norm = normalizarTexto(p.telefone1 || "");
      const tel2Norm = normalizarTexto(p.telefone2 || "");
      const emailNorm = normalizarTexto(p.email || "");
      const planoNorm = normalizarTexto(p.planoSaude || "");
      const carteirinhaNorm = normalizarTexto(p.numeroCarteirinha || "");
      const idNorm = normalizarTexto(p.idPaciente || "");
      return (
        nomeNorm.includes(filtroTextoNorm) ||
        cpfNorm.includes(filtroTextoNorm) ||
        rgNorm.includes(filtroTextoNorm) ||
        tel1Norm.includes(filtroTextoNorm) ||
        tel2Norm.includes(filtroTextoNorm) ||
        emailNorm.includes(filtroTextoNorm) ||
        planoNorm.includes(filtroTextoNorm) ||
        carteirinhaNorm.includes(filtroTextoNorm) ||
        idNorm.includes(filtroTextoNorm)
      );
    });
  }

  const listaOrdenada = ordenarLista(listaFiltrada);

  listaOrdenada.forEach((p) => {
    const tr = document.createElement("tr");
    tr.dataset.idPaciente = p.idPaciente || "";
    tr.dataset.nomePaciente = p.nomeCompleto || "";
    tr.dataset.ativo = p.ativo ? "SIM" : "NAO";

    if (!p.ativo) tr.classList.add("linha-inativa");
    if (pacienteSelecionadoId && p.idPaciente === pacienteSelecionadoId) {
      tr.classList.add("linha-selecionada");
    }

    // Nome – sempre primeiro e sempre visível
    const tdNome = document.createElement("td");
    tdNome.textContent = p.nomeCompleto || "";
    tdNome.dataset.col = "nome";
    tr.appendChild(tdNome);

    // Demais colunas com data-col
    const colDefs = [
      ["dataCadastro", formatarDataParaBR(p.dataCadastro || "")],
      ["dataNascimento", formatarDataParaBR(p.dataNascimento || "")],
      ["sexo", p.sexo || ""],
      ["cpf", p.cpf || ""],
      ["rg", p.rg || ""],
      ["telefone1", p.telefone1 || ""],
      ["telefone2", p.telefone2 || ""],
      ["email", p.email || ""],
      ["enderecoBairro", p.enderecoBairro || ""],
      ["enderecoCidade", p.enderecoCidade || ""],
      ["enderecoUf", p.enderecoUf || ""],
      ["obsImportantes", p.obsImportantes || ""],
      ["planoSaude", p.planoSaude || ""],
      ["numeroCarteirinha", p.numeroCarteirinha || ""],
      ["ativo", p.ativo ? "SIM" : "NAO"],
    ];

    colDefs.forEach(([col, valor]) => {
      const td = document.createElement("td");
      td.textContent = valor;
      td.dataset.col = col;
      tr.appendChild(td);
    });

    tr.addEventListener("click", () => {
      selecionarPacienteNaTabela(tr);
    });

    tbody.appendChild(tr);
  });

  // Se após filtro a seleção sumiu da tela, limpa seleção visual
  if (listaOrdenada.every((p) => p.idPaciente !== pacienteSelecionadoId)) {
    const linhas = document.querySelectorAll("#tabelaPacientesBody tr");
    linhas.forEach((linha) => linha.classList.remove("linha-selecionada"));
  }

  aplicarVisibilidadeColunas();
}

function selecionarPacienteNaTabela(tr) {
  const id = tr.dataset.idPaciente || null;
  const nome = tr.dataset.nomePaciente || "";
  const ativo = tr.dataset.ativo === "SIM";

  const linhas = document.querySelectorAll("#tabelaPacientesBody tr");
  linhas.forEach((linha) => linha.classList.remove("linha-selecionada"));

  tr.classList.add("linha-selecionada");

  atualizarSelecaoPaciente(id, nome, ativo);

  if (modoEdicao && id) {
    const p = pacientesCache.find((px) => px.idPaciente === id);
    if (p) {
      preencherFormularioComPaciente(p);
      idEmEdicao = id;
    }
  }
}

function atualizarSelecaoPaciente(id, nome, ativo) {
  pacienteSelecionadoId = id;
  pacienteSelecionadoNome = nome;
  pacienteSelecionadoAtivo = ativo;

  const infoDiv = document.getElementById("pacienteSelecionadoInfo");
  const btnIrProntuario = document.getElementById("btnIrProntuario");
  const btnInativar = document.getElementById("btnInativar");
  const btnReativar = document.getElementById("btnReativar");
  const btnEditar = document.getElementById("btnEditar");

  if (!id) {
    infoDiv.textContent = "Nenhum paciente selecionado.";
    btnIrProntuario.disabled = true;
    btnInativar.disabled = true;
    btnReativar.disabled = true;
    btnEditar.disabled = true;
    localStorage.removeItem("prontio_pacienteAtualId");
    localStorage.removeItem("prontio_pacienteAtualNome");
    return;
  }

  infoDiv.textContent = `Paciente selecionado: ${nome} (ID: ${id})`;
  btnIrProntuario.disabled = false;
  btnEditar.disabled = false;

  if (ativo) {
    btnInativar.disabled = false;
    btnReativar.disabled = true;
  } else {
    btnInativar.disabled = true;
    btnReativar.disabled = false;
  }

  localStorage.setItem("prontio_pacienteAtualId", id);
  localStorage.setItem("prontio_pacienteAtualNome", nome);
}

// ----------------- Edição / navegação -----------------

function entrarModoEdicaoPacienteSelecionado() {
  if (!pacienteSelecionadoId) {
    alert("Selecione um paciente na lista primeiro.");
    return;
  }

  const p = pacientesCache.find((px) => px.idPaciente === pacienteSelecionadoId);
  if (!p) {
    mostrarMensagem("Paciente selecionado não encontrado na lista carregada.", "erro");
    return;
  }

  modoEdicao = true;
  idEmEdicao = pacienteSelecionadoId;
  preencherFormularioComPaciente(p);
  atualizarUIEdicao();
  mostrarMensagem(`Editando paciente: ${p.nomeCompleto}`, "info");
}

function sairModoEdicao(limparMensagem = true) {
  modoEdicao = false;
  idEmEdicao = null;
  document.getElementById("formPaciente").reset();
  atualizarUIEdicao();
  mostrarSecaoCadastro(false);
  if (limparMensagem) mostrarMensagem("Edição cancelada.", "info");
}

function irParaProntuario() {
  if (!pacienteSelecionadoId) {
    alert("Selecione um paciente na lista primeiro.");
    return;
  }
  window.location.href = "prontuario.html";
}

async function alterarStatusPaciente(ativoDesejado) {
  if (!pacienteSelecionadoId) {
    alert("Selecione um paciente na lista primeiro.");
    return;
  }

  const acaoTexto = ativoDesejado ? "reativar" : "inativar";
  if (!confirm(`Tem certeza que deseja ${acaoTexto} este paciente?`)) return;

  mostrarMensagem(`Alterando status do paciente (${acaoTexto})...`, "info");

  const resposta = await callApi({
    action: "Pacientes.AlterarStatusAtivo",
    payload: {
      idPaciente: pacienteSelecionadoId,
      ativo: ativoDesejado,
    },
  });

  if (!resposta.success) {
    const erroTexto = (resposta.errors || []).join(" | ") || "Erro ao alterar status do paciente.";
    mostrarMensagem(erroTexto, "erro");
    return;
  }

  mostrarMensagem("Status do paciente atualizado com sucesso.", "sucesso");
  await carregarPacientes();

  const pacienteAtual = pacientesCache.find((p) => p.idPaciente === pacienteSelecionadoId);
  if (!pacienteAtual) {
    atualizarSelecaoPaciente(null, null, null);
  } else {
    atualizarSelecaoPaciente(pacienteAtual.idPaciente, pacienteAtual.nomeCompleto, pacienteAtual.ativo);
    aplicarFiltrosETabela();
  }
}

// ----------------- Colunas visíveis -----------------

function carregarConfigColunas() {
  try {
    const json = localStorage.getItem("prontio_pacientes_cols_visiveis");
    if (!json) return;

    const config = JSON.parse(json);
    const checkboxes = document.querySelectorAll(".chk-coluna");
    checkboxes.forEach((cb) => {
      const col = cb.dataset.col;
      if (config.hasOwnProperty(col)) {
        cb.checked = !!config[col];
      }
    });
  } catch (e) {
    console.warn("Erro ao carregar configuração de colunas:", e);
  }
}

function aplicarVisibilidadeColunas() {
  const checkboxes = document.querySelectorAll(".chk-coluna");
  const config = {};

  checkboxes.forEach((cb) => {
    const col = cb.dataset.col;
    const visivel = cb.checked;
    config[col] = visivel;

    const cells = document.querySelectorAll(`th[data-col='${col}'], td[data-col='${col}']`);
    cells.forEach((cell) => {
      if (visivel) cell.classList.remove("oculto-col");
      else cell.classList.add("oculto-col");
    });
  });

  try {
    localStorage.setItem("prontio_pacientes_cols_visiveis", JSON.stringify(config));
  } catch (e) {
    console.warn("Erro ao salvar configuração de colunas:", e);
  }
}
