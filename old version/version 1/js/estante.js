// Estante pessoal: combina o catálogo com os status salvos no navegador.
// Depende de livros.js, utils.js e armazenamento.js, carregados antes.

/* As cópias mantêm LIVROS intacto e permitem reutilizar filtros e desenho. */
function obterLivrosUsuario(dados = carregarDadosUsuario(), incluirRemovidos = false) {
  const catalogo = new Map(LIVROS.map((livro) => [livro.id, { ...livro }]));
  for (const [id, cadastro] of Object.entries(dados.cadastros)) {
    catalogo.set(id, { id, status: "quero-ler", ...(catalogo.get(id) || {}), ...cadastro });
  }
  return [...catalogo.values()].filter((livro) => incluirRemovidos || !dados.removidos.includes(livro.id))
    .map((livro) => ({ ...livro, paginaAtual: 0, totalPaginas: 0, anotacoes: "",
      ...(Object.hasOwn(dados.detalhes, livro.id) ? dados.detalhes[livro.id] : {}),
      status: Object.hasOwn(dados.livros, livro.id) ? dados.livros[livro.id] : livro.status,
    }));
}

/* Ponto único de alteração. Só emite o evento depois de salvar com sucesso.
   O evento também será escutado por gamification.js na próxima etapa. */
function alterarStatusLivro(livroId, novoStatus) {
  const livro = obterLivrosUsuario().find((item) => item.id === livroId);
  if (!livro || !Object.hasOwn(ROTULOS_STATUS, novoStatus)) return false;

  // Relê o estado completo para preservar XP e conquistas de outros módulos.
  const dados = carregarDadosUsuario();
  const anterior = Object.hasOwn(dados.livros, livroId) ? dados.livros[livroId] : livro.status;
  if (anterior === novoStatus) return true; // Sem mudança, sem evento/XP.

  // defineProperty também trata IDs especiais como propriedades comuns.
  Object.defineProperty(dados.livros, livroId, {
    value: novoStatus, enumerable: true, configurable: true, writable: true,
  });
  // A gamificação prepara XP na mesma cópia: status e progresso salvam juntos.
  document.dispatchEvent(new CustomEvent("livro:status-preparando", {
    detail: { livroId, anterior, atual: novoStatus, dados },
  }));
  if (!salvarDadosUsuario(dados)) return false;

  document.dispatchEvent(new CustomEvent("livro:status-alterado", {
    detail: { livroId, anterior, atual: novoStatus },
  }));
  return true;
}
