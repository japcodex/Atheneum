/* ==========================================================================
   EFEITOS  (livros em 3D, faixa em movimento e cartões que se inclinam)

   Inspirados nos componentes do spell.sh (Perspective Book, Marquee, Tilt Card),
   refeitos em HTML/CSS/JS puro, sem biblioteca.
   O desenho de cada um está em css/humano.css.
   ========================================================================== */

/* ---------- Cor da lombada: tirada da capa ---------- */

const coresDeCapa = new Map();   // endereço da imagem -> { lombada, fundo } ou null

/* Lê a imagem numa tela pequena e calcula a cor média, dando mais peso às cores vivas
   (assim o branco do papel e o preto das bordas não "lavam" o resultado). */
function corDominante(src) {
  if (coresDeCapa.has(src)) return Promise.resolve(coresDeCapa.get(src));
  return new Promise((resolver) => {
    const guardar = (cor) => { coresDeCapa.set(src, cor); resolver(cor); };
    const imagem = new Image();
    imagem.crossOrigin = "anonymous";
    imagem.onerror = () => guardar(null);
    imagem.onload = () => {
      try {
        const tela = document.createElement("canvas"); tela.width = 24; tela.height = 36;
        const ctx = tela.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(imagem, 0, 0, 24, 36);
        const { data } = ctx.getImageData(0, 0, 24, 36);
        let r = 0, g = 0, b = 0, peso = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const max = Math.max(data[i], data[i + 1], data[i + 2]) / 255, min = Math.min(data[i], data[i + 1], data[i + 2]) / 255;
          const luz = (max + min) / 2, sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * luz - 1));
          const p = 0.05 + sat * (1 - Math.abs(2 * luz - 1));
          r += data[i] * p; g += data[i + 1] * p; b += data[i + 2] * p; peso += p;
        }
        if (!peso) return guardar(null);
        const [h, sat, luz] = rgbParaHsl(r / peso, g / peso, b / peso);
        // A lombada é a cor da capa, só um pouco mais contida para o título continuar legível.
        const s2 = Math.min(0.75, Math.max(0.22, sat)), l2 = Math.min(0.42, Math.max(0.17, luz * 0.85));
        guardar({ lombada: `hsl(${h} ${(s2 * 100).toFixed(0)}% ${(l2 * 100).toFixed(0)}%)`, fundo: `hsl(${h} ${(s2 * 100).toFixed(0)}% ${(l2 * 55).toFixed(0)}%)` });
      } catch { guardar(null); }   // imagem de outro site sem permissão: mantém a cor padrão
    };
    imagem.src = src;
  });
}

function rgbParaHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), luz = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, luz];
  const sat = d / (1 - Math.abs(2 * luz - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), sat, luz];
}

/* Se o livro tem capa, a lombada e o fundo assumem a cor dela (com transição suave). */
function aplicarCorDaCapa(botao, livro) {
  const src = livro.capa || `img/capas/${livro.id}.jpg`;
  corDominante(src).then((cor) => {
    if (!cor) return;
    botao.style.setProperty("--cor-lombada", cor.lombada);
    botao.style.setProperty("--cor-fundo", cor.fundo);
  });
}

/* ---------- Livro em perspectiva ---------- */

/* criarLivro3D(livro, opções)
   Faces: capa (que pode abrir), miolo (a folha por trás da capa), lombada, páginas, topo e fundo.
   opções.abre      -> ao passar o mouse a capa se abre como um livro de verdade
   opções.sugestao  -> o clique leva à aba Descobrir em vez de abrir o livro da estante
   O balanço e a flutuação são animações de CSS (css/descobrir.css). */
function criarLivro3D(livro, { largura = 120, altura = 180, espessura = 28, abre = false, sugestao = false, indice = 0 } = {}) {
  const { matiz } = aparencia(livro);
  const botao = criar("button", `book3d${abre ? " book3d--abre" : ""}`);
  botao.type = "button";
  if (sugestao) botao.dataset.sugestao = livro.id; else botao.dataset.abrir = livro.id;
  botao.title = livro.autor ? `${livro.titulo}, de ${livro.autor}` : livro.titulo;
  botao.setAttribute("aria-label", botao.title);
  botao.style.cssText = `--matiz:${matiz};--l:${largura}px;--a:${altura}px;--e:${espessura}px;--n:${indice}`;

  const giro = criar("span", "book3d__giro");
  const capa = criar("span", "book3d__capa");
  const frente = criar("span", "book3d__frente");
  frente.append(criarCapa(livro));
  capa.append(frente, criar("span", "book3d__verso"));
  const lombada = criar("span", "book3d__lombada");
  lombada.append(criar("span", "book3d__texto", livro.titulo.split(" — ").pop()));
  const miolo = criar("span", "book3d__miolo");
  if (abre) miolo.append(criar("span", "book3d__nota", "Boa leitura!"));
  giro.append(miolo, capa, lombada, criar("span", "book3d__paginas"), criar("span", "book3d__topo"), criar("span", "book3d__fundo"));
  botao.append(giro);
  aplicarCorDaCapa(botao, livro);
  return botao;
}

/* Livro grande da tela inicial: a sugestão do dia. */
function renderizarVitrine3D(sugestao, dadosOnline) {
  const vitrine = document.getElementById("inicio-vitrine");
  if (!sugestao) { vitrine.replaceChildren(criar("p", "inicio__vazio", "Você já tem todas as sugestões. Volte em breve.")); return; }
  const livro = { id: sugestao.id, titulo: sugestao.titulo, autor: sugestao.autor, capa: dadosOnline?.capa ?? "", categoria: sugestao.categoria };
  const legenda = criar("p", "vitrine__legenda");
  legenda.append(criar("span", "vitrine__rotulo", "sugestão do dia"), criar("strong", "", sugestao.titulo), criar("span", "vitrine__autor", sugestao.autor));
  vitrine.replaceChildren(criarLivro3D(livro, { largura: 230, altura: 345, espessura: 46, abre: true, sugestao: true }), legenda);
}

/* ---------- Marquee: faixas infinitas, sem arrastar ---------- */

const LARGURA_ITEM = 166;   // largura do livro (120) + espaço entre livros (46)

function criarFaixa(livros, reverso, repeticoes) {
  const faixa = criar("div", `marquee${reverso ? " marquee--reverso" : ""}`);
  const trilha = criar("div", "marquee__trilha");
  const larguraGrupo = livros.length * repeticoes * LARGURA_ITEM;
  trilha.style.setProperty("--duracao", `${Math.round(larguraGrupo / 38)}s`);   // ~38 px por segundo
  // Duas cópias iguais fecham a volta sem salto; a segunda é só visual.
  for (let copia = 0; copia < 2; copia++) {
    const grupo = criar("div", "marquee__grupo");
    if (copia) grupo.setAttribute("aria-hidden", "true");
    for (let r = 0; r < repeticoes; r++) {
      livros.forEach((livro, i) => {
        const item = criarLivro3D(livro, { indice: i + r * livros.length });
        if (copia || r) item.tabIndex = -1;
        grupo.append(item);
      });
    }
    trilha.append(grupo);
  }
  faixa.append(trilha);
  return faixa;
}

let ultimosLivrosMarquee = [];
function renderizarMarquee(livros) {
  ultimosLivrosMarquee = livros;
  const janela = document.getElementById("inicio-prateleiras");
  if (!livros.length) { janela.replaceChildren(criar("p", "inicio__vazio", "A estante está vazia. Adicione o primeiro livro na biblioteca.")); return; }
  // Mistura estável (sempre a mesma) e divide entre as duas faixas.
  const mistura = [...livros].sort((a, b) => hash(a.id + "x") - hash(b.id + "x"));
  const metade = Math.ceil(mistura.length / 2);
  const cima = mistura.slice(0, metade), baixo = mistura.slice(metade);
  // Repete a lista até o grupo ser mais largo que a tela: nunca aparece buraco, mesmo com poucos livros ou tela larga.
  const tela = Math.max(window.innerWidth, 1200);
  const repetir = (lista) => Math.max(1, Math.ceil((tela * 1.1) / (lista.length * LARGURA_ITEM)));
  janela.replaceChildren(criarFaixa(cima, false, repetir(cima)), ...(baixo.length ? [criarFaixa(baixo, true, repetir(baixo))] : []));
}
let temporizadorTela;
window.addEventListener("resize", () => {
  clearTimeout(temporizadorTela);
  temporizadorTela = setTimeout(() => { if (!document.getElementById("inicio").hidden) renderizarMarquee(ultimosLivrosMarquee); }, 300);
});

/* ---------- Tilt card: o cartão se inclina e uma luz segue o mouse ---------- */

const TILT = { limite: 3, escala: 1.005 };   // graus e zoom máximos
const semMovimento = () => !movimentoSuave();
let tiltAtivo = null;

function inclinar(cartao, evento) {
  const caixa = cartao.getBoundingClientRect();
  const x = (evento.clientX - caixa.left) / caixa.width;    // 0 a 1
  const y = (evento.clientY - caixa.top) / caixa.height;
  // "evade": o canto sob o cursor se afasta, como se você apertasse o papel.
  cartao.style.setProperty("--ry", `${((x - 0.5) * 2 * TILT.limite).toFixed(2)}deg`);
  cartao.style.setProperty("--rx", `${(-(y - 0.5) * 2 * TILT.limite).toFixed(2)}deg`);
  cartao.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  cartao.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  cartao.style.setProperty("--zoom", TILT.escala);
}

document.addEventListener("pointermove", (evento) => {
  if (semMovimento() || evento.pointerType === "touch") return;
  const cartao = evento.target.closest?.("[data-tilt]");
  if (tiltAtivo && tiltAtivo !== cartao) soltar(tiltAtivo);
  if (!cartao) return;
  tiltAtivo = cartao;
  cartao.classList.add("tilt--ativo");
  requestAnimationFrame(() => inclinar(cartao, evento));
});

function soltar(cartao) {
  cartao.classList.remove("tilt--ativo");
  for (const v of ["--rx", "--ry", "--zoom"]) cartao.style.removeProperty(v);
  if (tiltAtivo === cartao) tiltAtivo = null;
}
document.addEventListener("pointerleave", () => tiltAtivo && soltar(tiltAtivo), true);

/* ---------- Frase do cartão de papel ---------- */

let fraseInicio = Math.floor(Math.random() * FRASES.length);
function mostrarFraseInicio() {
  const { texto, autor } = FRASES[fraseInicio];
  document.getElementById("inicio-frase-texto").textContent = texto;
  document.getElementById("inicio-frase-autor").textContent = autor;
}
document.getElementById("inicio-outra-frase").addEventListener("click", (e) => {
  e.stopPropagation();
  fraseInicio = (fraseInicio + 1 + Math.floor(Math.random() * (FRASES.length - 1))) % FRASES.length;
  mostrarFraseInicio();
});
mostrarFraseInicio();

/* Métricas e citações ficam estáveis para facilitar a leitura. */

/* ---------- Números que contam até o valor ---------- */
function contarAte(elemento) {
  const texto = elemento.textContent.trim();
  const alvo = Number(texto);
  if (!/^\d+$/.test(texto) || alvo < 1 || semMovimento() || document.documentElement.dataset.movimento === "reduzido") return;
  const inicio = performance.now(), duracao = 900;
  const passo = (agora) => {
    const p = Math.min(1, (agora - inicio) / duracao);
    elemento.textContent = String(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
document.addEventListener("pagina:alterada", () => {
  const pagina = document.body.dataset.pagina;
  if (pagina === "santuario") document.querySelectorAll("#santuario .santuario__numeros span").forEach(contarAte);
  if (pagina === "leitura") document.querySelectorAll(".ritmo__numeros strong").forEach(contarAte);
});

/* ---------- Indicador que desliza entre as abas do topo ---------- */
function posicionarIndicador() {
  const nav = document.getElementById("navegacao");
  const ativo = nav.querySelector('[aria-pressed="true"]');
  if (!ativo || !ativo.offsetWidth) return;
  nav.style.setProperty("--x", `${ativo.offsetLeft}px`);
  nav.style.setProperty("--w", `${ativo.offsetWidth}px`);
  nav.classList.add("abas--pronta");
}
document.addEventListener("pagina:alterada", posicionarIndicador);
window.addEventListener("resize", posicionarIndicador);
document.fonts?.ready.then(posicionarIndicador);
requestAnimationFrame(posicionarIndicador);

/* Celular: a barra lateral começa recolhida para os livros aparecerem logo. */
if (window.matchMedia("(max-width: 860px)").matches) {
  document.querySelectorAll(".lateral__bloco[open]").forEach((bloco) => bloco.removeAttribute("open"));
}
