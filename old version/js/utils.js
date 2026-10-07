//Ferramentas
const ROTULOS_STATUS = {
  "lido": "Lido",
  "lendo": "Lendo",
  "quero-ler": "Quero ler",
};

/* normalizar("Édipo Rei") devolve "edipo rei".
   Serve para a busca achar "edipo" mesmo que você não digite o acento. */
function normalizar(texto = "") {
  return texto
    .normalize("NFD")                    // separa a letra do acento
    .replace(/[\u0300-\u036f]/g, "")     // apaga os acentos
    .toLowerCase()
    .trim();
}

/* hash("o-hobbit") devolve sempre o mesmo número para o mesmo texto.
   Usamos isso para cada livro ter sempre a mesma cor e altura de lombada. */
function hash(texto) {
  let valor = 2166136261;
  for (const letra of texto) {
    valor ^= letra.charCodeAt(0);
    valor = Math.imul(valor, 16777619);
  }
  return valor >>> 0;
}

/* Cores possíveis das capas desenhadas. Cada número é um "matiz" (0 a 360):
   218 = azul, 350 = vinho, 162 = verde, 268 = roxo, 24 = marrom, 44 = ocre.
   Quer outra paleta? Troque os números. */
const MATIZES = [218, 226, 196, 162, 350, 24, 268, 44];

/* aparencia(livro) decide cor, altura e largura da lombada de um livro. */
function aparencia(livro) {
  const semente = hash(livro.id);
  return {
    matiz: MATIZES[semente % MATIZES.length],
    altura: 215 + (semente >> 4) % 60,   // entre 215 e 274 pixels
    largura: 40 + (semente >> 9) % 13,   // entre 40 e 52 pixels
  };
}

/* estrelas(4) devolve "★★★★☆" */
function estrelas(nota) {
  const cheias = Math.round(nota);
  return "★".repeat(cheias) + "☆".repeat(5 - cheias);
}

/* criar("p", "classe", "texto") monta um elemento HTML:
   <p class="classe">texto</p>
   É um atalho para não repetir o mesmo código várias vezes. */
function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}
