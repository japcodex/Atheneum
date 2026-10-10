import { esc, icon, heading, addButton, empty, bookCard } from "../lib/ui.js";
import { catalog } from "../lib/catalog.js";

export function createDiscovery({ store, commitPage, getPage, refresh }) {
  const discovery = {
    query: "",
    genre: "all",
    results: null,
    loading: false,
    error: "",
    controller: null,
    cache: new Map(),
  };
  function isInLibrary(b) {
    return store
      .getBooks()
      .find(
        (x) =>
          x.title.toLocaleLowerCase("pt-BR") ===
            b.title.toLocaleLowerCase("pt-BR") &&
          x.author.toLocaleLowerCase("pt-BR") ===
            b.author.toLocaleLowerCase("pt-BR"),
      );
  }
  function renderDiscover() {
    const list = discovery.results || catalog,
      filtered = list.filter(
        (b) => discovery.genre === "all" || b.genre === discovery.genre,
      );
    commitPage(
      heading(
        "UM NOVO UNIVERSO A CADA LIVRO",
        "Deixe a curiosidade guiar.",
        "Há sempre uma história esperando por você.",
      ) +
        `<form id="discover-form" class="discover-search"><div class="search-box">${icon("search")}<input name="query" value="${esc(discovery.query)}" placeholder="Título, autor ou ISBN. O que desperta sua curiosidade?" aria-label="Buscar livros na Open Library" required minlength="2"></div><button class="primary-button" ${discovery.loading ? "disabled" : ""}>${discovery.loading ? "Buscando…" : "Buscar"} ${icon("arrow")}</button></form><div class="discover-genres">${["all", "Literatura brasileira", "Ficção", "Romance", "Ensaios"].map((g) => `<button class="chip ${discovery.genre === g ? "active" : ""}" data-action="discovery-genre" data-value="${g}">${g === "all" ? "Todos os caminhos" : g}</button>`).join("")}${discovery.results ? '<button class="text-button" data-action="reset-discovery">Voltar à curadoria ×</button>' : ""}</div><div class="source-line">${discovery.results ? "Dados bibliográficos: Open Library. Confira a edição e o total de páginas antes de salvar." : "Uma seleção editorial do Atheneum. Capas originais ilustrativas; o total de páginas depende da sua edição."}</div>${discovery.error ? `<div class="error-banner">${esc(discovery.error)} <button class="text-button" data-action="add-book">Cadastrar manualmente →</button></div>` : ""}${discovery.loading ? '<div class="reader-loading" role="status">Procurando novas histórias…</div>' : filtered.length ? `<div class="discover-grid">${filtered.map((b) => bookCard(b, true, isInLibrary)).join("")}</div>` : empty("Não encontramos esse capítulo.", "Tente outro título, autor ou ISBN. Você também pode cadastrar qualquer livro manualmente.", addButton)}`,
    );
  }
  async function searchDiscover(query) {
    discovery.controller?.abort();
    discovery.controller = null;
    discovery.loading = false;
    discovery.query = query.trim();
    discovery.genre = "all";
    discovery.error = "";
    if (discovery.cache.has(discovery.query)) {
      discovery.results = discovery.cache.get(discovery.query);
      refresh();
      return;
    }
    discovery.controller = new AbortController();
    const controller = discovery.controller;
    discovery.loading = true;
    refresh();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const url = new URL("https://openlibrary.org/search.json");
      url.search = new URLSearchParams({
        q: query,
        lang: "pt",
        limit: "16",
        fields:
          "key,title,author_name,cover_i,first_publish_year,editions,editions.key,editions.title,editions.isbn,editions.number_of_pages",
      });
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("service");
      const data = await response.json();
      if (discovery.controller !== controller) return;
      discovery.results = (data.docs || []).map((b, i) => {
        const edition = b.editions?.docs?.[0];
        return {
          id: "external-" + i,
          title: edition?.title || b.title,
          author: (b.author_name || []).join(", "),
          cover: b.cover_i
            ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg?default=false`
            : "",
          genre: "",
          isbn: edition?.isbn?.[0] || "",
          edition: edition?.key || "",
          description: b.first_publish_year
            ? `Primeira publicação: ${b.first_publish_year}. Dados da Open Library; confirme sua edição.`
            : "Dados da Open Library. Confira sua edição.",
          totalPages: edition?.number_of_pages || 0,
          status: "want",
        };
      });
      discovery.cache.set(discovery.query, discovery.results);
    } catch (error) {
      if (discovery.controller !== controller) return;
      discovery.error =
        "A busca externa está indisponível agora. Tente novamente ou cadastre seu livro manualmente.";
      discovery.results = null;
    } finally {
      clearTimeout(timeout);
      if (discovery.controller === controller) {
        discovery.loading = false;
        if (getPage() === "descobrir") refresh();
      }
    }
  }

  function getResult(id) {
    return [...catalog, ...(discovery.results || [])].find(
      (book) => book.id === id,
    );
  }
  function reset() {
    discovery.controller?.abort();
    discovery.controller = null;
    Object.assign(discovery, {
      results: null,
      query: "",
      error: "",
      genre: "all",
      loading: false,
    });
  }
  return {
    state: discovery,
    render: renderDiscover,
    search: searchDiscover,
    isInLibrary,
    getResult,
    reset,
    dispose() {
      discovery.controller?.abort();
      discovery.controller = null;
    },
  };
}
