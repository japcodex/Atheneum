// Prateleiras horizontais: setas, toque e teclado, sem reprodução automática.
function movimentoSuave() {
  return document.documentElement.dataset.movimento !== "reduzido"
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function atualizarSetasCarrossel(secao) {
  const trilha = secao.querySelector(".carrossel__trilha");
  const fim = trilha.scrollWidth - trilha.clientWidth;
  secao.querySelector("[data-direcao='-1']").disabled = trilha.scrollLeft <= 2;
  secao.querySelector("[data-direcao='1']").disabled = fim <= 2 || trilha.scrollLeft >= fim - 2;
  secao.classList.toggle("carrossel--inicio", trilha.scrollLeft <= 2);
  secao.classList.toggle("carrossel--fim", fim <= 2 || trilha.scrollLeft >= fim - 2);
}
function criarCarrossel(titulo, livros, subtitulo = "") {
  const secao = criar("section", "carrossel"); secao.setAttribute("aria-label", titulo);
  const cabecalho = criar("header", "carrossel__cabecalho"), textos = criar("div");
  textos.append(criar("h2", "carrossel__titulo", titulo));
  if (subtitulo) textos.append(criar("p", "texto-suave", subtitulo));
  const controles = criar("div", "carrossel__controles");
  const janela = criar("div", "carrossel__janela"), trilha = criar("ul", "carrossel__trilha");
  trilha.tabIndex = 0; trilha.setAttribute("aria-label", `Livros: ${titulo}`);
  trilha.append(...livros.map(criarLivro)); janela.append(trilha);
  const mover = (direcao) => trilha.scrollBy({ left: direcao * trilha.clientWidth * .78, behavior: movimentoSuave() ? "smooth" : "instant" });
  for (const direcao of [-1, 1]) {
    const botao = criar("button", "botao-icone"); botao.type = "button"; botao.dataset.direcao = direcao;
    botao.setAttribute("aria-label", `${direcao < 0 ? "Voltar" : "Avançar"} em ${titulo}`);
    botao.append(criarIcone("seta")); botao.addEventListener("click", () => mover(direcao)); controles.append(botao);
  }
  trilha.addEventListener("scroll", () => atualizarSetasCarrossel(secao), { passive: true });
  trilha.addEventListener("keydown", (e) => {
    if (e.target === trilha && ["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); mover(e.key === "ArrowRight" ? 1 : -1); }
  });
  cabecalho.append(textos, controles); secao.append(cabecalho, janela);
  requestAnimationFrame(() => atualizarSetasCarrossel(secao)); return secao;
}
function atualizarCarrosseis() {
  document.querySelectorAll(".carrossel").forEach(atualizarSetasCarrossel);
}
window.addEventListener("resize", atualizarCarrosseis);
