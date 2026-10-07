// Tela inicial: apresentação visual. Não tem formulários nem números; só mostra a marca,
// a sugestão do dia, os livros da estante em movimento e uma frase.
function renderizarInicio() {
  const dados = carregarDadosUsuario(), livros = obterLivrosUsuario(dados);
  document.getElementById("inicio-saudacao").textContent = dados.preferencias.nome ? `Biblioteca de ${dados.preferencias.nome}` : "Biblioteca pessoal";
  const sugestao = escolherSugestao(livros, "dia");
  renderizarVitrine3D(sugestao, descobrir.dados.get(sugestao?.id));   // js/efeitos.js
  renderizarMarquee(livros);                                           // js/efeitos.js
  if (sugestao && !descobrir.dados.has(sugestao.id)) {
    buscarDadosOnline(sugestao).then((d) => { descobrir.dados.set(sugestao.id, d); if (d?.capa && !document.getElementById("inicio").hidden) renderizarVitrine3D(sugestao, d); }).catch(() => {});
  }
}
document.getElementById("inicio").addEventListener("click", ({ target }) => {
  if (target.closest("[data-sugestao]")) return mostrarPagina("descobrir");
  const botao = target.closest("[data-abrir]");
  const livro = botao && obterLivrosUsuario().find((l) => l.id === botao.dataset.abrir);
  if (livro) abrirDetalhes(livro);
});
document.getElementById("inicio-explorar").addEventListener("click", () => mostrarPagina("biblioteca"));
document.getElementById("inicio-descobrir").addEventListener("click", () => mostrarPagina("descobrir"));
document.addEventListener("colecao:alterada", renderizarInicio);

// Controle explícito, além de hover, foco, modal aberto e movimento reduzido.
document.getElementById("pausar-passeio").addEventListener("click", (e) => {
  const pausado = e.currentTarget.getAttribute("aria-pressed") !== "true";
  e.currentTarget.setAttribute("aria-pressed", String(pausado));
  e.currentTarget.textContent = pausado ? "Continuar" : "Pausar";
  document.querySelector(".passeio").classList.toggle("passeio--pausado", pausado);
});
