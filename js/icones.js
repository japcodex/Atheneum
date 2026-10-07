/* ==========================================================================
   ÍCONES  (conjunto único: Lucide, licença ISC, https://lucide.dev)

   Todos os ícones da interface vêm da mesma família, com o mesmo traço (1.75)
   e o mesmo arredondamento. Para trocar um, ache o ícone em lucide.dev e cole
   os caminhos (d="...") na lista correspondente. A logo continua sendo a sua,
   em img/logo/.
   ========================================================================== */
const CAMINHOS_ICONES = {
  inicio: ["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  livro: ["M12 5v16", "M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z"],
  trofeu: ["M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2", "M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2", "M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3", "M4 22h16", "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z", "M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"],
  grade: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
  ajustes: ["M10 5H3", "M12 19H3", "M14 3v4", "M16 17v4", "M21 12h-9", "M21 19h-5", "M21 5h-7", "M8 10v4", "M8 12H3"],
  seta: ["m9 18 6-6-6-6"],
  mais: ["M5 12h14", "M12 5v14"],
  nota: ["M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", "M2 6h4", "M2 10h4", "M2 14h4", "M2 18h4", "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"],
  lista: ["M3 5h.01", "M3 12h.01", "M3 19h.01", "M8 5h13", "M8 12h13", "M8 19h13"],
  baixar: ["M12 15V3", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5"],
  enviar: ["M12 3v12", "m17 8-5-5-5 5", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"],
  estrela: ["M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"],
  pena: ["M14.086 18.412A2 2 0 0 1 12.67 19H5v-7.672a2 2 0 0 1 .586-1.414L11.75 3.75a6 6 0 1 1 8.49 8.49z", "M16 8 2 22", "M17.488 15H9"],
  pagina: ["M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z", "M14 2v5a1 1 0 0 0 1 1h5", "M10 9H8", "M16 13H8", "M16 17H8"],
  colecao: ["m16 6 4 14", "M12 6v14", "M8 8v12", "M4 4v16"],
  compasso: ["M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z", "M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z"],
  relogio: ["M10 2h4", "m12 14 3-3", "M12 6a8 8 0 1 0 0 16 8 8 0 1 0 0-16z"],
  verificar: ["M20 6 9 17l-5-5"],
  lua: ["M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"],
};

function criarIcone(nome) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icone");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of CAMINHOS_ICONES[nome] || CAMINHOS_ICONES.livro) {
    const caminho = document.createElementNS(ns, "path");
    caminho.setAttribute("d", d);
    svg.append(caminho);
  }
  return svg;
}

function preencherIcones() {
  for (const elemento of document.querySelectorAll("[data-icone]")) {
    if (!elemento.querySelector(".icone")) elemento.prepend(criarIcone(elemento.dataset.icone));
  }
}
