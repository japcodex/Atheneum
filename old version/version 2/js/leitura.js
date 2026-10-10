/* ==========================================================================
   LER AGORA  (cronômetro, sequência de dias e previsão de término)

   Uma sessão = livro + minutos + páginas lidas. Ao salvar:
     - a página atual do livro avança;
     - um livro "quero ler" passa para "lendo";
     - sessões de 10 minutos ou mais rendem 5 XP (chave "foco:<id>").
   O cronômetro sobrevive a recarregar a página: guardamos a hora de início.
   ========================================================================== */

const CHAVE_CRONOMETRO = "atheneum:cronometro";
let relogio = null;    // intervalo que atualiza o número na tela

const dataISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// O estado temporário mantém o relógio funcional se o navegador bloquear a gravação.
let cronometroTemporario;
function lerCronometro() {
  try {
    const c = cronometroTemporario !== undefined ? cronometroTemporario : JSON.parse(localStorage.getItem(CHAVE_CRONOMETRO));
    if (!c || typeof c.livroId !== "string" || !Number.isFinite(c.acumulado) || c.acumulado < 0
        || (c.inicio !== null && (!Number.isFinite(c.inicio) || c.inicio < 0))) return null;
    return c;
  } catch { return null; }
}
function gravarCronometro(c) {
  cronometroTemporario = c;
  try {
    c ? localStorage.setItem(CHAVE_CRONOMETRO, JSON.stringify(c)) : localStorage.removeItem(CHAVE_CRONOMETRO);
    cronometroTemporario = undefined;
  } catch { mostrarErroLeitura("O cronômetro funciona nesta aba, mas não será recuperado ao recarregar. Libere espaço para salvar sua sessão."); }
}
const msDecorrido = (c) => c ? c.acumulado + (c.inicio ? Math.max(0, Date.now() - c.inicio) : 0) : 0;

function formatarTempo(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- Dados de leitura ---------- */

/* Grava a sessão e avança a página atual. Lança erro com mensagem legível se falhar. */
function registrarSessao(livroId, minutos, paginas) {
  if (!Number.isSafeInteger(minutos) || minutos < 0 || minutos > 1440
      || !Number.isSafeInteger(paginas) || paginas < 0 || paginas > 5000
      || (!minutos && !paginas)) throw new Error("Registre ao menos uma página ou um minuto de leitura.");
  const dados = carregarDadosUsuario();
  const livro = obterLivrosUsuario(dados).find((l) => l.id === livroId);
  if (!livro) throw new Error("Esse livro não está mais na estante.");
  const total = livro.totalPaginas || 0, pagina = (livro.paginaAtual || 0) + paginas;
  if (total && pagina > total) throw new Error(`Restam ${total - livro.paginaAtual} páginas neste livro. Confira o número informado.`);
  definirRegistro(dados.detalhes, livroId, validarLeitura({ paginaAtual: pagina, totalPaginas: total, anotacoes: livro.anotacoes || "" }));
  // Status, recompensa e páginas pertencem à mesma gravação: tudo salva ou nada muda.
  if (livro.status === "quero-ler") {
    definirRegistro(dados.livros, livroId, "lendo");
    document.dispatchEvent(new CustomEvent("livro:status-preparando", { detail: { livroId, anterior: livro.status, atual: "lendo", dados } }));
  }
  const id = criarIdUsuario("sessao");
  dados.sessoes.push({ id, livroId, data: dataISO(), minutos, paginas });
  if (minutos >= 10) concederXp(dados, `foco:${id}`, 5);
  if (!salvarDadosUsuario(dados)) throw new Error("Não foi possível salvar a sessão. O armazenamento do navegador pode estar cheio.");
  document.dispatchEvent(new CustomEvent("colecao:alterada"));
  document.dispatchEvent(new CustomEvent("progresso:atualizado"));
}

/* Sequência: dias seguidos com leitura. Hoje sem leitura ainda não quebra a sequência. */
function calcularSequencia(sessoes) {
  const dias = new Set(sessoes.filter((s) => s.minutos > 0 || s.paginas > 0).map((s) => s.data));
  const dia = new Date();
  if (!dias.has(dataISO(dia))) dia.setDate(dia.getDate() - 1);
  let total = 0;
  while (dias.has(dataISO(dia))) { total++; dia.setDate(dia.getDate() - 1); }
  return total;
}

function resumoRitmo(sessoes, livroId) {
  const limite = new Date(); limite.setDate(limite.getDate() - 13);
  const recentes = sessoes.filter((s) => s.livroId === livroId && s.data >= dataISO(limite) && s.data <= dataISO());
  const semana = new Date(); semana.setDate(semana.getDate() - 6);
  const minutosSemana = sessoes.filter((s) => s.data >= dataISO(semana)).reduce((t, s) => t + s.minutos, 0);
  const paginasPorDia = recentes.reduce((t, s) => t + s.paginas, 0) / 14;
  const livro = obterLivrosUsuario().find((l) => l.id === livroId);
  let previsao = "";
  if (livro && livro.totalPaginas > 0 && livro.status !== "lido") {
    const faltam = livro.totalPaginas - livro.paginaAtual;
    if (paginasPorDia >= 1) {
      const dias = Math.ceil(faltam / paginasPorDia), fim = new Date(); fim.setDate(fim.getDate() + dias);
      previsao = `No seu ritmo (${paginasPorDia.toFixed(1).replace(".", ",")} páginas por dia), faltam cerca de ${dias} ${dias === 1 ? "dia" : "dias"}: ${fim.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}.`;
    } else previsao = `Faltam ${faltam} páginas. Registre algumas sessões e o Atheneum calcula quando você termina.`;
  } else if (livro && !livro.totalPaginas) previsao = "Informe o total de páginas do livro (Biblioteca > editar) para ver a previsão de término.";
  return { sequencia: calcularSequencia(sessoes), minutosSemana, paginasPorDia, previsao };
}

/* ---------- Tela ---------- */

const $L = (id) => document.getElementById(id);

function montarSeletorLivros() {
  const ativo = lerCronometro();
  const livros = obterLivrosUsuario().filter((l) => l.status !== "lido" || l.id === ativo?.livroId);
  if (ativo && !livros.some((l) => l.id === ativo.livroId)) gravarCronometro(null);
  const seletor = $L("leitura-livro"), anterior = seletor.value, c = lerCronometro();
  const grupo = (rotulo, itens) => { const g = criar("optgroup"); g.label = rotulo; g.append(...itens.map((l) => Object.assign(criar("option", "", l.titulo), { value: l.id }))); return g; };
  const lendo = livros.filter((l) => l.status === "lendo"), querer = livros.filter((l) => l.status === "quero-ler");
  seletor.replaceChildren(...[lendo.length && grupo("Lendo agora", lendo), querer.length && grupo("Quero ler", querer)].filter(Boolean));
  seletor.value = c?.livroId ?? ([...seletor.options].some((o) => o.value === anterior) ? anterior : seletor.options[0]?.value ?? "");
  seletor.disabled = Boolean(c);
  return livros.length;
}

function desenharMapaDeCalor(sessoes) {
  const mapa = $L("leitura-mapa"), porDia = new Map();
  for (const s of sessoes) porDia.set(s.data, (porDia.get(s.data) ?? 0) + s.minutos);
  const hoje = new Date(), inicio = new Date(hoje); inicio.setDate(hoje.getDate() - hoje.getDay() - 7 * 11);   // 12 semanas, começando no domingo
  const celulas = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    const min = porDia.get(dataISO(d)) ?? 0, futuro = d > hoje;
    const nivel = futuro ? "x" : min === 0 ? 0 : min < 15 ? 1 : min < 30 ? 2 : min < 60 ? 3 : 4;
    const c = criar("span", `calor__dia calor__dia--${nivel}`);
    c.title = futuro ? "" : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}: ${min} min`;
    celulas.push(c);
  }
  mapa.replaceChildren(...celulas);
  const total = sessoes.reduce((t, s) => t + s.minutos, 0);
  mapa.setAttribute("aria-label", `Mapa das últimas 12 semanas. Total de ${total} minutos lidos em ${porDia.size} dias.`);
}

function renderizarLeitura() {
  clearInterval(relogio);
  const dados = carregarDadosUsuario();
  const temLivros = montarSeletorLivros() > 0, c = lerCronometro();
  $L("leitura-vazio").hidden = temLivros;
  $L("leitura-conteudo").hidden = !temLivros;
  if (!temLivros) return;

  const rodando = Boolean(c?.inicio), pausado = Boolean(c) && !rodando;
  $L("leitura-iniciar").hidden = Boolean(c);
  $L("leitura-pausar").hidden = !c || Boolean(c.finalizando); $L("leitura-pausar").textContent = pausado ? "Continuar" : "Pausar";
  $L("leitura-encerrar").hidden = !c || Boolean(c.finalizando);
  $L("leitura-registro").hidden = !c?.finalizando;
  if (c?.finalizando) {
    const minutos = Math.min(1440, Math.floor(c.acumulado / 60000));
    $L("leitura-minutos").textContent = minutos ? `${minutos} min` : "menos de um minuto";
  }
  $L("leitura-tempo").textContent = formatarTempo(msDecorrido(c));
  $L("leitura-cartao").classList.toggle("relogio--ativo", rodando);

  const r = resumoRitmo(dados.sessoes, $L("leitura-livro").value);
  $L("ritmo-sequencia").textContent = r.sequencia;
  $L("ritmo-sequencia-rotulo").textContent = r.sequencia === 1 ? "dia seguido" : "dias seguidos";
  $L("ritmo-semana").textContent = r.minutosSemana;
  $L("ritmo-paginas").textContent = r.paginasPorDia.toFixed(1).replace(".", ",");
  $L("ritmo-previsao").textContent = r.previsao;
  desenharMapaDeCalor(dados.sessoes);

  clearInterval(relogio);
  if (rodando) relogio = setInterval(() => { $L("leitura-tempo").textContent = formatarTempo(msDecorrido(lerCronometro())); }, 500);
}

function mostrarErroLeitura(texto) { const e = $L("leitura-erro"); e.textContent = texto; e.hidden = !texto; }

$L("leitura-iniciar").addEventListener("click", () => {
  mostrarErroLeitura("");
  if (!$L("leitura-livro").value) return;
  gravarCronometro({ livroId: $L("leitura-livro").value, acumulado: 0, inicio: Date.now() });
  renderizarLeitura();
});
$L("leitura-pausar").addEventListener("click", () => {
  const c = lerCronometro(); if (!c) return;
  gravarCronometro(c.inicio ? { ...c, acumulado: msDecorrido(c), inicio: null } : { ...c, inicio: Date.now() });
  renderizarLeitura();
});
$L("leitura-encerrar").addEventListener("click", () => {
  const c = lerCronometro(); if (!c) return;
  gravarCronometro({ ...c, acumulado: msDecorrido(c), inicio: null, finalizando: true });
  const minutos = Math.floor(msDecorrido(lerCronometro()) / 60000);
  $L("leitura-minutos").textContent = `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  $L("leitura-registro").hidden = false; $L("leitura-paginas").value = ""; $L("leitura-paginas").focus();
  renderizarLeitura();
});
$L("leitura-descartar").addEventListener("click", () => { gravarCronometro(null); $L("leitura-registro").hidden = true; mostrarErroLeitura(""); renderizarLeitura(); });
$L("leitura-registro").addEventListener("submit", (e) => {
  e.preventDefault();
  const c = lerCronometro(); if (!c?.finalizando) return;
  const paginas = Number($L("leitura-paginas").value), minutos = Math.floor(c.acumulado / 60000);
  if (!Number.isInteger(paginas) || paginas < 0 || paginas > 5000) { mostrarErroLeitura("Digite quantas páginas você leu (0 se foi só o tempo)."); return; }
  try {
    registrarSessao(c.livroId, Math.min(minutos, 1440), paginas);
    gravarCronometro(null); $L("leitura-registro").hidden = true; mostrarErroLeitura("");
    avisarUsuario(`Sessão salva: ${minutos} min, ${paginas} páginas.`);
  } catch (erro) { mostrarErroLeitura(erro.message); }
  renderizarLeitura();
});
$L("leitura-livro").addEventListener("change", renderizarLeitura);
$L("leitura-ir-biblioteca").addEventListener("click", () => mostrarPagina("biblioteca"));
document.addEventListener("colecao:alterada", () => { if (!$L("leitura").hidden) renderizarLeitura(); });

// Não atualiza números de uma tela escondida; o horário salvo continua contando.
document.addEventListener("pagina:alterada", () => { if ($L("leitura").hidden) clearInterval(relogio); });
