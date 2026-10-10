// Gamificação: prepara XP/conquistas antes da gravação e avisa após o sucesso.
// Nenhuma função deste arquivo altera HTML ou CSS.
const XP_POR_STATUS = { "quero-ler": 0, "lendo": 10, "lido": 50 };
const XP_POR_NIVEL = 100;
const CONQUISTAS_LEITURA = [
  { id: "primeiro-passo", nome: "Aprendiz de Atenas", quantidade: 1, tipo: "qualquer", icone: "livro", descricao: "Comece ou conclua seu primeiro livro." },
  { id: "primeiro-tomo", nome: "Primeiro Tomo", quantidade: 1, tipo: "lido", icone: "verificar", descricao: "Conclua um livro." },
  { id: "guardiao-da-chama", nome: "Guardião da Chama", quantidade: 5, tipo: "lido", icone: "estrela", descricao: "Conclua 5 livros." },
  { id: "arquiteto-do-saber", nome: "Arquiteto do Saber", quantidade: 10, tipo: "lido", icone: "colecao", descricao: "Conclua 10 livros." },
  { id: "sabio-da-agora", nome: "Sábio da Ágora", quantidade: 25, tipo: "lido", icone: "trofeu", descricao: "Conclua 25 livros." },
  { id: "legado-de-atena", nome: "Legado de Atena", quantidade: 50, tipo: "lido", icone: "trofeu", descricao: "Conclua 50 livros." },
  { id: "primeira-reflexao", nome: "Primeira Reflexão", quantidade: 1, tipo: "notas", icone: "pena", descricao: "Guarde uma anotação em um livro." },
  { id: "escriba", nome: "Escriba da Biblioteca", quantidade: 5, tipo: "notas", icone: "nota", descricao: "Anote suas ideias em 5 livros." },
  { id: "cem-paginas", nome: "Além do Prólogo", quantidade: 100, tipo: "paginas", icone: "pagina", descricao: "Registre 100 páginas lidas no total." },
  { id: "quinhentas-paginas", nome: "Entre Pergaminhos", quantidade: 500, tipo: "paginas", icone: "pagina", descricao: "Registre 500 páginas lidas no total." },
  { id: "mil-paginas", nome: "Uma Longa Odisseia", quantidade: 1000, tipo: "paginas", icone: "livro", descricao: "Registre 1.000 páginas lidas no total." },
  { id: "primeira-lista", nome: "Curador de Ideias", quantidade: 1, tipo: "listas", icone: "lista", descricao: "Crie sua primeira lista de livros." },
  { id: "cinco-listas", nome: "Cartógrafo do Saber", quantidade: 5, tipo: "listas", icone: "lista", descricao: "Organize 5 listas pessoais." },
  { id: "primeiro-cadastro", nome: "Novo Pergaminho", quantidade: 1, tipo: "cadastros", icone: "mais", descricao: "Adicione um livro próprio à coleção." },
  { id: "dez-cadastros", nome: "Acervo Particular", quantidade: 10, tipo: "cadastros", icone: "colecao", descricao: "Adicione 10 livros próprios à coleção." },
  { id: "tres-saberes", nome: "Múltiplos Saberes", quantidade: 3, tipo: "categorias", icone: "estrela", descricao: "Conclua livros de 3 categorias diferentes." },
];
let gamificacaoIniciada = false;

/* Cálculo puro: nível/pilares sempre derivam do XP salvo.
   Cada nível exige 100 XP; não há limite máximo de nível. */
function calcularNivel(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error("XP inválido.");
  const nivel = Math.floor(xp / XP_POR_NIVEL) + 1;
  const xpNoNivel = xp % XP_POR_NIVEL;
  const titulo = nivel >= 6 ? "Filósofo de Atenas"
    : nivel >= 3 ? "Guardião da Chama" : "Aprendiz de Atenas";
  return { nivel, titulo, xpNoNivel, xpProximoNivel: XP_POR_NIVEL,
    percentual: xpNoNivel / XP_POR_NIVEL * 100 };
}

/* Modifica apenas a cópia recebida. A estante fará UMA gravação de tudo.
   Chaves únicas impedem XP extra ao alternar status ou repetir eventos. */
function concederXp(dados, chave, pontos) {
  if (typeof chave !== "string" || !chave.trim()
      || !Number.isSafeInteger(pontos) || pontos <= 0) return false;
  const progresso = dados.progresso;
  if (progresso.recompensas.includes(chave)
      || !Number.isSafeInteger(progresso.xp + pontos)) return false;
  progresso.xp += pontos;
  progresso.recompensas.push(chave);
  return true;
}

/* Conta livros premiados, não o status atual. Conquistas já obtidas ficam.
   JSON.stringify no ID evita colisões mesmo se um ID contiver separadores. */
/* Os totais vêm de registros reais; não é preciso trocar o status para
   reconhecer anotações, listas ou páginas. Emblemas não são revogados. */
function medirConquistas(dados) {
  const livros = obterLivrosUsuario(dados, true), iniciados = new Set(), concluidos = new Set(), categorias = new Set();
  for (const livro of livros) {
    const chave = `livro:${JSON.stringify(livro.id)}:`;
    const lido = livro.status === "lido" || dados.progresso.recompensas.includes(`${chave}lido`);
    if (lido) { concluidos.add(livro.id); categorias.add(livro.categoria); }
    if (lido || livro.status === "lendo" || dados.progresso.recompensas.includes(`${chave}lendo`)) iniciados.add(livro.id);
  }
  const originais = new Set(LIVROS.map((l) => l.id));
  return { qualquer: iniciados.size, lido: concluidos.size, categorias: categorias.size,
    notas: livros.filter((l) => l.anotacoes.trim()).length,
    paginas: livros.reduce((n, l) => n + l.paginaAtual, 0), listas: dados.listas.length,
    cadastros: Object.keys(dados.cadastros).filter((id) => !originais.has(id)).length };
}
function verificarConquistas(dados) {
  const totais = medirConquistas(dados), novas = [];
  for (const conquista of CONQUISTAS_LEITURA) {
    if (totais[conquista.tipo] >= conquista.quantidade && !dados.progresso.conquistas.includes(conquista.id)) {
      dados.progresso.conquistas.push(conquista.id); novas.push(conquista.id);
    }
  }
  return novas;
}

/* Recebe a mudança preparada pela estante; ainda não salva nem emite sucesso. */
function processarMudancaStatus({ livroId, anterior, atual, dados }) {
  if (anterior === atual || !Object.hasOwn(XP_POR_STATUS, atual)) return false;
  const livro = obterLivrosUsuario(dados).find((item) => item.id === livroId);
  if (!livro || !Object.hasOwn(dados.livros, livroId) || dados.livros[livroId] !== atual) return false;
  const premiado = concederXp(dados, `livro:${JSON.stringify(livroId)}:${atual}`, XP_POR_STATUS[atual]);
  verificarConquistas(dados);
  return premiado;
}

/* A aba Santuário poderá ler este retrato sem conhecer o armazenamento. */
function obterProgressoUsuario() {
  const { progresso } = carregarDadosUsuario();
  return { ...progresso, ...calcularNivel(progresso.xp) };
}

/* Idempotente: chamar novamente não duplica listeners nem recompensas. */
function iniciarGamificacao() {
  if (gamificacaoIniciada) return;
  document.addEventListener("livro:status-preparando", (evento) => {
    processarMudancaStatus(evento.detail);
  });
  document.addEventListener("livro:status-alterado", () => {
    document.dispatchEvent(new CustomEvent("progresso:atualizado", {
      detail: obterProgressoUsuario(),
    }));
  });
  gamificacaoIniciada = true;
}

iniciarGamificacao();
