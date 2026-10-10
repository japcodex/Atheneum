import { $, esc, fallbackCover } from "./ui.js";
import { shiftMonth } from "./goals.js";

/** Delegated actions for the library, dialogs and reader. Rendering stays in the controller. */
export function bindActions({
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
  getPage,
  go,
  onQuote,
  onMonth,
}) {
  const eventsController = new AbortController();
  function listen(target, name, callback, options = {}) {
    target.addEventListener(
      name,
      callback,
      typeof options === "boolean"
        ? { capture: options, signal: eventsController.signal }
        : { ...options, signal: eventsController.signal },
    );
  }
  const { toast, fail, act } = feedback;
  const filters = library.filters;
  const discovery = discoveryPage.state;
  const {
    bookForm,
    showDetail,
    catalogDetail,
    showPreferences,
    closeModal,
    modalHeader,
    showModal,
    listForm,
    showGoals,
    showMonthlyGoal,
    showTags,
    tagForm,
    editNote,
    editSession,
    download,
    exportBackup,
    importBackup,
    saveBookForm,
  } = dialogs;
  const {
    openPdf,
    uploadPdf,
    changePdfPage,
    resetTimer,
    timerSeconds,
    tickTimer,
  } = reader;
  const { isInLibrary, getResult, search: searchDiscover } = discoveryPage;
  const renderLibrary = () => render({ preserve: true }),
    renderReading = render,
    renderDiscover = render;
  const renderLibraryResults = () => library.renderResults(false);
  listen(document.querySelector(".skip-link"), "click", (event) => {
    event.preventDefault();
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: "instant", block: "start" });
  });
  listen(document, "click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id, value, month } = button.dataset;
    if (dialogs.saving && button.closest("dialog")) {
      toast("Aguarde o livro terminar de salvar.");
      return;
    }
    if (
      dialogs.dirty &&
      button.closest("dialog") &&
      !["close-modal", "keep-editing", "discard-changes"].includes(action)
    ) {
      toast("Salve as alterações antes de mudar esta janela.");
      return;
    }
    switch (action) {
      case "manage-tags":
        showTags();
        break;
      case "add-tag":
        tagForm();
        break;
      case "edit-tag":
        tagForm(id);
        break;
      case "delete-tag":
        showModal(
          modalHeader("Excluir esta marca?") +
            `<p class="detail-description">A tag será retirada dos livros. As obras e seus registros ficam preservados.</p><div class="preferences-actions"><button class="secondary-button" data-action="edit-tag" data-id="${esc(id)}">Voltar</button><button class="primary-button" data-action="confirm-delete-tag" data-id="${esc(id)}">Excluir tag</button></div>`,
          "confirm",
        );
        break;
      case "confirm-delete-tag":
        if (
          act(
            () => store.deleteTag(id),
            "Tag excluída. Livros preservados.",
          ) !== null
        ) {
          filters.tag = "all";
          dialogs.clearDirty();
          showTags();
        }
        break;
      case "tag-filter":
        filters.tag = filters.tag === id ? "all" : id;
        filters.page = 1;
        if (getPage() !== "biblioteca") go("biblioteca");
        else renderLibrary();
        break;
      case "monthly-goal":
        showMonthlyGoal(month);
        break;
      case "monthly-prev":
        onMonth(shiftMonth(month, -1));
        break;
      case "monthly-next":
        onMonth(shiftMonth(month, 1));
        break;
      case "monthly-select":
        onMonth(month);
        break;
      case "add-book":
        bookForm();
        break;
      case "edit-book":
        bookForm(store.getBook(id));
        break;
      case "detail":
        showDetail(id);
        break;
      case "catalog-book":
        catalogDetail(getResult(id));
        break;
      case "result-book":
        catalogDetail(getResult(id));
        break;
      case "result-add": {
        const b = getResult(id),
          exists = isInLibrary(b);
        if (exists) showDetail(exists.id);
        else {
          const { id: unused, ...data } = b;
          bookForm(data);
        }
        break;
      }
      case "section-library":
        library.selectSection(value);
        go("biblioteca");
        if (getPage() === "biblioteca") render();
        break;
      case "go-library":
        go("biblioteca");
        break;
      case "preferences":
        showPreferences();
        break;
      case "close-modal":
        closeModal();
        break;
      case "keep-editing":
        $("#dirty-confirm").innerHTML = "";
        break;
      case "discard-changes":
        closeModal(true);
        break;
      case "quote":
        onQuote();
        break;
      case "status-filter":
        filters.status = value;
        filters.deleted = false;
        filters.page = 1;
        renderLibrary();
        break;
      case "list-filter":
        filters.list = filters.list === id ? "all" : id;
        filters.page = 1;
        renderLibrary();
        break;
      case "trash":
        filters.deleted = true;
        filters.status = "all";
        filters.list = "all";
        filters.page = 1;
        renderLibrary();
        break;
      case "clear-filters":
        library.clear();
        renderLibrary();
        break;
      case "view":
        act(() => store.setPrefs({ view: value }));
        break;
      case "prev-page":
        library.changePage(-1);
        break;
      case "next-page":
        library.changePage(1);
        break;
      case "add-list":
        listForm();
        break;
      case "edit-list":
        listForm(id);
        break;
      case "delete-list": {
        const l = store.state.lists.find((x) => x.id === id);
        showModal(
          modalHeader("Excluir esta lista?") +
            `<p class="detail-description">A lista “${esc(l?.name)}” será excluída. Todos os livros continuam na sua biblioteca.</p><div class="preferences-actions"><button class="secondary-button" data-action="edit-list" data-id="${esc(id)}">Voltar</button><button class="primary-button" data-action="confirm-delete-list" data-id="${esc(id)}">Excluir lista</button></div>`,
          "confirm",
        );
        break;
      }
      case "confirm-delete-list":
        if (
          act(
            () => store.deleteList(id),
            "Lista excluída. Livros preservados.",
          ) !== null
        ) {
          filters.list = "all";
          closeModal(true);
          render();
        }
        break;
      case "delete-book":
        if (act(() => store.deleteBook(id)) !== null) {
          closeModal(true);
          toast("Livro removido. Ele continua disponível em Removidos.", id);
        }
        break;
      case "restore-book":
        if (act(() => store.restoreBook(id), "Livro restaurado.") !== null) {
          if (modal.open) showDetail(id);
        }
        break;
      case "undo-delete":
        act(
          () => store.restoreBook($("#toast").dataset.undo),
          "Livro restaurado.",
        );
        break;
      case "rating":
        if (
          act(
            () =>
              store.updateBook(id, { rating: value ? Number(value) : null }),
            "Avaliação salva.",
          ) !== null
        )
          showDetail(id);
        break;
      case "read-book":
        closeModal(true);
        reader.select(id);
        act(() => store.setPrefs({ lastBookId: id }));
        go("leitura");
        if (getPage() === "leitura") renderReading();
        break;
      case "progress-correction":
        showDetail(id);
        break;
      case "open-pdf":
        await openPdf(id);
        break;
      case "upload-pdf":
        await uploadPdf(id);
        break;
      case "pdf-prev":
        reader.previousPdfPage();
        break;
      case "pdf-next":
        reader.nextPdfPage();
        break;
      case "pdf-go":
        changePdfPage(Number($("#pdf-page").value));
        break;
      case "timer":
        reader.toggleTimer();
        break;
      case "timer-reset":
        resetTimer();
        tickTimer();
        $('[data-action="timer"]').textContent = "Iniciar cronômetro";
        break;
      case "edit-note":
        editNote(id);
        break;
      case "delete-note": {
        const note = store.state.notes.find((n) => n.id === id);
        showModal(
          modalHeader("Excluir esta anotação?") +
            `<p class="detail-description">Essa anotação será removida. Exporte um backup se quiser guardar uma cópia.</p><div class="preferences-actions"><button class="secondary-button" data-action="detail" data-id="${esc(note.bookId)}">Voltar ao livro</button><button class="primary-button" data-action="confirm-delete-note" data-id="${esc(id)}">Excluir anotação</button></div>`,
          "confirm",
        );
        break;
      }
      case "confirm-delete-note": {
        const note = store.state.notes.find((n) => n.id === id);
        if (act(() => store.deleteNote(id), "Anotação excluída.") !== null)
          showDetail(note.bookId);
        break;
      }
      case "edit-session":
        editSession(id);
        break;
      case "delete-session":
        showModal(
          modalHeader("Excluir esta sessão?") +
            `<p class="detail-description">As estatísticas serão recalculadas. O marcador do livro e os marcos históricos ficam preservados.</p><div class="preferences-actions"><button class="secondary-button" data-action="edit-session" data-id="${esc(id)}">Voltar</button><button class="primary-button" data-action="confirm-delete-session" data-id="${esc(id)}">Excluir sessão</button></div>`,
          "confirm",
        );
        break;
      case "confirm-delete-session":
        if (act(() => store.deleteSession(id), "Sessão excluída.") !== null)
          closeModal(true);
        break;
      case "goals":
        showGoals();
        break;
      case "export":
        await exportBackup();
        break;
      case "export-records":
        download(store.exportBackup(), `atheneum-registros-${Date.now()}.json`);
        toast("Registros exportados. PDFs não incluídos.");
        break;
      case "import":
        $("#backup-input").click();
        break;
      case "discovery-genre":
        discovery.genre = value;
        renderDiscover();
        break;
      case "reset-discovery":
        discoveryPage.reset();
        renderDiscover();
        break;
      case "pause-marquee": {
        const track = $(".auto-track");
        track.classList.toggle("paused");
        const paused = track.classList.contains("paused");
        button.textContent = paused ? "Retomar movimento" : "Pausar movimento";
        act(() => store.setPrefs({ marqueePaused: paused }));
        break;
      }
    }
  });
  listen(document, "input", (event) => {
    if (event.target.closest("dialog") && event.target.closest("form"))
      dialogs.markDirty();
    if (event.target.id === "library-search") {
      filters.query = event.target.value;
      filters.page = 1;
      renderLibraryResults();
    }
  });
  listen(document, "change", (event) => {
    const t = event.target;
    if (t.id === "genre-filter") {
      filters.genre = t.value;
      filters.page = 1;
      renderLibraryResults();
    }
    if (t.id === "sort-filter") {
      filters.sort = t.value;
      renderLibraryResults();
    }
    if (t.id === "reading-book") {
      reader.select(t.value);
      act(() => store.setPrefs({ lastBookId: t.value }));
      renderReading();
    }
    if (t.id === "list-picker") {
      filters.list = t.value;
      filters.page = 1;
      renderLibrary();
    }
    if (t.id === "backup-input") importBackup(t.files[0]);
  });
  listen(document, "submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (dialogs.saving) return;
    const fd = new FormData(form),
      data = Object.fromEntries(fd);
    if (
      form.closest("dialog") &&
      form.getAttribute("id") !== "note-form" &&
      $("#note-text")?.value.trim()
    ) {
      toast(
        "Guarde sua anotação antes de salvar outras alterações nesta ficha.",
      );
      return;
    }
    switch (form.getAttribute("id")) {
      case "tag-form":
        try {
          data.id
            ? store.updateTag(data.id, { name: data.name, color: data.color })
            : store.addTag({ name: data.name, color: data.color });
          dialogs.clearDirty();
          showTags();
          toast("Tag salva.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "monthly-goal-form":
        try {
          store.setMonthlyGoal({
            month: data.month,
            books: Number(data.books || 0),
            pages: Number(data.pages || 0),
            minutes: Number(data.minutes || 0),
            paused: data.paused === "true",
          });
          dialogs.clearDirty();
          closeModal(true);
          onMonth(data.month);
          toast("Meta mensal salva.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "book-form":
        await saveBookForm(form);
        break;
      case "discover-form":
        await searchDiscover(data.query);
        break;
      case "list-form":
        try {
          data.id
            ? store.updateList(data.id, data.name)
            : store.addList(data.name);
          closeModal(true);
          toast("Lista salva.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "detail-progress":
        try {
          store.updateBook(data.bookId, {
            status:
              data.status === "read" &&
              store.getBook(data.bookId).totalPages > 0 &&
              Number(data.currentPage) < store.getBook(data.bookId).totalPages
                ? "reading"
                : data.status,
            currentPage: Number(data.currentPage),
          });
          dialogs.clearDirty();
          showDetail(data.bookId);
          toast("Progresso salvo.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "detail-lists":
        try {
          store.setBookLists(data.bookId, fd.getAll("listIds"));
          dialogs.clearDirty();
          showDetail(data.bookId);
          toast("Listas salvas.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "note-form":
        try {
          store.addNote(data.bookId, {
            text: data.text,
            page: data.page === "" ? null : Number(data.page),
          });
          dialogs.clearDirty();
          showDetail(data.bookId);
          toast("Anotação guardada.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "edit-note-form":
        try {
          store.updateNote(data.id, {
            text: data.text,
            page: data.page === "" ? null : Number(data.page),
          });
          dialogs.clearDirty();
          showDetail(data.bookId);
          toast("Anotação atualizada.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "session-form": {
        const submit =
          form.querySelector('[type="submit"]') ||
          form.querySelector(".primary-button");
        submit.disabled = true;
        try {
          const mins = Number(data.duration) || Math.round(timerSeconds() / 60);
          store.recordSession(data.bookId, {
            toPage: Number(data.toPage),
            duration: mins,
            date: new Date().toISOString(),
            requestId:
              form.dataset.requestId ||
              (form.dataset.requestId = crypto.randomUUID()),
          });
          resetTimer();
          renderReading();
          toast("Sessão registrada. Mais um capítulo da sua jornada.");
        } catch (error) {
          fail(error, form);
          submit.disabled = false;
        }
        break;
      }
      case "edit-session-form":
        try {
          store.updateSession(data.id, {
            fromPage: Number(data.fromPage),
            toPage: Number(data.toPage),
            duration: Number(data.duration),
            date: data.date,
          });
          closeModal(true);
          toast("Sessão corrigida.");
        } catch (error) {
          fail(error, form);
        }
        break;
      case "goals-form":
        try {
          store.setGoals({
            year: Number(data.year),
            annualBooks: Number(data.annualBooks),
            dailyPages: Number(data.dailyPages || 0),
            weeklyPages: Number(data.weeklyPages || 0),
            paused: data.paused === "true",
          });
          closeModal(true);
          toast("Metas salvas.");
        } catch (error) {
          fail(error, form);
        }
        break;
    }
  });
  listen(
    document,
    "error",
    (event) => {
      const img = event.target;
      if (img instanceof HTMLImageElement && img.dataset.coverTitle) {
        const template = document.createElement("template");
        template.innerHTML = fallbackCover(
          {
            title: img.dataset.coverTitle,
            author: img.dataset.coverAuthor,
            genre: img.dataset.coverGenre,
          },
          img.className.replace(/\bcover\b/g, ""),
        );
        img.replaceWith(template.content.firstElementChild);
      }
    },
    true,
  );
  listen(modal, "cancel", (event) => {
    event.preventDefault();
    closeModal();
  });
  listen(modal, "click", (event) => {
    if (event.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeModal();
    }
  });
  listen(window, "beforeunload", (event) => {
    if (dialogs?.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  return () => eventsController.abort();
}
