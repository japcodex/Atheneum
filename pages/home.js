import { esc, icon, cover, progress, normalize } from "../lib/ui.js";
import { catalog, quotes } from "../lib/catalog.js";
import { COLLECTION_SECTIONS } from "../lib/collection.js";

const featuredTitles = [
  "Meditações",
  "O Hobbit",
  "Código Limpo",
  "A Hora da Estrela",
];
const desks = [
  {
    name: "Clássicos",
    folio: "I",
    description: "Vozes que atravessam o tempo.",
  },
  {
    name: "Ficção",
    folio: "II",
    description: "Outros mundos, novas perspectivas.",
  },
  {
    name: "Carreira",
    folio: "III",
    description: "Ideias para construir o amanhã.",
  },
];

export function renderHome({ store, commitPage, quoteIndex }) {
  const stats = store.stats();
  const books = store.getBooks();
  const reading = books.find((book) => book.status === "reading");
  const quote = quotes[quoteIndex];
  const personalFeatures = featuredTitles
    .map((title) =>
      books.find((book) => normalize(book.title) === normalize(title)),
    )
    .filter(Boolean);
  const features = personalFeatures.length ? personalFeatures : catalog;
  const excerpt = books.slice(0, 20);
  const repeatedExcerpt = [...excerpt, ...excerpt];
  const sectionCounts = new Map(
    COLLECTION_SECTIONS.map((section) => {
      const list = store.state.lists.find((item) => item.name === section.name);
      return [
        section.name,
        list
          ? books.filter((book) => book.listIds.includes(list.id)).length
          : 0,
      ];
    }),
  );

  commitPage(`
    <section class="hero">
      <div class="hero-intro">
        <span class="eyebrow red">TODO LEITOR TEM UMA HISTÓRIA</span>
        <h1>Entre páginas,<br>um mundo<br><em>seu.</em></h1>
        <p>Organize seus livros, guarde suas ideias e descubra o próximo capítulo da sua jornada.</p>
        <a class="primary-button" href="#biblioteca">Entrar na minha biblioteca ${icon("arrow")}</a>
        <a class="text-button" href="#descobrir">Encontre sua próxima leitura ↗</a>
      </div>
      <figure class="hero-art">
        <span class="paper-ribbon">EDIÇÃO PESSOAL</span>
        <img src="assets/library-engraving.png" alt="Gravura de uma biblioteca clássica, com estantes, colunas e dois leitores" fetchpriority="high">
        <div class="newspaper-stamp" aria-label="Selo Ex Libris Atheneum 2026"><span>EX LIBRIS</span><img src="assets/logo.svg" alt=""><strong>ATHENEUM</strong><small>2026</small></div>
        <figcaption><span>UM REFÚGIO PARA AS SUAS IDEIAS</span><span>FIG. 01</span></figcaption>
      </figure>
      <aside class="hero-aside">
        <div class="quote-block">
          <span class="eyebrow">À MARGEM DA PÁGINA</span>
          <blockquote>“${esc(quote.text)}”</blockquote>
          <div class="quote-author"><span>${esc(quote.author)}</span><button class="quote-refresh" data-action="quote" aria-label="Trocar citação">↻</button></div>
        </div>
        <div class="journey-preview">
          <span class="eyebrow red">${reading ? "SEU MARCADOR ESTÁ AQUI" : "UMA PÁGINA DE CADA VEZ"}</span>
          <h3>${reading ? esc(reading.title) : "Toda jornada começa com um livro."}</h3>
          ${reading ? `<p>${esc(reading.author)}<br>Página ${reading.currentPage}${reading.totalPages ? " de " + reading.totalPages : ""}</p><div class="reading-progress"><span style="width:${progress(reading)}%"></span></div><button class="text-button" data-action="read-book" data-id="${esc(reading.id)}">Continuar leitura →</button>` : `<p>${stats.totalBooks ? `${stats.totalBooks} ${stats.totalBooks === 1 ? "livro na sua biblioteca." : "livros na sua biblioteca."} Qual será o próximo?` : "Seu acervo, suas notas, seu ritmo.<br>Um espaço para chamar de seu."}</p><button class="text-button" data-action="${stats.totalBooks ? "go-library" : "add-book"}">${stats.totalBooks ? "Abrir minha estante" : "Adicionar meu primeiro livro"} →</button>`}
        </div>
      </aside>
    </section>

    <nav class="newspaper-index" aria-label="Cadernos da sua coleção">
      ${desks.map((desk) => `<button class="desk-link" data-action="section-library" data-value="${esc(desk.name)}"><span class="eyebrow red">CADERNO ${desk.folio}</span><h2>${desk.name}</h2><p>${desk.description}</p><span class="desk-count">${sectionCounts.get(desk.name) || 0} livros <span aria-hidden="true">↗</span></span></button>`).join("")}
    </nav>

    <section aria-labelledby="curated-title">
      <div class="section-heading"><div><span class="eyebrow red">${personalFeatures.length ? "DA SUA COLEÇÃO" : "DA NOSSA CURADORIA"}</span><h2 id="curated-title">${personalFeatures.length ? "As histórias desta edição." : "Seu próximo capítulo."}</h2></div><a class="text-button" href="#biblioteca">Percorrer o acervo ↗</a></div>
      <div class="curated-row">${features.map((book, index) => `<button class="editorial-card" data-action="${personalFeatures.length ? "detail" : "catalog-book"}" data-id="${esc(book.id)}" aria-label="Conhecer ${esc(book.title)}">${cover(book)}<div><span class="eyebrow">0${index + 1} / ${personalFeatures.length ? "NA SUA ESTANTE" : "PARA DESCOBRIR"}</span><h3>${esc(book.title)}</h3><p>${esc(book.author)}</p><span class="genre">${esc(book.genre)}</span><span class="arrow">↗</span></div></button>`).join("")}</div>
    </section>

    ${books.length ? `<section class="auto-marquee" aria-label="Uma seleção de livros da sua coleção"><div class="auto-track ${store.state.prefs.marqueePaused === true ? "paused" : ""}">${repeatedExcerpt.map((book, index) => `<button class="marquee-book" data-action="detail" data-id="${esc(book.id)}" ${index >= excerpt.length ? 'tabindex="-1" aria-hidden="true"' : ""}>${cover(book)}<span>${esc(book.title)}</span></button>`).join("")}</div></section><div class="marquee-controls"><span>SUA COLEÇÃO, EM MOVIMENTO</span><a class="text-button" href="#biblioteca">Ver acervo completo ↗</a><button class="text-button" data-action="pause-marquee">${store.state.prefs.marqueePaused === true ? "Retomar" : "Pausar"} movimento</button></div>` : ""}
    <div class="home-manifesto"><span>✳</span> Não é só sobre os livros que você lê.<br class="hidden"> É sobre quem você se torna. <span>✳</span></div>
  `);
}
