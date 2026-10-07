/* ==========================================================================
   DESCOBRIR  (aba com livros novos, fora da sua estante)

   Estados da tela:
     carregando  -> capas com brilho de espera enquanto o Open Library responde
     erro        -> aviso claro + botão para tentar de novo (as capas desenhadas ficam)
     vazio       -> você já tem tudo do gênero escolhido
   ========================================================================== */

const descobrir = { genero: "todos", limite: 12, dados: new Map(), erro: false, carregando: false };

/* Monta a "capa" de uma sugestão: usa a imagem online quando existe. */
function livroDeSugestao(sug) {
  const dados = descobrir.dados.get(sug.id);
  return { id: sug.id, titulo: sug.titulo, autor: sug.autor, capa: dados?.capa ?? "", categoria: sug.categoria };
}

function criarBotaoGuardar(sug) {
  const botao = criar("button", "botao botao--pequeno", "Guardar para ler");
  botao.type = "button";
  botao.addEventListener("click", () => {
    try {
      guardarSugestao(sug, descobrir.dados.get(sug.id));
      avisarUsuario(`"${sug.titulo}" foi para a sua lista de quero ler.`);
    } catch (erro) { avisarUsuario(erro.message); }
  });
  return botao;
}

function criarEncontrar(sug) {
  const detalhes = criar("details", "encontrar");
  detalhes.append(criar("summary", "", "Onde encontrar"));
  const lista = criar("ul");
  for (const { nome, url } of linksParaEncontrar(sug.titulo, sug.autor)) {
    const item = criar("li"), link = criar("a", "", nome);
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    item.append(link); lista.append(item);
  }
  detalhes.append(lista);
  return detalhes;
}

/* Sugestão da semana: destaque grande, com o livro em 3D. */
function criarSemana(sug) {
  const secao = criar("article", "semana__cartao");
  const livro = criarLivro3D(livroDeSugestao(sug), { largura: 190, altura: 285, espessura: 40, sugestao: true, abre: true });
  const texto = criar("div", "semana__texto");
  texto.append(criar("p", "sobretitulo", "Sugestão da semana"), criar("h2", "", sug.titulo), criar("p", "semana__autor", sug.autor),
    criar("p", "semana__motivo", sug.motivo), criar("p", "semana__genero", sug.genero));
  const acoes = criar("div", "semana__acoes");
  acoes.append(criarBotaoGuardar(sug), criarEncontrar(sug));
  texto.append(acoes);
  secao.append(livro, texto);
  return secao;
}

/* Uma linha da lista: capa pequena à esquerda, texto com hierarquia à direita. */
function criarLinha(sug, indice) {
  const linha = criar("li", "sugestao");
  linha.style.setProperty("--n", indice);
  const capa = criarCapa(livroDeSugestao(sug));
  capa.classList.add("capa--mini", "capa--sugestao");
  if (descobrir.carregando && !descobrir.dados.has(sug.id)) capa.classList.add("capa--esperando");
  const corpo = criar("div", "sugestao__corpo");
  corpo.append(criar("p", "sugestao__genero", sug.genero), criar("h3", "", sug.titulo), criar("p", "sugestao__autor", sug.autor), criar("p", "sugestao__motivo", sug.motivo));
  const acoes = criar("div", "sugestao__acoes");
  acoes.append(criarBotaoGuardar(sug), criarEncontrar(sug));
  corpo.append(acoes);
  linha.append(capa, corpo);
  return linha;
}

function renderizarDescobrir() {
  const livros = obterLivrosUsuario();
  const semana = escolherSugestao(livros, "semana");
  const disponiveis = sugestoesDisponiveis(livros);


  const caixaSemana = document.getElementById("descobrir-semana");
  caixaSemana.replaceChildren(...(semana ? [criarSemana(semana)] : []));
  caixaSemana.hidden = !semana;

  const generos = ["todos", ...GENEROS_SUGESTOES.filter((g) => disponiveis.some((s) => s.genero === g))];
  if (!generos.includes(descobrir.genero)) descobrir.genero = "todos";
  const filtradas = disponiveis.filter((s) => s.id !== semana?.id && (descobrir.genero === "todos" || s.genero === descobrir.genero));
  document.getElementById("descobrir-generos").replaceChildren(...generos.map((g) => {
    const botao = criar("button", "chip chip--pequeno", g === "todos" ? "Todos os gêneros" : g);
    botao.type = "button"; botao.dataset.genero = g; botao.setAttribute("aria-pressed", String(g === descobrir.genero));
    return botao;
  }));

  // Estados: carregando / erro / vazio
  const estado = document.getElementById("descobrir-status");
  estado.className = `descobrir__status${descobrir.erro ? " descobrir__status--erro" : ""}`;
  estado.replaceChildren();
  if (descobrir.carregando) estado.append(criar("span", "giro-espera"), document.createTextNode(" Buscando capas no Open Library…"));
  else if (descobrir.erro) {
    const tentar = criar("button", "botao-texto", "Tentar de novo"); tentar.type = "button"; tentar.dataset.acao = "tentar";
    estado.append(criar("span", "", "Sem conexão com o Open Library. Mostrando capas desenhadas. "), tentar);
  }

  const lista = document.getElementById("descobrir-lista");
  if (!filtradas.length) {
    const vazio = criar("li", "vazio");
    vazio.append(criar("p", "vazio__titulo", disponiveis.length ? "Nada mais neste gênero." : "Você já tem todas as sugestões."),
      criar("p", "vazio__texto", disponiveis.length ? "Tudo o que sugerimos aqui já está na sua estante. Escolha outro gênero." : "Você pode adicionar outros títulos diretamente na Biblioteca."));
    lista.replaceChildren(vazio);
  } else lista.replaceChildren(...filtradas.slice(0, descobrir.limite).map(criarLinha));
  const mais = document.getElementById("descobrir-mais");
  mais.hidden = filtradas.length <= descobrir.limite;
  mais.textContent = `Mostrar mais ${Math.min(12, Math.max(0, filtradas.length - descobrir.limite))} livros`;
}

/* Busca capas de todas as sugestões visíveis, uma de cada vez para não sobrecarregar o serviço. */
async function carregarCapasDescobrir() {
  if (descobrir.carregando) return;
  const livros = obterLivrosUsuario();
  const pendentes = [escolherSugestao(livros, "semana"), ...sugestoesDisponiveis(livros).filter((s) => s.id !== escolherSugestao(livros, "semana")?.id && (descobrir.genero === "todos" || s.genero === descobrir.genero)).slice(0, descobrir.limite)].filter((s, i, v) => s && v.indexOf(s) === i && !descobrir.dados.has(s.id));
  if (!pendentes.length) return;
  descobrir.carregando = true; descobrir.erro = false; renderizarDescobrir();
  let falhas = 0;
  for (const sug of pendentes) {
    try { descobrir.dados.set(sug.id, await buscarDadosOnline(sug)); }
    catch { falhas++; if (falhas >= 2) break; }   // rede fora do ar: para de insistir
    if (document.getElementById("descobrir").hidden) break;
  }
  descobrir.carregando = false; descobrir.erro = falhas >= 2; renderizarDescobrir();
  if (document.getElementById("inicio") && !document.getElementById("inicio").hidden) renderizarInicio();
}

document.getElementById("descobrir-generos").addEventListener("click", ({ target }) => {
  const botao = target.closest("[data-genero]"); if (!botao) return;
  descobrir.genero = botao.dataset.genero; descobrir.limite = 12; renderizarDescobrir(); carregarCapasDescobrir();
});
document.getElementById("descobrir-status").addEventListener("click", ({ target }) => { if (target.closest("[data-acao='tentar']")) carregarCapasDescobrir(); });
document.getElementById("descobrir").addEventListener("click", ({ target }) => {
  const livro = target.closest("[data-sugestao]"); if (livro) document.getElementById("descobrir-semana").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.addEventListener("colecao:alterada", () => { if (!document.getElementById("descobrir").hidden) renderizarDescobrir(); });

document.getElementById("descobrir-mais").addEventListener("click", () => {
  descobrir.limite += 12; renderizarDescobrir(); carregarCapasDescobrir();
});
