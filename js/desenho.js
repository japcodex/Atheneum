//Pasta das capas
const PASTA_CAPAS = "img/capas/";

//Erro de imagem
function criarCapa(livro) {
  const { matiz } = aparencia(livro);
  const capa = criar("span", "capa");
  capa.style.setProperty("--matiz", matiz);    // passa a cor para o CSS

  const imagem = criar("img", "capa__imagem");
  imagem.src = livro.capa || `${PASTA_CAPAS}${livro.id}.jpg`;
  imagem.alt = `Capa de ${livro.titulo}`;
  imagem.loading = "lazy";                     // só baixa quando aparece na tela
  imagem.addEventListener("error", () => imagem.remove());  // sem arquivo? some
  capa.append(imagem);

  // Capa desenhada (fica por baixo da imagem)
  capa.append(criar("span", "capa__titulo", livro.titulo));
  if (livro.autor) capa.append(criar("span", "capa__autor", livro.autor));
  return capa;
}

//Criar livro
function criarLivro(livro) {
  const { matiz, altura, largura } = aparencia(livro);

  const botao = criar("button", "livro");
  botao.type = "button";
  botao.dataset.id = livro.id;  // guarda o id para sabermos qual livro foi clicado
  botao.title = livro.autor ? `${livro.titulo}, de ${livro.autor}` : livro.titulo;
  botao.style.setProperty("--matiz", matiz);
  botao.style.setProperty("--altura", `${altura}px`);
  botao.style.setProperty("--largura", `${largura}px`);

  // Lombada. Em séries ("The Witcher — O Último Desejo") mostra só o volume.
  const lombada = criar("span", "livro__lombada");
  lombada.append(criar("span", "livro__texto", livro.titulo.split(" — ").pop()));

  // Legenda (texto embaixo da capa): título, autor e nota (ou status)
  const legenda = criar("span", "livro__legenda");
  legenda.append(criar("span", "livro__nome", livro.titulo));
  if (livro.autor) legenda.append(criar("span", "livro__autor", livro.autor));
  legenda.append(criar("span", `selo selo--${livro.status}`, ROTULOS_STATUS[livro.status] ?? livro.status));
  if (livro.paginaAtual || livro.totalPaginas) legenda.append(criar("span", "livro__progresso", `Pág. ${livro.paginaAtual}${livro.totalPaginas ? ` de ${livro.totalPaginas}` : ""}`));
  if (livro.anotacoes) legenda.append(criar("span", "livro__anotado", "Com anotações"));

  // A ficha só aparece no modo Detalhes; conteúdo pessoal entra como texto.
  const ficha = criar("span", "livro__ficha");
  const categoria = CATEGORIAS.find((c) => c.id === livro.categoria);
  ficha.append(criar("span", "ficha__tema", categoria?.nome || livro.categoria));
  ficha.append(criar("span", "ficha__descricao", livro.descricao || "Uma história esperando pelo seu primeiro encontro."));
  ficha.append(criar("span", "ficha__nota", livro.anotacoes ? `“${livro.anotacoes.slice(0, 180)}${livro.anotacoes.length > 180 ? "…" : ""}”` : "Seu bilhete fica aqui. Abra o livro e anote o que ficou com você."));
  if (livro.totalPaginas) {
    const barra = criar("progress", "ficha__progresso");
    barra.max = livro.totalPaginas; barra.value = livro.paginaAtual || 0;
    barra.setAttribute("aria-label", `${livro.paginaAtual || 0} de ${livro.totalPaginas} páginas`);
    ficha.append(barra);
  }
  ficha.append(criar("span", "ficha__abrir", "Abrir meu caderno ↗"));
  botao.append(lombada, criarCapa(livro), legenda, ficha);
  if (caminhoPdf(livro)) botao.append(criar("span", "livro__pdf", "PDF"));   // js/leitor-pdf.js

  const item = criar("li", "prateleira__item");
  item.append(botao);
  return item;
}

/* criarPrateleira("C. S. Lewis", [livros...], "titulo") */
function criarPrateleira(nomeDoGrupo, livros, ordem) {
  const prateleira = criar("div", "prateleira");

  const titulo = criar("h3", "prateleira__placa", nomeDoGrupo);
  titulo.append(criar("span", "prateleira__total", String(livros.length)));

  const lista = criar("ul", "prateleira__livros");
  lista.append(...ordenar(livros, ordem).map(criarLivro));

  prateleira.append(titulo, lista);
  return prateleira;
}

/* agruparPor(livros, "grupo") separa os livros por autor/tema,
   mantendo a ordem em que cada grupo aparece pela primeira vez. */
function agruparPor(livros, campo) {
  const grupos = new Map();
  for (const livro of livros) {
    if (!grupos.has(livro[campo])) grupos.set(livro[campo], []);
    grupos.get(livro[campo]).push(livro);
  }
  return grupos;
}

/* criarSecao(categoria, livros, ordem) monta uma categoria inteira
   (título, descrição e todas as prateleiras dela). */
function criarSecao(categoria, livros, ordem) {
  const secao = criar("section", "secao");
  secao.setAttribute("aria-labelledby", `secao-${categoria.id}`);

  const cabecalho = criar("header", "secao__cabecalho");
  const titulo = criar("h2", "secao__titulo", categoria.nome);
  titulo.id = `secao-${categoria.id}`;
  cabecalho.append(titulo, criar("p", "secao__descricao", categoria.descricao));
  secao.append(cabecalho);

  for (const [nomeDoGrupo, doGrupo] of agruparPor(livros, "grupo")) {
    secao.append(criarPrateleira(nomeDoGrupo, doGrupo, ordem));
  }
  return secao;
}

/* Mensagem mostrada quando a busca não acha nada. */
function criarVazio() {
  const vazio = criar("div", "vazio");
  vazio.append(
    criar("p", "vazio__titulo", "Nenhum livro encontrado."),
    criar("p", "vazio__texto", "Tente outro termo de busca ou limpe os filtros."),
  );
  const botao = criar("button", "botao", "Limpar filtros");
  botao.type = "button";
  botao.dataset.acao = "limpar";
  vazio.append(botao);
  return vazio;
}

/* renderizarEstantes(...) é a função principal deste arquivo.
   Apaga o que está na tela e desenha tudo de novo com os livros recebidos. */
function renderizarEstantes(raiz, livros, estadoAtual) {
  const { ordem, visao } = estadoAtual;
  raiz.dataset.visao = visao;   // o CSS usa isso para trocar Capas <-> Estante

  if (!livros.length) {
    const vazio = criarVazio();
    if (estadoAtual.lista) vazio.querySelector(".vazio__texto").textContent = "Adicione um livro ou abra um título da coleção e marque esta lista.";
    raiz.replaceChildren(vazio);
    document.getElementById("paginacao").replaceChildren();
    return;
  }

  const porPagina = 24, paginas = Math.ceil(livros.length / porPagina);
  if (visao === "carrossel") {
    const ordenados = ordenar(livros, ordem);
    const secoes = CATEGORIAS.map((c) => [c, ordenados.filter((l) => l.categoria === c.id)])
      .filter(([, itens]) => itens.length).map(([c, itens]) => criarCarrossel(c.nome, itens, `${itens.length} livros nesta prateleira`));
    raiz.replaceChildren(...secoes); document.getElementById("paginacao").replaceChildren(); return;
  }
  estadoAtual.pagina = Math.max(1, Math.min(estadoAtual.pagina, paginas));
  const inicio = (estadoAtual.pagina - 1) * porPagina;
  const grade = criar("ul", "catalogo__grade");
  grade.append(...ordenar(livros, ordem).slice(inicio, inicio + porPagina).map(criarLivro));
  raiz.replaceChildren(grade);
  const anterior = criar("button", "chip", "← Anterior"), proximo = criar("button", "chip", "Próxima →");
  anterior.type = proximo.type = "button";
  anterior.dataset.paginaLivros = estadoAtual.pagina - 1;
  proximo.dataset.paginaLivros = estadoAtual.pagina + 1;
  anterior.disabled = estadoAtual.pagina === 1; proximo.disabled = estadoAtual.pagina === paginas;
  document.getElementById("paginacao").replaceChildren(anterior, criar("span", "texto-suave", `${estadoAtual.pagina} / ${paginas}`), proximo);
}
