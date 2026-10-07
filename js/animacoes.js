// Efeitos decorativos. Sem suporte ou com movimento reduzido, tudo fica visível.
const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
const entrada = document.getElementById("entrada");
let observadorRevelacao = null;

/* Mostra a abertura uma vez por aba. A camada nunca intercepta cliques. */
if (!reduzirMovimento.matches && document.documentElement.dataset.movimento !== "reduzido") {
  try {
    if (!sessionStorage.getItem("atheneum:entrada")) {
      entrada.hidden = false;
      sessionStorage.setItem("atheneum:entrada", "1");
      setTimeout(() => { entrada.hidden = true; }, 950);
    }
  } catch (erro) {
    // Armazenamento de sessão bloqueado: apenas omite a abertura.
  }
}

function prepararRevelacoes() {
  if (reduzirMovimento.matches || document.documentElement.dataset.movimento === "reduzido" || !("IntersectionObserver" in window)) return;
  if (!observadorRevelacao) {
    observadorRevelacao = new IntersectionObserver((entradas) => {
      for (const item of entradas) {
        if (item.isIntersecting) {
          item.target.classList.add("revelar--visivel");
          observadorRevelacao.unobserve(item.target);
        }
      }
    }, { threshold: 0 }); // Prateleiras altas também revelam em telas pequenas.
  }
  for (const bloco of document.querySelectorAll(".catalogo__grade > li, .santuario__emblema, .carrossel")) {
    if (bloco.classList.contains("revelar")) continue;
    bloco.classList.add("revelar");
    observadorRevelacao.observe(bloco);
  }
}

// O desenho da biblioteca recria prateleiras quando filtros/status mudam.
document.addEventListener("estantes:atualizadas", () => {
  observadorRevelacao?.disconnect();
  // Elementos já marcados e ainda não revelados também precisam ser observados.
  for (const bloco of document.querySelectorAll(".revelar:not(.revelar--visivel)")) {
    observadorRevelacao?.observe(bloco);
  }
  prepararRevelacoes();
});
reduzirMovimento.addEventListener("change", () => {
  if (reduzirMovimento.matches) {
    entrada.hidden = true;
    observadorRevelacao?.disconnect();
    for (const bloco of document.querySelectorAll(".revelar")) bloco.classList.add("revelar--visivel");
  } else prepararRevelacoes();
});
prepararRevelacoes();
document.addEventListener("pagina:alterada", prepararRevelacoes);
document.addEventListener("preferencias:alteradas", () => {
  if (document.documentElement.dataset.movimento === "reduzido") {
    entrada.hidden = true;
    observadorRevelacao?.disconnect();
    document.querySelectorAll(".revelar").forEach((el) => el.classList.add("revelar--visivel"));
  } else prepararRevelacoes();
});
