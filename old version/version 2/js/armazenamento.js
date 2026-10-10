// Persistência: guarda dados do usuário; não altera o catálogo nem a interface.
const CHAVE_DADOS_USUARIO = "atheneum:usuario";
const VERSAO_DADOS_USUARIO = 2;

/* Cada chamada cria objetos novos, evitando compartilhar o estado inicial. */
function criarDadosUsuario() {
  return {
    versao: VERSAO_DADOS_USUARIO,
    livros: {}, // { "id-do-livro": "lendo" }; ausentes usam o status do catálogo.
    cadastros: {}, detalhes: {}, removidos: [], listas: [],
    sessoes: [], // [{ id, livroId, data: "2026-10-06", minutos, paginas }]
    preferencias: preferenciasPadrao(),
    progresso: {
      xp: 0,
      recompensas: [], // Chaves únicas: "livro:id:lido" ou "foco:id-da-sessao".
      conquistas: [], // IDs dos emblemas; os nomes ficam na gamificação.
    },
  };
}

/* Valida o formato e devolve uma cópia com apenas os campos conhecidos.
   Nível e altura dos pilares serão calculados a partir do XP, não salvos. */
function validarDadosUsuario(dados) {
  const objeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);
  const lista = (valor) => Array.isArray(valor)
    && valor.every((item) => typeof item === "string" && item.trim() !== "");

  if (!objeto(dados) || ![1, VERSAO_DADOS_USUARIO].includes(dados.versao)) {
    throw new Error("Versão dos dados não suportada.");
  }
  if (!objeto(dados.livros) || !objeto(dados.progresso)) {
    throw new Error("Estante ou progresso inválido.");
  }

  const statusPermitidos = ["quero-ler", "lendo", "lido"];
  for (const [id, status] of Object.entries(dados.livros)) {
    if (!id.trim() || !statusPermitidos.includes(status)) {
      throw new Error("ID ou status de livro inválido.");
    }
  }

  const { xp, recompensas, conquistas } = dados.progresso;
  if (!Number.isSafeInteger(xp) || xp < 0 || !lista(recompensas) || !lista(conquistas)) {
    throw new Error("XP, recompensas ou conquistas inválidos.");
  }

  const sessoes = Array.isArray(dados.sessoes) ? dados.sessoes : [];
  const inteiro = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  if (!sessoes.every((x) => x && typeof x.id === "string" && typeof x.livroId === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.data) && inteiro(x.minutos, 1440) && inteiro(x.paginas, 5000))) {
    throw new Error("Sessões de leitura inválidas.");
  }

  return {
    versao: VERSAO_DADOS_USUARIO,
    sessoes: sessoes.slice(-3000).map(({ id, livroId, data, minutos, paginas }) => ({ id, livroId, data, minutos, paginas })),
    livros: Object.fromEntries(Object.entries(dados.livros)),
    ...validarColecao(dados), // Também completa campos ausentes da versão 1.
    preferencias: validarPreferencias(dados.preferencias),
    progresso: {
      xp,
      recompensas: [...new Set(recompensas)],
      conquistas: [...new Set(conquistas)],
    },
  };
}

/* Leitura não grava nada. JSON inválido ou armazenamento bloqueado não
   derrubam o site; o conteúdo original permanece para possível recuperação. */
function carregarDadosUsuario() {
  try {
    const texto = localStorage.getItem(CHAVE_DADOS_USUARIO);
    return texto === null ? criarDadosUsuario() : validarDadosUsuario(JSON.parse(texto));
  } catch (erro) {
    console.warn("Atheneum: não foi possível carregar os dados do usuário.", erro);
    return criarDadosUsuario();
  }
}

/* Recebe o estado COMPLETO. Retorna true só quando a gravação funciona.
   Quem chamar deve avisar o usuário se receber false; não simular sucesso.
   Não grave automaticamente os valores iniciais ao abrir a página. */
function salvarDadosUsuario(dados) {
  try {
    const validos = validarDadosUsuario(dados);
    if (typeof verificarConquistas === "function") verificarConquistas(validos);
    const anterior = localStorage.getItem(CHAVE_DADOS_USUARIO);
    if (anterior !== null) {
      // Impede sobrescrever dados desconhecidos/corrompidos silenciosamente.
      validarDadosUsuario(JSON.parse(anterior));
      // Guarda o estado anterior à primeira migração, incluindo o XP já obtido.
      if (JSON.parse(anterior).versao === 1 && localStorage.getItem("atheneum:antes-v2") === null) {
        localStorage.setItem("atheneum:antes-v2", anterior);
      }
    }
    localStorage.setItem(CHAVE_DADOS_USUARIO, JSON.stringify(validos));
    return true;
  } catch (erro) {
    console.warn("Atheneum: não foi possível salvar os dados do usuário.", erro);
    return false;
  }
}
