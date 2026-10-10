//Principal
const ESTADO_INICIAL = {
  busca: "",             // texto digitado na lupa
  categoria: "todas",    // "todas" ou o id de uma categoria (ex.: "classicos")
  grupo: "todos",        // "todos" ou o nome de uma prateleira (ex.: "C. S. Lewis")
  status: "todos",       // "todos", "lido", "lendo" ou "quero-ler"
  ordem: "estante",      // "estante", "titulo", "autor" ou "nota"
  visao: "capas",        // "capas" ou "lista".
  lista: null, lixeira: false, pagina: 1,
};
const estado = { ...ESTADO_INICIAL };   // cópia que vai mudando durante o uso

/* Atalho: $("#busca") é o mesmo que document.querySelector("#busca"). */
const $ = (seletor) => document.querySelector(seletor);

/* Guarda os elementos da página que vamos usar (ids definidos em index.html). */
const elementos = {
  estantes: $("#estantes"),
  busca: $("#busca"),
  categorias: $("#categorias"),
  grupos: $("#grupos"),
  status: $("#status"),
  ordem: $("#ordem"),
  visoes: $("#visoes"),
  resumo: $("#resumo"),
  fraseTexto: $("#frase-texto"),
  fraseAutor: $("#frase-autor"),
};

/* ---------- 1. Atualizar a tela ---------- */

function atualizar() {
  const dados = carregarDadosUsuario();
  const todos = obterLivrosUsuario(dados, estado.lixeira);
  const lista = dados.listas.find((item) => item.id === estado.lista);
  if (estado.lista && !lista) estado.lista = null;
  let colecao = estado.lixeira ? todos.filter((l) => dados.removidos.includes(l.id)) : todos;
  if (lista && !estado.lixeira) colecao = colecao.filter((l) => lista.livros.includes(l.id));
  const livros = filtrar(colecao, estado);

  // 2) desenha as estantes
  renderizarEstantes(elementos.estantes, livros, estado);
  document.dispatchEvent(new CustomEvent("estantes:atualizadas"));

  // 3) escreve o resumo ("25 de 137 livros")
  elementos.resumo.textContent = `${livros.length} ${livros.length === 1 ? "livro" : "livros"}${lista ? " nesta lista" : " na coleção"}`;
  $("#biblioteca-titulo").textContent = estado.lixeira ? "Livros removidos" : lista?.nome || "Sua biblioteca";
  $("#biblioteca-descricao").textContent = estado.lixeira ? "Abra um título para restaurar suas páginas, listas e anotações."
    : lista ? "Uma seleção sua. Abra um livro para editar a leitura e suas listas." : "As suas leituras, do primeiro interesse à última página.";
  $("#acoes-lista").hidden = !lista || estado.lixeira;
  $("#novo-livro").hidden = estado.lixeira;
  renderizarListas(dados);

  // 4) marca qual aba e qual modo estão ativos (o CSS destaca o "pressionado")
  for (const botao of elementos.categorias.children) {
    botao.setAttribute("aria-pressed", String(botao.dataset.categoria === estado.categoria));
  }
  for (const botao of elementos.visoes.children) {
    botao.setAttribute("aria-pressed", String(botao.dataset.visao === estado.visao));
  }
}

/* ---------- 2. Montar as abas e os chips ---------- */

/* Cria as abas: Todas | Clássicos | Ficção | Carreira (com a contagem). */
function montarCategorias() {
  const opcoes = [{ id: "todas", nome: "Todas" }, ...CATEGORIAS];
  const todos = obterLivrosUsuario();

  const botoes = opcoes.map(({ id, nome }) => {
    const total = id === "todas"
      ? todos.length
      : todos.filter((livro) => livro.categoria === id).length;

    const botao = criar("button", "aba", nome);
    botao.append(criar("span", "aba__total", String(total)));
    botao.type = "button";
    botao.dataset.categoria = id;
    return botao;
  });

  elementos.categorias.replaceChildren(...botoes);
}

/* Cria a linha de prateleiras (autores/temas) da categoria escolhida. */
function montarGrupos() {
  const nomes = estado.categoria === "todas"
    ? []
    : [...new Set(obterLivrosUsuario().filter((l) => l.categoria === estado.categoria).map((l) => l.grupo))];

  elementos.grupos.hidden = nomes.length === 0;   // esconde se não houver categoria escolhida

  const botoes = ["todos", ...nomes].map((nome) => {
    const botao = criar("button", "chip chip--pequeno", nome === "todos" ? "Todas as prateleiras" : nome);
    botao.type = "button";
    botao.dataset.grupo = nome;
    botao.setAttribute("aria-pressed", String(nome === estado.grupo));
    return botao;
  });

  elementos.grupos.replaceChildren(...(nomes.length ? botoes : []));
}

/* ---------- 3. Reagir aos cliques e à digitação ---------- */

function limparFiltros() {
  Object.assign(estado, ESTADO_INICIAL, { visao: estado.visao });  // mantém o modo atual
  elementos.busca.value = "";
  elementos.status.value = estado.status;
  elementos.ordem.value = estado.ordem;
  montarGrupos();
  atualizar();
}

function registrarEventos() {
  // Redesenha as estantes usando o status pessoal recém-salvo.
  document.addEventListener("livro:status-alterado", atualizar);
  document.addEventListener("colecao:alterada", () => { montarCategorias(); montarGrupos(); atualizar(); });
  $("#novo-livro").addEventListener("click", () => abrirDetalhes(null));
  $("#paginacao").addEventListener("click", ({ target }) => {
    const botao = target.closest("[data-pagina-livros]");
    if (!botao) return;
    estado.pagina = Number(botao.dataset.paginaLivros); atualizar();
    elementos.estantes.focus(); elementos.estantes.scrollIntoView({ block: "start" });
  });

  // Digitou na busca
  elementos.busca.addEventListener("input", () => {
    estado.busca = elementos.busca.value;
    estado.pagina = 1;
    atualizar();
  });

  // Clicou numa aba de categoria
  elementos.categorias.addEventListener("click", ({ target }) => {
    const botao = target.closest("[data-categoria]");
    if (!botao) return;
    estado.categoria = botao.dataset.categoria;
    estado.pagina = 1;
    estado.grupo = "todos";     // trocou de categoria: volta para "todas as prateleiras"
    montarGrupos();
    atualizar();
  });

  // Clicou numa prateleira (autor/tema)
  elementos.grupos.addEventListener("click", ({ target }) => {
    const botao = target.closest("[data-grupo]");
    if (!botao) return;
    estado.grupo = botao.dataset.grupo;
    montarGrupos();
    atualizar();
  });

  // Mudou Situação ou Ordem
  elementos.status.addEventListener("change", () => { estado.status = elementos.status.value; estado.pagina = 1; atualizar(); });
  elementos.ordem.addEventListener("change", () => { estado.ordem = elementos.ordem.value; estado.pagina = 1; atualizar(); });

  // Clicou em Capas / Estante
  elementos.visoes.addEventListener("click", ({ target }) => {
    const botao = target.closest("[data-visao]");
    if (!botao) return;
    estado.visao = botao.dataset.visao;
    atualizar();
  });

  // Clicou em algum lugar das estantes: pode ser um livro ou "Limpar filtros"
  elementos.estantes.addEventListener("click", ({ target }) => {
    if (target.closest("[data-acao='limpar']")) return limparFiltros();

    const botao = target.closest(".livro");
    const livro = botao && obterLivrosUsuario(carregarDadosUsuario(), estado.lixeira).find((item) => item.id === botao.dataset.id);
    if (livro) abrirDetalhes(livro);
  });

  // Botão "Outra frase"
  $("#outra-frase").addEventListener("click", () => proximaFrase(elementos.fraseTexto, elementos.fraseAutor));

  // Atalho: apertar "/" leva direto para a busca
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "/" && !$("#biblioteca").hidden && !document.querySelector("dialog[open]")
        && !document.activeElement.matches("input, textarea, select, [contenteditable]")) {
      evento.preventDefault();
      elementos.busca.focus();
    }
  });
}

/* ---------- 4. Começar ---------- */

montarCategorias();
registrarEventos();
mostrarFrase(elementos.fraseTexto, elementos.fraseAutor);
atualizar();
