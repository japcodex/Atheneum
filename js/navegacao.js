// Três áreas independentes; o hash permite abrir/recarregar a aba desejada.
const PAGINAS = ["inicio", "biblioteca", "descobrir", "leitura", "santuario"];
function mostrarPagina(pagina, registrar = true) {
  if (!PAGINAS.includes(pagina)) pagina = "inicio";
  for (const id of PAGINAS) {
    const area = document.getElementById(id); area.hidden = id !== pagina;
    area.classList.remove("pagina--entrando");
  }
  document.getElementById("busca").disabled = pagina !== "biblioteca";
  const pular = document.querySelector(".pular"); pular.href = `#${pagina}`;
  pular.textContent = "Pular para o conteúdo";
  for (const botao of document.querySelectorAll("[data-pagina]")) botao.setAttribute("aria-pressed", String(botao.dataset.pagina === pagina));
  if (pagina === "inicio") renderizarInicio();
  if (pagina === "santuario") renderizarSantuario(true);
  if (pagina === "descobrir") { renderizarDescobrir(); carregarCapasDescobrir(); }
  if (pagina === "leitura") renderizarLeitura();
  document.body.dataset.pagina = pagina;
  const titulos = { inicio: "Início", biblioteca: "Biblioteca", descobrir: "Descobrir", leitura: "Ler agora", santuario: "Santuário" };
  document.title = `${titulos[pagina]} | Atheneum`;
  if (registrar && location.hash !== `#${pagina}`) history.pushState(null, "", `#${pagina}`);
  window.scrollTo({ top: 0, behavior: "instant" });
  requestAnimationFrame(atualizarCarrosseis);
  if (movimentoSuave()) requestAnimationFrame(() => document.getElementById(pagina).classList.add("pagina--entrando"));
  if (registrar) document.getElementById(pagina).focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent("pagina:alterada"));
}
document.getElementById("navegacao").addEventListener("click", ({ target }) => {
  const botao = target.closest("[data-pagina]"); if (botao) mostrarPagina(botao.dataset.pagina);
});
window.addEventListener("popstate", () => mostrarPagina(location.hash.slice(1), false));
document.querySelector(".marca").addEventListener("click", (e) => { e.preventDefault(); mostrarPagina("inicio"); });
document.getElementById("voltar-leitura").addEventListener("click", () => mostrarPagina("leitura"));

// Mantém a logo original. A arte do Santuário continua sendo opcional.
const arte = document.getElementById("arte-santuario");
arte.addEventListener("load", () => { arte.hidden = false; });
arte.addEventListener("error", () => { arte.hidden = true; });
arte.src = "img/santuario/arte.png";
preencherIcones();
const dadosIniciais = carregarDadosUsuario();
if (verificarConquistas(dadosIniciais).length) salvarDadosUsuario(dadosIniciais);
renderizarSantuario(); renderizarInicio();
mostrarPagina(location.hash.slice(1), false);
