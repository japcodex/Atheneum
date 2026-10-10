//Escrever frase aleatória
let fraseAtual = Math.floor(Math.random() * FRASES.length);

/* Escreve a frase atual nos dois elementos da tela. */
function mostrarFrase(textoEl, autorEl) {
  const { texto, autor } = FRASES[fraseAtual];
  textoEl.textContent = texto;
  autorEl.textContent = autor;
}

/* Vai para outra frase (sempre diferente da atual). */
function proximaFrase(textoEl, autorEl) {
  const salto = 1 + Math.floor(Math.random() * (FRASES.length - 1));
  fraseAtual = (fraseAtual + salto) % FRASES.length;
  mostrarFrase(textoEl, autorEl);
}
