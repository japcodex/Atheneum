import {
  $,
  esc,
  icon,
  heading,
  addButton,
  empty,
  bookCard,
  normalize,
} from "../lib/ui.js";
import { COLLECTION_SECTIONS } from "../lib/collection.js";
import { tagChip, bookTags } from "../lib/tags.js";

export const createLibraryFilters = () => ({
  query: "",
  status: "all",
  genre: "all",
  list: "all",
  tag: "all",
  sort: "recent",
  deleted: false,
  page: 1,
});

export function createLibrary({
  store,
  commitPage,
  reveal,
  getReducedMotion = () => true,
}) {
  const filters = createLibraryFilters();
  const booksPerPage = 24;

  function listRow(list, counts) {
    return `<div class="list-row ${filters.list === list.id ? "active" : ""}"><button class="list-name" data-action="list-filter" data-id="${esc(list.id)}" aria-pressed="${filters.list === list.id}">${esc(list.name)} <small>(${counts.get(list.id) || 0})</small></button><button class="mini-icon" data-action="edit-list" data-id="${esc(list.id)}" aria-label="Gerenciar lista ${esc(list.name)}">⋯</button></div>`;
  }

  function render() {
    const stats = store.stats();
    const state = store.state;
    if (
      filters.tag !== "all" &&
      !state.tags.some((tag) => tag.id === filters.tag)
    )
      filters.tag = "all";
    const books = store.getBooks();
    const mode = state.prefs.view || "grid";
    const primaryNames = COLLECTION_SECTIONS.map((section) => section.name);
    const primaryLists = primaryNames
      .map((name) => state.lists.find((list) => list.name === name))
      .filter(Boolean);
    const otherLists = state.lists.filter(
      (list) => !primaryNames.includes(list.name),
    );
    const counts = new Map();
    books.forEach((book) =>
      book.listIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)),
    );

    commitPage(
      heading(
        "SEU ACERVO, DO SEU JEITO",
        "Minha biblioteca.",
        "As histórias que fazem parte da sua vida.",
        addButton,
      ) +
        `
      <div class="library-layout">
        <aside class="library-sidebar" aria-label="Filtros da biblioteca">
          ${[
            ["all", "Todos os livros", stats.totalBooks],
            ["reading", "Lendo", stats.reading],
            ["want", "Quero ler", stats.want],
            ["read", "Lidos", stats.read],
          ]
            .map(
              ([id, label, count]) =>
                `<button class="sidebar-button ${filters.status === id && !filters.deleted ? "active" : ""}" data-action="status-filter" data-value="${id}" aria-pressed="${filters.status === id && !filters.deleted}">${label}<span>${count}</span></button>`,
            )
            .join("")}
          <div class="sidebar-heading"><span>CADERNOS & LISTAS</span><button class="mini-icon" data-action="add-list" aria-label="Criar lista">+</button></div>
          ${primaryLists.map((list) => listRow(list, counts)).join("")}
          ${otherLists.length ? `<details class="library-other-lists sidebar-subgroups" ${otherLists.some((list) => list.id === filters.list) ? "open" : ""}><summary>Autores, assuntos & suas listas <span>${otherLists.length}</span></summary>${otherLists.map((list) => listRow(list, counts)).join("")}</details>` : ""}
          ${!state.lists.length ? '<p class="sidebar-note">Agrupe suas leituras.<br>Crie sua primeira lista.</p>' : ""}
          <button class="sidebar-button deleted-filter ${filters.deleted ? "active" : ""}" data-action="trash" aria-pressed="${filters.deleted}">Removidos <span>${stats.deleted}</span></button>
        </aside>
        <div class="library-content">
          <div class="library-toolbar" role="group" aria-label="Busca e organização do acervo">
            <div class="library-control library-search-field"><label for="library-search">ENCONTRE UMA HISTÓRIA</label><div class="search-box">${icon("search")}<input id="library-search" type="search" placeholder="Título, autor ou ISBN" value="${esc(filters.query)}" autocomplete="off" aria-controls="library-results"></div></div>
            <div class="library-control library-list-field"><label for="list-picker">CADERNO OU LISTA</label><select id="list-picker" class="filter-select list-picker" aria-controls="library-results"><option value="all">Todos os cadernos</option>${state.lists.map((list) => `<option value="${esc(list.id)}" ${filters.list === list.id ? "selected" : ""}>${esc(list.name)}</option>`).join("")}</select></div>
            <div class="library-control"><label for="genre-filter">GÊNERO</label><select id="genre-filter" class="filter-select" aria-controls="library-results"><option value="all">Todos os gêneros</option>${[
              ...new Set(books.map((book) => book.genre).filter(Boolean)),
            ]
              .sort()
              .map(
                (genre) =>
                  `<option ${filters.genre === genre ? "selected" : ""}>${esc(genre)}</option>`,
              )
              .join("")}</select></div>
            <div class="library-control"><label for="sort-filter">ORDENAR POR</label><select id="sort-filter" class="filter-select" aria-controls="library-results">${[
              ["recent", "Mais recentes"],
              ["title", "Título A–Z"],
              ["author", "Autor A–Z"],
              ["rating", "Melhor avaliação"],
            ]
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${filters.sort === value ? "selected" : ""}>${label}</option>`,
              )
              .join("")}</select></div>
            <div class="library-control library-view-field"><span id="library-view-label">VISUALIZAR</span><div class="view-switch" role="group" aria-labelledby="library-view-label">${[
              ["shelf", "Estante"],
              ["grid", "Grade"],
              ["list", "Lista"],
            ]
              .map(
                ([value, label]) =>
                  `<button data-action="view" data-value="${value}" class="${mode === value ? "active" : ""}" aria-label="${label}" title="${label}" aria-pressed="${mode === value}" aria-controls="library-results">${icon(value)}</button>`,
              )
              .join("")}</div></div>
          </div>
          <div class="tag-filter-bar"><div class="tag-filter-heading"><span class="eyebrow red">MARCAS DA SUA ESTANTE</span><button class="text-button" data-action="manage-tags">Gerenciar tags ↗</button></div><div class="tag-filter-options" role="group" aria-label="Filtrar por tag">${state.tags.length ? state.tags.map((tag) => tagChip(tag, { clickable: true, active: filters.tag === tag.id })).join("") : '<p class="tag-filter-hint">Crie marcas por tema, prioridade ou sentimento para reencontrar seus livros.</p>'}</div></div>
          <div id="library-results"></div>
        </div>
      </div>
    `,
    );
    renderResults(false);
  }

  function renderResults(animate = true) {
    const container = $("#library-results");
    if (!container) return;
    let books = store
      .getBooks({ includeDeleted: filters.deleted })
      .filter((book) => Boolean(book.deletedAt) === filters.deleted)
      .filter(
        (book) =>
          filters.deleted ||
          filters.status === "all" ||
          book.status === filters.status,
      )
      .filter((book) => filters.genre === "all" || book.genre === filters.genre)
      .filter(
        (book) =>
          filters.tag === "all" || (book.tagIds || []).includes(filters.tag),
      )
      .filter(
        (book) => filters.list === "all" || book.listIds.includes(filters.list),
      )
      .filter((book) =>
        normalize([book.title, book.author, book.isbn].join(" ")).includes(
          normalize(filters.query),
        ),
      );
    books.sort((first, second) => {
      if (filters.sort === "title")
        return first.title.localeCompare(second.title, "pt-BR");
      if (filters.sort === "author")
        return first.author.localeCompare(second.author, "pt-BR");
      if (filters.sort === "rating")
        return (second.rating || 0) - (first.rating || 0);
      return new Date(second.createdAt) - new Date(first.createdAt);
    });
    const total = books.length;
    const maxPage = Math.max(1, Math.ceil(total / booksPerPage));
    filters.page = Math.max(1, Math.min(filters.page, maxPage));
    const visible = books.slice(
      (filters.page - 1) * booksPerPage,
      filters.page * booksPerPage,
    );
    const mode = store.state.prefs.view || "grid";
    const filtered =
      filters.query ||
      filters.status !== "all" ||
      filters.list !== "all" ||
      filters.tag !== "all" ||
      filters.genre !== "all" ||
      filters.deleted;
    const tagName =
      store.state.tags.find((tag) => tag.id === filters.tag)?.name || "";
    const listName =
      store.state.lists.find((list) => list.id === filters.list)?.name || "";
    const contexts = [
      filters.deleted
        ? "Removidos"
        : { reading: "Lendo", want: "Quero ler", read: "Lidos" }[
            filters.status
          ],
      listName,
      tagName,
      filters.genre !== "all" ? filters.genre : "",
      filters.query.trim() ? `Busca: “${filters.query.trim()}”` : "",
    ].filter(Boolean);
    const range =
      total > booksPerPage
        ? ` · ${(filters.page - 1) * booksPerPage + 1}–${Math.min(filters.page * booksPerPage, total)} nesta página`
        : "";
    const resultLine = `<div class="result-line"><div class="result-summary"><span class="result-count" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">${total} ${total === 1 ? "livro" : "livros"}${range}</span>${contexts.length ? `<span class="result-context">${contexts.map(esc).join(" · ")}</span>` : '<span class="result-context">UMA HISTÓRIA DE CADA VEZ</span>'}</div>${filtered ? '<button class="text-button" data-action="clear-filters">Limpar filtros ×</button>' : ""}</div>`;
    const pagination =
      maxPage > 1
        ? `<nav class="pagination" aria-label="Paginação da biblioteca"><button class="secondary-button" data-action="prev-page" aria-label="Página anterior da biblioteca" ${filters.page === 1 ? "disabled" : ""}>← Anterior</button><span>Página ${filters.page} de ${maxPage}</span><button class="secondary-button" data-action="next-page" aria-label="Próxima página da biblioteca" ${filters.page === maxPage ? "disabled" : ""}>Próxima →</button></nav>`
        : "";
    const resultContent = total
      ? `<div class="book-${mode}">${visible.map((book) => bookCard(book, false, undefined, bookTags(book, store.state.tags, true))).join("")}</div>${pagination}`
      : empty(
          filters.deleted
            ? "Nenhum livro removido."
            : filtered
              ? "Nenhum livro encontrado."
              : "Sua estante está esperando.",
          filters.deleted
            ? "Os livros removidos podem ser restaurados a qualquer momento."
            : filtered
              ? "Tente outro título, autor ou ISBN, ou limpe os filtros para ver todo o acervo."
              : "Adicione o primeiro livro e comece a construir um lugar para suas leituras.",
          filtered
            ? `<button class="secondary-button" data-action="clear-filters">${filters.deleted ? "Ver todos os livros" : "Limpar filtros"}</button>`
            : addButton,
        );
    container.innerHTML = resultLine + resultContent;
    if (animate) reveal(container);
  }

  function changePage(delta) {
    filters.page += delta;
    renderResults();
    const container = $("#library-results");
    if (!container) return;
    $(".result-count", container)?.focus({ preventScroll: true });
    container.scrollIntoView({
      block: "start",
      behavior: getReducedMotion() ? "instant" : "smooth",
    });
  }

  function clear() {
    Object.assign(filters, createLibraryFilters(), { sort: filters.sort });
  }
  function selectSection(name) {
    clear();
    filters.list =
      store.state.lists.find((list) => list.name === name)?.id || "all";
  }
  return { filters, render, renderResults, changePage, clear, selectSection };
}
