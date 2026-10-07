/* ==========================================================================
   SUGESTÕES: lógica  (quais livros sugerir e de onde vêm as capas)

   - A sugestão do dia muda à meia-noite; a da semana, toda segunda-feira.
     A escolha é calculada pela data, então todo mundo vê a mesma no mesmo dia.
   - Capas e número de páginas vêm do Open Library (gratuito). Se a internet
     falhar, o site continua com capas desenhadas.
   ========================================================================== */

const CHAVE_CAPAS = "atheneum:capas-sugestoes";
const dias = (data = new Date()) => Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 864e5);

/* Sugestões que ainda não estão na estante, na ordem do arquivo. */
function sugestoesDisponiveis(livros) {
  const tenho = new Set(livros.map((l) => normalizar(l.titulo)));
  return SUGESTOES.filter((s) => !tenho.has(normalizar(s.titulo)));
}

/* escolherSugestao(livros, "dia") ou (livros, "semana"). Devolve null se não sobrar nenhuma. */
function escolherSugestao(livros, janela = "dia") {
  const lista = sugestoesDisponiveis(livros);
  if (!lista.length) return null;
  const passo = janela === "semana" ? Math.floor((dias() - 4) / 7) * 7 + 3 : dias();   // 5/jan/1970 foi uma segunda
  return lista[(Math.abs(hash(String(passo))) + (janela === "semana" ? 5 : 0)) % lista.length];
}

function lerCacheCapas() { try { return JSON.parse(localStorage.getItem(CHAVE_CAPAS)) || {}; } catch { return {}; } }
function gravarCacheCapas(cache) { try { localStorage.setItem(CHAVE_CAPAS, JSON.stringify(cache)); } catch { /* cache cheio: sem problema */ } }

/* Dados do Open Library para uma sugestão. Devolve { capa, paginas, ano } ou null (sem capa).
   Lança erro só quando a rede falha, para a tela poder mostrar o aviso. */
async function buscarDadosOnline(sugestao) {
  const cache = lerCacheCapas();
  if (Object.hasOwn(cache, sugestao.id)) return cache[sugestao.id];

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 7000);
  try {
    const url = `https://openlibrary.org/search.json?limit=1&fields=cover_i,number_of_pages_median,first_publish_year&title=${encodeURIComponent(sugestao.titulo)}&author=${encodeURIComponent(sugestao.autor.split(" e ")[0])}`;
    const resposta = await fetch(url, { signal: controle.signal });
    if (!resposta.ok) throw new Error("Serviço indisponível");
    const [achado] = (await resposta.json()).docs ?? [];
    const dados = achado?.cover_i ? { capa: `https://covers.openlibrary.org/b/id/${achado.cover_i}-M.jpg`, paginas: achado.number_of_pages_median || 0, ano: achado.first_publish_year || 0 } : null;
    gravarCacheCapas({ ...lerCacheCapas(), [sugestao.id]: dados });
    return dados;
  } finally { clearTimeout(limite); }
}

/* Links de busca: onde ler, comprar ou pedir emprestado. Não dependem de API. */
function linksParaEncontrar(titulo, autor) {
  const q = encodeURIComponent(`${titulo} ${autor}`.trim()), t = encodeURIComponent(titulo);
  return [
    { nome: "Sebo (Estante Virtual)", url: `https://www.estantevirtual.com.br/busca?q=${q}` },
    { nome: "Biblioteca mais próxima (WorldCat)", url: `https://search.worldcat.org/search?q=${q}` },
    { nome: "Livro grátis (Project Gutenberg)", url: `https://www.gutenberg.org/ebooks/search/?query=${t}` },
    { nome: "Audiolivro grátis (LibriVox)", url: `https://librivox.org/search?q=${t}&search_form=advanced` },
    { nome: "Resenhas (Goodreads)", url: `https://www.goodreads.com/search?q=${q}` },
  ];
}

/* Guarda a sugestão na estante como "quero ler". Devolve o id criado ou lança erro com mensagem clara. */
function guardarSugestao(sugestao, dadosOnline) {
  return salvarLivroPessoal(null,
    { titulo: sugestao.titulo, autor: sugestao.autor, categoria: sugestao.categoria, grupo: sugestao.genero, descricao: sugestao.motivo, capa: dadosOnline?.capa ?? "", nota: 0 },
    { paginaAtual: 0, totalPaginas: dadosOnline?.paginas ?? 0, anotacoes: "" }, "quero-ler", []);
}
