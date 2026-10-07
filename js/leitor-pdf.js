/* ==========================================================================
   LEITOR DE PDF  (ler o arquivo do livro dentro do Atheneum)

   Onde fica o PDF de um livro (nesta ordem):
     1. campo "pdf" do livro (editor ou data/livros.js)
     2. lista data/pdfs.js (gerada por scripts/listar-pdfs.mjs)
     3. pdfs/<id>.pdf, procurado sozinho quando o site roda em http(s)
   O leitor abre na sua PÁGINA ATUAL, a mesma que você registra no livro.
   ========================================================================== */

const leitorPdf = document.getElementById("leitor-pdf");
const pdfExiste = new Map();   // id -> true/false (resultado da busca automática)

/* Caminho conhecido sem fazer pedido de rede. Vazio se não houver. */
function caminhoPdf(livro) {
  if (livro.pdf) return livro.pdf;
  return (typeof PDFS !== "undefined" && PDFS[livro.id]) || "";
}

/* Procura o PDF, inclusive pela convenção pdfs/<id>.pdf. Nunca lança erro. */
async function localizarPdf(livro) {
  const conhecido = caminhoPdf(livro);
  if (conhecido) return conhecido;
  if (!location.protocol.startsWith("http")) return "";   // com dois cliques (file://) só vale a lista data/pdfs.js
  const candidato = `pdfs/${encodeURIComponent(livro.id)}.pdf`;
  if (!pdfExiste.has(livro.id)) {
    try {
      const resposta = await fetch(candidato, { method: "HEAD" });
      pdfExiste.set(livro.id, resposta.ok && /pdf/i.test(resposta.headers.get("content-type") || ""));
    } catch { pdfExiste.set(livro.id, false); }
  }
  return pdfExiste.get(livro.id) ? candidato : "";
}

function abrirLeitorPdf(livro, caminho) {
  const pagina = Math.max(1, Number(livro.paginaAtual) || 1);
  document.getElementById("leitor-pdf-titulo").textContent = livro.titulo;
  document.getElementById("leitor-pdf-pagina").textContent = livro.paginaAtual ? `Abrindo na página ${pagina}, onde você parou.` : "Abrindo na primeira página.";
  document.getElementById("leitor-pdf-abrir").href = `${caminho}#page=${pagina}`;
  document.getElementById("leitor-pdf-baixar").href = caminho;
  document.getElementById("leitor-pdf-quadro").src = `${caminho}#page=${pagina}&view=FitH`;
  if (!leitorPdf.open) leitorPdf.showModal();
}

function fecharLeitorPdf() {
  leitorPdf.close();
  document.getElementById("leitor-pdf-quadro").removeAttribute("src");   // libera memória
}
document.getElementById("leitor-pdf-fechar").addEventListener("click", fecharLeitorPdf);
leitorPdf.addEventListener("click", (e) => { if (e.target === leitorPdf) fecharLeitorPdf(); });
leitorPdf.addEventListener("cancel", (e) => { e.preventDefault(); fecharLeitorPdf(); });

/* Botões "Ler PDF" e "Abrir em nova aba" do editor de livro. */
async function atualizarBotoesPdf(livro) {
  const ler = document.getElementById("ler-pdf"), nova = document.getElementById("abrir-pdf");
  ler.hidden = nova.hidden = true;
  if (!livro) return;
  const digitado = document.getElementById("livro-pdf").value.trim();
  const caminho = await localizarPdf({ ...livro, pdf: digitado || livro.pdf });
  if (!caminho || livroEmEdicao?.id !== livro.id) return;
  ler.hidden = nova.hidden = false;
  ler.onclick = () => abrirLeitorPdf({ ...livro, paginaAtual: Number(document.getElementById("livro-pagina").value) || livro.paginaAtual }, caminho);
  nova.href = `${caminho}#page=${Math.max(1, Number(document.getElementById("livro-pagina").value) || 1)}`;
}
document.getElementById("livro-pdf").addEventListener("change", () => atualizarBotoesPdf(livroEmEdicao));
