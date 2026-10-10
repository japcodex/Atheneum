import {
  $,
  esc,
  icon,
  cover,
  heading,
  addButton,
  empty,
  fmtDate,
  progress,
} from "./ui.js";
import { validatePdf, UPLOAD_LIMITS } from "./uploads.js";

/** PDF rendering, reading sessions and timer resources share one lifecycle. */
export function createReader({
  store,
  commitPage,
  getPage,
  go,
  toast,
  act,
  fail,
  refresh,
}) {
  let selectedBook = store.state.prefs.lastBookId || "";
  let pdfUrl = "",
    pdfBook = "",
    pdfPage = 1;
  let timerStarted = 0,
    timerElapsed = 0,
    timerInterval = null;
  let pdfDocument = null,
    pdfLibrary = null,
    pdfRendering = null,
    pdfGeneration = 0,
    pdfLoadGeneration = 0;
  function renderReading() {
    const books = store.getBooks();
    if (!selectedBook || !books.some((b) => b.id === selectedBook))
      select(
        books.find((b) => b.status === "reading")?.id || books[0]?.id || "",
      );
    const book = store.getBook(selectedBook);
    commitPage(
      heading(
        "UM TEMPO SÓ PARA VOCÊ",
        "Sala de leitura.",
        "Abra um livro. Deixe o resto do mundo esperar.",
      ) +
        (book
          ? `<div class="reading-layout"><div class="reading-main"><div class="reading-select"><span class="eyebrow">LENDO AGORA</span><select id="reading-book" aria-label="Escolher livro para ler">${books.map((b) => `<option value="${esc(b.id)}" ${book.id === b.id ? "selected" : ""}>${esc(b.title)}</option>`).join("")}</select><button class="icon-btn" data-action="detail" data-id="${esc(book.id)}" aria-label="Abrir ficha do livro">${icon("book")}</button></div><div id="reader-document">${pdfBook === book.id && pdfUrl ? pdfMarkup(book) : `<div class="reader-placeholder">${cover(book)}<div><span class="eyebrow red">${book.file ? "SEU ARQUIVO ESTÁ AQUI" : "DA ESTANTE PARA AS SUAS MÃOS"}</span><h2>${esc(book.title)}</h2><p>${book.file ? "Abra seu PDF e continue de onde parou." : "Lendo o exemplar físico? Registre suas páginas e guarde as ideias que merecem ficar."}</p><button class="secondary-button" data-action="${book.file ? "open-pdf" : "upload-pdf"}" data-id="${esc(book.id)}">${book.file ? "Abrir PDF →" : "Adicionar um PDF +"}</button></div></div>`}</div><div class="session-history"><div class="section-heading"><h2>Seu diário de leitura.</h2></div>${
              store
                .getSessions(book.id)
                .map(
                  (s) =>
                    `<div class="session-row"><span>${fmtDate(s.date)} · páginas ${s.fromPage} → ${s.toPage}</span><span>${s.pages} páginas · ${s.duration} min</span><button class="text-button" data-action="edit-session" data-id="${esc(s.id)}">Corrigir</button></div>`,
                )
                .join("") ||
              '<p class="subtle-message">Sua próxima sessão será a primeira deste livro.</p>'
            }</div></div><aside class="reader-sidebar"><span class="eyebrow red">SEU MARCADOR</span><h2 style="margin-top:12px">Página ${book.currentPage}${book.totalPages ? " de " + book.totalPages : ""}</h2><div class="reading-progress"><span style="width:${progress(book)}%"></span></div><form id="session-form"><input type="hidden" name="bookId" value="${esc(book.id)}"><div class="field"><label for="session-page">Até qual página você leu?</label><input id="session-page" name="toPage" type="number" min="${book.currentPage}" ${book.totalPages ? 'max="' + book.totalPages + '"' : ""} value="${book.currentPage}" required><span class="field-error" data-error="toPage"></span></div><div class="field"><label for="session-duration">Duração em minutos (opcional)</label><input id="session-duration" name="duration" type="number" min="0" max="1440" value="0"></div><div class="timer" id="timer-display">${timerString()}</div><div class="timer-buttons"><button type="button" class="secondary-button" data-action="timer">${timerStarted ? "Pausar" : "Iniciar cronômetro"}</button><button type="button" class="text-button" data-action="timer-reset">Zerar</button></div><button class="primary-button">Registrar leitura ${icon("arrow")}</button></form><p class="storage-message" style="margin-top:14px">Registre as páginas com ou sem cronômetro. Correções ficam disponíveis no diário.</p><button class="text-button" style="margin-top:16px" data-action="detail" data-id="${esc(book.id)}">Ver e escrever anotações ↗</button><button class="text-button" style="display:block;margin-top:10px" data-action="progress-correction" data-id="${esc(book.id)}">Corrigir página atual</button></aside></div>`
          : empty(
              "Qual história vamos abrir?",
              "Adicione um livro à biblioteca para registrar sua leitura, com ou sem um arquivo digital.",
              addButton,
            )),
    );
    if (pdfDocument && pdfBook === book?.id) renderPdfPage();
  }
  function pdfMarkup(book) {
    return `<div class="pdf-controls"><div class="page-navigator"><button class="icon-btn" data-action="pdf-prev" aria-label="Página anterior" ${pdfPage === 1 ? "disabled" : ""}>←</button><label for="pdf-page">Página</label><input id="pdf-page" type="number" min="1" max="${pdfDocument?.numPages || 1}" value="${pdfPage}"><span>de ${pdfDocument?.numPages || "…"}</span><button class="icon-btn" data-action="pdf-next" aria-label="Próxima página" ${pdfPage === pdfDocument?.numPages ? "disabled" : ""}>→</button><button class="text-button" data-action="pdf-go">Ir</button></div><a class="text-button" href="${pdfUrl}" download="${esc(book.file?.name || "leitura.pdf")}">Baixar PDF original ↓</a></div><div class="pdf-canvas-container"><div id="pdf-status" class="storage-message" role="status">Preparando sua página…</div><canvas id="pdf-canvas" role="img" aria-label="Página ${pdfPage} do PDF de ${esc(book.title)}"></canvas><div id="pdf-text" class="sr-only"></div></div><p class="storage-message">A posição do PDF é salva ao navegar. Registre as páginas lidas para atualizar sua jornada. O leitor exibe apenas páginas; scripts, formulários e links internos do PDF não são ativados.</p>`;
  }
  async function openPdf(id) {
    const b = store.getBook(id);
    if (!b) return;
    select(id);
    const loadGeneration = ++pdfLoadGeneration;
    const container = $("#reader-document");
    if (container)
      container.innerHTML =
        '<div class="reader-loading" role="status">Abrindo seu PDF…</div>';
    try {
      const file = await store.getFile(id);
      if (loadGeneration !== pdfLoadGeneration) return;
      if (!file)
        throw new Error(
          "Arquivo não encontrado neste navegador. Anexe o PDF novamente.",
        );
      await validatePdf(file);
      if (!pdfLibrary) {
        pdfLibrary = await import("../assets/pdfjs/pdf.mjs");
        pdfLibrary.GlobalWorkerOptions.workerSrc = new URL(
          "../assets/pdfjs/pdf.worker.mjs",
          import.meta.url,
        ).href;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const nextDocument = await pdfLibrary.getDocument({
        data: bytes,
        useWasm: false,
        isEvalSupported: false,
        enableXfa: false,
        stopAtErrors: true,
        maxImageSize: UPLOAD_LIMITS.imagePixels,
        canvasMaxAreaInBytes: 64 * 1024 * 1024,
        disableAutoFetch: true,
      }).promise;
      if (nextDocument.numPages > 20000) {
        await nextDocument.destroy();
        throw new Error("O PDF ultrapassa o limite de 20.000 páginas do leitor.");
      }
      if (selectedBook !== id || loadGeneration !== pdfLoadGeneration) {
        await nextDocument.destroy();
        return;
      }
      pdfRendering?.cancel();
      const previousDocument = pdfDocument;
      pdfDocument = null;
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = "";
      pdfBook = "";
      if (previousDocument) await previousDocument.destroy();
      if (selectedBook !== id || loadGeneration !== pdfLoadGeneration) {
        await nextDocument.destroy();
        return;
      }
      pdfDocument = nextDocument;
      pdfUrl = URL.createObjectURL(file);
      pdfBook = id;
      pdfPage = Math.min(
        pdfDocument.numPages,
        Math.max(1, store.state.prefs.pdfPages?.[id] || b.currentPage || 1),
      );
      if (getPage() === "leitura") refresh();
    } catch (error) {
      if (loadGeneration !== pdfLoadGeneration) return;
      // A replaced file must never leave the previous document on screen.
      pdfRendering?.cancel();
      const failedDocument = pdfDocument;
      pdfDocument = null;
      pdfBook = "";
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = "";
      if (failedDocument) {
        try { await failedDocument.destroy(); } catch { /* Already disposed. */ }
      }
      if (loadGeneration !== pdfLoadGeneration) return;
      if (selectedBook === id && getPage() === "leitura") {
        refresh();
        const area = $("#reader-document");
        if (area)
          area.insertAdjacentHTML(
            "afterbegin",
            `<div class="error-banner">Não foi possível abrir o PDF. ${esc(error.message)} Você pode anexar outro arquivo ou continuar registrando sua leitura.</div>`,
          );
      }
      fail(error);
    }
  }
  async function renderPdfPage() {
    const canvas = $("#pdf-canvas");
    if (!canvas || !pdfDocument) return;
    const generation = ++pdfGeneration;
    pdfRendering?.cancel();
    try {
      const pdf = pdfDocument,
        p = await pdf.getPage(pdfPage);
      if (generation !== pdfGeneration || !canvas.isConnected) return;
      const original = p.getViewport({ scale: 1 });
      if (!Number.isFinite(original.width) || !Number.isFinite(original.height) ||
          original.width <= 0 || original.height <= 0)
        throw new Error("As dimensões desta página são inválidas.");
      const available = Math.max(100, canvas.parentElement.clientWidth - 24),
        ratio = Math.min(window.devicePixelRatio || 1, 2),
        scale = Math.min(available / original.width,
          UPLOAD_LIMITS.imageEdge / original.width / ratio,
          UPLOAD_LIMITS.imageEdge / original.height / ratio,
          Math.sqrt(UPLOAD_LIMITS.imagePixels / (original.width * original.height)) / ratio),
        viewport = p.getViewport({ scale });
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      pdfRendering = p.render({
        canvas,
        canvasContext: canvas.getContext("2d"),
        viewport,
        transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0],
        annotationMode: pdfLibrary.AnnotationMode.DISABLE,
      });
      await pdfRendering.promise;
      if (generation !== pdfGeneration || !canvas.isConnected) return;
      $("#pdf-status").textContent = `Página ${pdfPage} de ${pdf.numPages}`;
      const text = await p.getTextContent();
      if (generation === pdfGeneration && $("#pdf-text"))
        $("#pdf-text").textContent = text.items
          .map((item) => item.str || "")
          .join(" ");
    } catch (error) {
      if (
        error.name === "RenderingCancelledException" ||
        generation !== pdfGeneration
      )
        return;
      const status = $("#pdf-status");
      if (status)
        status.textContent =
          "Não foi possível exibir a página. Baixe o PDF original ou anexe outro arquivo.";
    }
  }
  function changePdfPage(next) {
    if (!pdfDocument) return;
    if (!Number.isInteger(next) || next < 1 || next > pdfDocument.numPages) {
      toast(`Informe uma página de 1 a ${pdfDocument.numPages}.`);
      return;
    }
    pdfPage = next;
    act(() =>
      store.setPrefs({
        pdfPages: { ...(store.state.prefs.pdfPages || {}), [pdfBook]: next },
      }),
    );
    refreshPdfControls();
    renderPdfPage();
  }
  function timerSeconds() {
    return (
      timerElapsed +
      (timerStarted ? Math.floor((Date.now() - timerStarted) / 1000) : 0)
    );
  }
  function timerString() {
    const seconds = timerSeconds();
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function tickTimer() {
    const t = $("#timer-display");
    if (t) t.textContent = timerString();
  }
  function resetTimer() {
    clearInterval(timerInterval);
    timerStarted = 0;
    timerElapsed = 0;
    timerInterval = null;
  }
  async function uploadPdf(id) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.addEventListener(
      "change",
      async () => {
        if (!input.files[0]) return;
        try {
          await validatePdf(input.files[0]);
          await store.saveFile(id, input.files[0]);
          toast("PDF salvo neste navegador.");
          await openPdf(id);
        } catch (error) {
          fail(error);
        } finally {
          input.remove();
        }
      },
      { once: true },
    );
    input.click();
  }

  function refreshPdfControls() {
    const input = $("#pdf-page");
    if (input) input.value = pdfPage;
    const previous = $('[data-action="pdf-prev"]');
    const next = $('[data-action="pdf-next"]');
    if (previous) previous.disabled = pdfPage === 1;
    if (next) next.disabled = pdfPage === pdfDocument?.numPages;
    const canvas = $("#pdf-canvas");
    if (canvas)
      canvas.setAttribute(
        "aria-label",
        `Página ${pdfPage} do PDF de ${store.getBook(pdfBook)?.title || ""}`,
      );
  }
  function select(id) {
    if (id === selectedBook) return;
    resetTimer();
    selectedBook = id;
    pdfGeneration++;
    pdfLoadGeneration++;
    pdfRendering?.cancel();
    pdfDocument?.destroy();
    pdfDocument = null;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = "";
    pdfBook = "";
  }
  function toggleTimer() {
    if (timerStarted) {
      timerElapsed = timerSeconds();
      timerStarted = 0;
      clearInterval(timerInterval);
    } else {
      timerStarted = Date.now();
      timerInterval = setInterval(tickTimer, 1000);
    }
    const button = $('[data-action="timer"]');
    if (button)
      button.textContent = timerStarted ? "Pausar" : "Iniciar cronômetro";
    tickTimer();
  }
  function dispose() {
    resetTimer();
    pdfGeneration++;
    pdfLoadGeneration++;
    pdfRendering?.cancel();
    pdfDocument?.destroy();
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }
  return {
    render: renderReading,
    openPdf,
    uploadPdf,
    renderPdfPage,
    changePdfPage,
    timerSeconds,
    tickTimer,
    resetTimer,
    toggleTimer,
    select,
    dispose,
    previousPdfPage() {
      changePdfPage(pdfPage - 1);
    },
    nextPdfPage() {
      changePdfPage(pdfPage + 1);
    },
    get selectedBook() {
      return selectedBook;
    },
  };
}
