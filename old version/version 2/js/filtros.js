//Filtro
function filtrar(livros, { busca, categoria, status, grupo = "todos" }) {
  const termo = normalizar(busca);

  // .filter() percorre todos os livros e mantém só os que retornarem true.
  return livros.filter((livro) => {
    if (categoria !== "todas" && livro.categoria !== categoria) return false;
    if (grupo !== "todos" && livro.grupo !== grupo) return false;
    if (status !== "todos" && livro.status !== status) return false;

    if (!termo) return true; // sem busca digitada: o livro passa

    // Junta título, autor, prateleira e descrição num texto só e procura o termo.
    const texto = normalizar(`${livro.titulo} ${livro.autor} ${livro.grupo} ${livro.descricao}`);
    return texto.includes(termo);
  });
}

/* Formas de ordenar. Cada uma compara dois livros (a e b). */
const COMPARADORES = {
  titulo: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
  autor: (a, b) => (a.autor || "~").localeCompare(b.autor || "~", "pt-BR"),
  nota: (a, b) => b.nota - a.nota,
};

/* ordenar(livros, "titulo") -> mesma lista, em outra ordem.
   Com "estante" não mexe: mantém a ordem de data/livros.js. */
function ordenar(livros, ordem) {
  const comparar = COMPARADORES[ordem];
  return comparar ? [...livros].sort(comparar) : livros;
}
