import { esc, icon } from "../lib/ui.js";

export function renderNotFound({ commitPage }) {
  const requested = location.hash.slice(1).slice(0, 80);
  commitPage(
    `<section class="not-found"><span class="eyebrow red">UMA PÁGINA FORA DESTA EDIÇÃO</span><div class="error-folio" aria-hidden="true">404</div><h1>Esta página se perdeu<br>entre os cadernos.</h1><p>O endereço ${requested ? `<strong>“${esc(requested)}”</strong> ` : ""}não faz parte desta edição. Suas histórias continuam na biblioteca.</p><div class="error-actions"><a class="primary-button" href="#inicio">Voltar à primeira página ${icon("arrow")}</a><a class="secondary-button" href="#biblioteca">Encontrar meus livros ↗</a></div><span class="error-stamp" aria-hidden="true">ARQUIVO · ATHENEUM</span></section>`,
  );
}
