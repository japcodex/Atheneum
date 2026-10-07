// Navegação por listas. Excluir uma lista nunca exclui os livros dela.
let listaEmEdicao = null;
function avisarUsuario(texto) {
  const aviso = document.getElementById("notificacao");
  aviso.textContent = texto; aviso.hidden = false;
  clearTimeout(avisarUsuario.temporizador);
  avisarUsuario.temporizador = setTimeout(() => { aviso.hidden = true; }, 5000);
}
function renderizarListas(dados) {
  const ativos = new Set(obterLivrosUsuario(dados).map((l) => l.id));
  const botoes = dados.listas.map((lista) => {
    const b = criar("button", "menu-item", lista.nome); b.type = "button"; b.dataset.lista = lista.id;
    b.append(criar("span", "", String(lista.livros.filter((id) => ativos.has(id)).length)));
    b.setAttribute("aria-pressed", String(estado.lista === lista.id && !estado.lixeira)); return b;
  });
  document.getElementById("minhas-listas").replaceChildren(...botoes);
  document.getElementById("listas-vazias").hidden = !!dados.listas.length;
  document.getElementById("total-lateral").textContent = ativos.size;
  document.getElementById("total-removidos").textContent = dados.removidos.length;
  document.getElementById("todos-livros").setAttribute("aria-pressed", String(!estado.lista && !estado.lixeira));
  document.getElementById("abrir-lixeira").setAttribute("aria-pressed", String(estado.lixeira));
}
function selecionarLista(id = null, lixeira = false) {
  Object.assign(estado, ESTADO_INICIAL, { lista: id, lixeira, visao: estado.visao });
  elementos.busca.value = ""; elementos.status.value = "todos"; elementos.ordem.value = estado.ordem;
  montarGrupos(); atualizar();
}
function abrirEditorLista(id = null) {
  listaEmEdicao = id;
  const lista = carregarDadosUsuario().listas.find((l) => l.id === id);
  document.getElementById("lista-nome").value = lista?.nome || "";
  document.getElementById("lista-titulo").textContent = id ? "Renomear lista" : "Nova lista";
  document.getElementById("lista-aviso").textContent = "";
  document.getElementById("lista-editor").showModal(); document.getElementById("lista-nome").focus();
}
document.getElementById("nova-lista").addEventListener("click", () => abrirEditorLista());
document.getElementById("renomear-lista").addEventListener("click", () => abrirEditorLista(estado.lista));
document.getElementById("cancelar-lista").addEventListener("click", () => document.getElementById("lista-editor").close());
document.getElementById("lista-form").addEventListener("submit", (evento) => {
  evento.preventDefault();
  try {
    const id = salvarListaPessoal(listaEmEdicao, document.getElementById("lista-nome").value);
    document.getElementById("lista-editor").close(); selecionarLista(id); avisarUsuario("Lista salva.");
  } catch (erro) { document.getElementById("lista-aviso").textContent = erro.message; }
});
document.getElementById("todos-livros").addEventListener("click", () => selecionarLista());
document.getElementById("abrir-lixeira").addEventListener("click", () => selecionarLista(null, true));
document.getElementById("minhas-listas").addEventListener("click", ({ target }) => {
  const b = target.closest("[data-lista]"); if (b) selecionarLista(b.dataset.lista);
});
document.getElementById("excluir-lista").addEventListener("click", () => {
  if (!confirm("Excluir esta lista? Os livros continuarão na biblioteca.")) return;
  try { excluirListaPessoal(estado.lista); selecionarLista(); avisarUsuario("Lista excluída; livros preservados."); }
  catch (erro) { avisarUsuario(erro.message); }
});
