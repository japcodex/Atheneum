/** Atheneum application controller: routing and user actions. */
import { $, esc, EDITION_PAGES } from "./lib/ui.js";
import { quotes } from "./lib/catalog.js";
import { loadPersonalCollection } from "./lib/collection.js";
import { createMotion } from "./lib/motion.js";
import { createPageRenderer } from "./lib/page-renderer.js";
import { bindActions } from "./lib/actions.js";
import { createFeedback } from "./lib/feedback.js";
import { createDialogs } from "./lib/dialogs.js";
import { createReader } from "./lib/reader.js";
import { renderHome } from "./pages/home.js";
import { createLibrary } from "./pages/library.js";
import { createDiscovery } from "./pages/discover.js";
import { renderSanctuary } from "./pages/sanctuary.js";
import { renderNotFound } from "./pages/not-found.js";

const main = $("#main");
const modal = $("#modal");
const feedback = createFeedback(modal);
const { toast, fail, act } = feedback;
let store, reader, dialogs, library, discoveryPage;
const motion = createMotion({
  main,
  nav: $(".main-nav"),
  // Keep the requested newspaper effects active without a level selector.
  getPreference: () => "full",
});
let sanctuaryMonth = "",
  page = readRoute(),
  quoteIndex = 0,
  resizeTimer,
  renderFrame = 0;
let renderPolicy = { reveal: false, preserve: true };
let lastSignature = "",
  routePending = false,
  disposed = false,
  ready = false,
  unsubscribe,
  disposeActions,
  modalObserver;

const writePage = createPageRenderer({ main, getPage: () => page, motion });

function readRoute() {
  const requested = location.hash.slice(1) || "inicio";
  return EDITION_PAGES.some((item) => item.id === requested)
    ? requested
    : "404";
}

function go(next) {
  location.hash = next;
}

function viewSignature(state) {
  return JSON.stringify([
    state.books,
    state.lists,
    state.tags,
    state.notes,
    state.sessions,
    state.rewards,
    state.achievements,
    state.goals,
    state.prefs.view,
    state.prefs.marqueePaused,
  ]);
}

function commitPage(html) {
  // Reveal only after each page has finished filling its dynamic regions.
  writePage(html, { ...renderPolicy, reveal: false });
}

function render(options = {}) {
  if (!ready || disposed) return;
  renderPolicy = { reveal: false, preserve: false, ...options };
  document.querySelectorAll("[data-page]").forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const pages = {
    inicio: () => renderHome({ store, commitPage, quoteIndex }),
    biblioteca: library.render,
    leitura: reader.render,
    descobrir: discoveryPage.render,
    santuario: () =>
      renderSanctuary({
        store,
        commitPage,
        month: sanctuaryMonth || store.stats().monthly.month,
      }),
    404: () => renderNotFound({ commitPage }),
  };
  pages[page]();
  document.title = `${EDITION_PAGES.find((item) => item.id === page)?.name || "Página não encontrada"} — Atheneum`;
  if (renderPolicy.reveal) motion.reveal(main);
  lastSignature = viewSignature(store.state);
}

function scheduleRender(state) {
  if (disposed || viewSignature(state) === lastSignature || renderFrame) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0;
    if (
      routePending ||
      disposed ||
      viewSignature(store.state) === lastSignature
    )
      return;
    render({ preserve: true });
  });
}

function updateQuote() {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  const quote = quotes[quoteIndex];
  const block = $(".quote-block blockquote");
  const author = $(".quote-author > span");
  if (block) {
    block.textContent = `“${quote.text}”`;
    block.animate?.(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: motion.isReduced() ? 0 : 350,
      },
    );
  }
  if (author) author.textContent = quote.author;
}

window.addEventListener("hashchange", () => {
  if (!ready || disposed) return;
  const next = readRoute();
  if (next === page && !routePending) return;
  routePending = true;
  cancelAnimationFrame(renderFrame);
  renderFrame = 0;
  motion.transition(
    () => {
      page = next;
      routePending = false;
      render();
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    { focus: true },
  );
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (page === "leitura") reader?.renderPdfPage();
  }, 180);
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  disposed = true;
  unsubscribe?.();
  disposeActions?.();
  cancelAnimationFrame(renderFrame);
  clearTimeout(resizeTimer);
  reader?.dispose();
  discoveryPage?.dispose();
  feedback.dispose();
  motion.dispose();
  modalObserver?.disconnect();
});

async function start() {
  try {
    store = new window.AtheneumStore();
    let collectionError;
    try {
      await loadPersonalCollection(store);
    } catch (error) {
      collectionError = error;
    }
    if (disposed) return;
    reader = createReader({
      store,
      commitPage,
      getPage: () => page,
      go,
      toast,
      act,
      fail,
      refresh: () => render({ preserve: true }),
    });
    discoveryPage = createDiscovery({
      store,
      commitPage,
      getPage: () => page,
      refresh: () => render({ preserve: true }),
    });
    library = createLibrary({
      store,
      commitPage,
      reveal: (root) => motion.reveal(root),
      getReducedMotion: () => motion.isReduced(),
    });
    dialogs = createDialogs({
      store,
      modal,
      toast,
      fail,
      isInLibrary: discoveryPage.isInLibrary,
    });
    ready = true;
    disposeActions = bindActions({
      store,
      main,
      modal,
      feedback,
      motion,
      reader,
      dialogs,
      library,
      discoveryPage,
      render,
      getPage: () => page,
      go,
      onQuote: updateQuote,
      onMonth: (month) => {
        sanctuaryMonth = month;
        if (page === "santuario") render({ reveal: true });
        else go("santuario");
      },
    });
    unsubscribe = store.subscribe(scheduleRender);
    page = readRoute();
    $("#edition-date").textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    })
      .format(new Date())
      .toUpperCase();
    motion.refreshPreference();
    render({ reveal: true });
    if (store.migrationWarnings?.length)
      toast(
        "Algumas capas antigas foram substituídas por capas tipográficas por segurança. Seus livros e registros foram preservados.",
      );
    if (collectionError)
      toast(
        collectionError.message ||
          "Não foi possível importar a coleção pessoal. Recarregue a página para tentar novamente. Seus dados foram preservados.",
      );
    modalObserver = new MutationObserver(() =>
      motion.reveal($("#modal-content")),
    );
    modalObserver.observe($("#modal-content"), { childList: true });
  } catch (error) {
    main.innerHTML = `<div class="error-banner"><h1>Não foi possível abrir seus dados.</h1><p>${esc(error.message)}</p><p>O acervo existente foi preservado. Verifique se o armazenamento do navegador está habilitado.</p></div>`;
  }
}

start();
