// Gamificação: prepara XP/conquistas antes da gravação e avisa após o sucesso.
// Nenhuma função deste arquivo altera HTML ou CSS.
const XP_POR_STATUS = { "quero-ler": 0, "lendo": 10, "lido": 50 };
const XP_POR_NIVEL = 100;
const CONQUISTAS_LEITURA = [
  { id: "primeiro-passo", nome: "Aprendiz de Atenas", quantidade: 1, tipo: "qualquer" },
  { id: "primeiro-tomo", nome: "Primeiro Tomo", quantidade: 1, tipo: "lido" },
  { id: "guardiao-da-chama", nome: "Guardião da Chama", quantidade: 5, tipo: "lido" },
  { id: "arquiteto-do-saber", nome: "Arquiteto do Saber", quantidade: 10, tipo: "lido" },
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
function verificarConquistas(dados) {
  const iniciados = new Set();
  const concluidos = new Set();
  for (const livro of obterLivrosUsuario(dados, true)) {
    const chave = `livro:${JSON.stringify(livro.id)}:`;
    const lido = dados.progresso.recompensas.includes(`${chave}lido`);
    if (lido) concluidos.add(livro.id);
    if (lido || dados.progresso.recompensas.includes(`${chave}lendo`)) iniciados.add(livro.id);
  }
  const novas = [];
  for (const conquista of CONQUISTAS_LEITURA) {
    const quantidade = conquista.tipo === "lido" ? concluidos.size : iniciados.size;
    if (quantidade >= conquista.quantidade
        && !dados.progresso.conquistas.includes(conquista.id)) {
      dados.progresso.conquistas.push(conquista.id);
      novas.push(conquista.id);
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
