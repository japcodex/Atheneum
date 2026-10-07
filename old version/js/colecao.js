// Dados pessoais: cadastros, páginas, anotações, listas e lixeira.
// O catálogo original continua sendo apenas a coleção inicial.
function validarColecao(dados) {
  const objeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const textos = (v) => Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim());
  const cadastros = dados.cadastros ?? {}, detalhes = dados.detalhes ?? {};
  const removidos = dados.removidos ?? [], listas = dados.listas ?? [];
  if (!objeto(cadastros) || !objeto(detalhes) || !textos(removidos) || !Array.isArray(listas)) throw Error("Coleção inválida.");
  const livrosValidados = Object.fromEntries(Object.entries(cadastros).map(([id, livro]) => {
    if (!id.trim() || !objeto(livro)) throw Error("Cadastro inválido.");
    return [id, validarCadastro(livro)];
  }));
  const notasValidadas = Object.fromEntries(Object.entries(detalhes).map(([id, leitura]) => {
    if (!id.trim() || !objeto(leitura)) throw Error("Leitura inválida.");
    return [id, validarLeitura(leitura)];
  }));
  const ids = new Set();
  for (const lista of listas) {
    if (!objeto(lista) || typeof lista.id !== "string" || !lista.id.trim() || ids.has(lista.id)
      || typeof lista.nome !== "string" || !lista.nome.trim() || lista.nome.length > 80 || !textos(lista.livros)) throw Error("Lista inválida.");
    ids.add(lista.id);
  }
  return { cadastros: livrosValidados, detalhes: notasValidadas, removidos: [...new Set(removidos)],
    listas: listas.map((l) => ({ id: l.id, nome: l.nome.trim(), livros: [...new Set(l.livros)] })) };
}

function validarCadastro(livro) {
  const campos = ["titulo", "autor", "categoria", "grupo", "descricao", "capa"];
  const resultado = {};
  for (const campo of campos) {
    if (typeof livro[campo] !== "string") throw Error(`Campo inválido: ${campo}.`);
    resultado[campo] = livro[campo].trim();
  }
  if (!resultado.titulo || resultado.titulo.length > 250 || resultado.autor.length > 250
      || !CATEGORIAS.some((c) => c.id === resultado.categoria)) throw Error("Confira título, autor e categoria.");
  if (resultado.capa && !/^(https?:\/\/|img\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(resultado.capa)) throw Error("Use uma imagem, um endereço HTTP ou um caminho dentro de img/.");
  if (resultado.capa.length > 1000000 || resultado.descricao.length > 10000) throw Error("Capa ou descrição muito grande.");
  resultado.grupo ||= "Minha coleção";
  resultado.nota = Number.isFinite(livro.nota) ? Math.max(0, Math.min(5, livro.nota)) : 0;
  return resultado;
}

function validarLeitura(leitura) {
  const { paginaAtual, totalPaginas, anotacoes } = leitura;
  if (![paginaAtual, totalPaginas].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 100000)
      || (totalPaginas > 0 && paginaAtual > totalPaginas)) throw Error("A página atual não pode ultrapassar o total de páginas.");
  if (typeof anotacoes !== "string" || anotacoes.length > 100000) throw Error("As anotações devem ter até 100.000 caracteres.");
  return { paginaAtual, totalPaginas, anotacoes };
}

function criarIdUsuario(prefixo) {
  return `${prefixo}-${[...crypto.getRandomValues(new Uint32Array(4))].map((n) => n.toString(16)).join("-")}`;
}
function definirRegistro(objeto, id, valor) {
  Object.defineProperty(objeto, id, { value: valor, enumerable: true, writable: true, configurable: true });
}

/* Uma gravação reúne cadastro, leitura, listas e eventual recompensa. */
function salvarLivroPessoal(id, cadastro, leitura, status, idsListas) {
  const dados = carregarDadosUsuario();
  const anterior = id ? obterLivrosUsuario(dados).find((l) => l.id === id) : null;
  if (id && !anterior) throw Error("Livro não encontrado.");
  if (!Object.hasOwn(ROTULOS_STATUS, status)) throw Error("Situação inválida.");
  if (!Array.isArray(idsListas) || idsListas.some((x) => !dados.listas.some((l) => l.id === x))) throw Error("Lista não encontrada. Reabra o livro.");
  id ||= criarIdUsuario("livro");
  definirRegistro(dados.cadastros, id, validarCadastro(cadastro));
  definirRegistro(dados.detalhes, id, validarLeitura(leitura));
  definirRegistro(dados.livros, id, status);
  for (const lista of dados.listas) {
    lista.livros = lista.livros.filter((x) => x !== id);
    if (idsListas.includes(lista.id)) lista.livros.push(id);
  }
  const mudanca = { livroId: id, anterior: anterior?.status ?? "quero-ler", atual: status, dados };
  document.dispatchEvent(new CustomEvent("livro:status-preparando", { detail: mudanca }));
  if (!salvarDadosUsuario(dados)) throw Error("Não foi possível salvar. O armazenamento pode estar cheio; tente uma capa menor.");
  document.dispatchEvent(new CustomEvent("colecao:alterada"));
  if (mudanca.anterior !== status) document.dispatchEvent(new CustomEvent("livro:status-alterado", { detail: mudanca }));
  return id;
}

function removerLivroPessoal(id, restaurar = false) {
  const dados = carregarDadosUsuario();
  if (!obterLivrosUsuario(dados, true).some((l) => l.id === id)) throw Error("Livro não encontrado.");
  dados.removidos = dados.removidos.filter((x) => x !== id);
  if (!restaurar) dados.removidos.push(id);
  if (!salvarDadosUsuario(dados)) throw Error("Não foi possível salvar a alteração.");
  document.dispatchEvent(new CustomEvent("colecao:alterada"));
}

function salvarListaPessoal(id, nome) {
  const dados = carregarDadosUsuario();
  nome = nome.trim();
  if (!nome || nome.length > 80) throw Error("Use um nome de até 80 caracteres.");
  if (dados.listas.some((l) => l.id !== id && normalizar(l.nome) === normalizar(nome))) throw Error("Já existe uma lista com esse nome.");
  if (id) {
    const lista = dados.listas.find((l) => l.id === id);
    if (!lista) throw Error("Lista não encontrada.");
    lista.nome = nome;
  } else { id = criarIdUsuario("lista"); dados.listas.push({ id, nome, livros: [] }); }
  if (!salvarDadosUsuario(dados)) throw Error("Não foi possível salvar a lista.");
  document.dispatchEvent(new CustomEvent("colecao:alterada"));
  return id;
}
function excluirListaPessoal(id) {
  const dados = carregarDadosUsuario();
  dados.listas = dados.listas.filter((l) => l.id !== id);
  if (!salvarDadosUsuario(dados)) throw Error("Não foi possível excluir a lista.");
  document.dispatchEvent(new CustomEvent("colecao:alterada"));
}
