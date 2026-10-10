import { $, esc, icon, cover, fmtDate, progress, statusLabels } from "./ui.js";
import { prepareCover, validatePdf, prepareBackup } from "./uploads.js";
import {
  tagCheckboxes,
  bookTags,
  renderTagManager,
  renderTagForm,
} from "./tags.js";
import { renderMonthlyGoalForm } from "./goals.js";

/** Dialog state is independent of page rendering, so edits survive store updates. */
export function createDialogs({ store, modal, toast, fail, isInLibrary }) {
  let modalKind = "",
    modalBook = "",
    dirty = false,
    lastFocus = null,
    saving = false;
  function modalHeader(title) {
    return `<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="modal-close" data-action="close-modal" aria-label="Fechar janela">×</button></div><div id="dirty-confirm"></div>`;
  }
  function showModal(html, kind) {
    if (saving) {
      toast("Aguarde o livro terminar de salvar.");
      return;
    }
    if (!modal.open) lastFocus = document.activeElement;
    modalKind = kind;
    dirty = false;
    $("#modal-content").innerHTML = html;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }
  function closeModal(force = false) {
    if (saving) {
      toast("Aguarde o livro terminar de salvar.");
      return;
    }
    if (dirty && !force) {
      $("#dirty-confirm").innerHTML =
        '<div class="modal-notice">Há alterações não salvas. Deseja descartar?<div class="preferences-actions" style="margin-top:10px"><button class="secondary-button" data-action="keep-editing">Continuar editando</button><button class="text-button danger-button" data-action="discard-changes">Descartar alterações</button></div></div>';
      $("#dirty-confirm").scrollIntoView({ block: "nearest" });
      return;
    }
    modal.close();
    dirty = false;
    modalKind = "";
    if (lastFocus?.isConnected) lastFocus.focus();
    else $("#main").focus({ preventScroll: true });
  }
  function field(name, label, value = "", type = "text", opts = "") {
    return `<div class="field"><label for="book-${name}">${label}</label><input id="book-${name}" name="${name}" type="${type}" value="${esc(value)}" ${opts}><span class="field-error" data-error="${name}"></span></div>`;
  }
  function bookForm(book = {}) {
    modalBook = book.id || "";
    const defaults = {
      title: "",
      author: "",
      genre: "",
      isbn: "",
      edition: "",
      totalPages: 0,
      currentPage: 0,
      status: "want",
      cover: "",
      description: "",
      listIds: [],
      tagIds: [],
      rating: null,
      ...book,
    };
    showModal(
      modalHeader(book.id ? "Editar livro" : "Uma nova história.") +
        `<form id="book-form"><div class="book-form"><div class="full-width">${field("title", "Título *", defaults.title, "text", 'required maxlength="300"')}</div>${field("author", "Autor", defaults.author, "text", 'maxlength="300"')}${field("genre", "Gênero", defaults.genre, "text", 'maxlength="150"')}${field("isbn", "ISBN (opcional)", defaults.isbn)}${field("edition", "Edição (opcional)", defaults.edition)}${field("totalPages", "Total de páginas", defaults.totalPages || "", "number", 'min="0" max="100000"')}${field("currentPage", "Página atual", defaults.currentPage, "number", 'min="0" max="100000"')}<div class="field"><label for="book-status">Situação</label><select id="book-status" name="status">${Object.entries(
          statusLabels,
        )
          .map(
            ([v, l]) =>
              `<option value="${v}" ${defaults.status === v ? "selected" : ""}>${l}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="field"><label for="book-rating">Sua avaliação</label><select id="book-rating" name="rating"><option value="">Sem avaliação</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${defaults.rating === n ? "selected" : ""}>${n} ${n === 1 ? "estrela" : "estrelas"}</option>`).join("")}</select></div><div class="full-width">${field("cover", "Link da capa (opcional)", defaults.cover)}<div class="field" style="margin-top:10px"><label for="cover-upload">Ou envie uma imagem de capa</label><input id="cover-upload" type="file" name="coverUpload" accept="image/png,image/jpeg,image/webp"><small>PNG, JPEG ou WebP, até 2 MB.</small></div></div><div class="field full-width"><label for="book-description">Sobre o livro</label><textarea id="book-description" name="description" rows="3" maxlength="10000">${esc(defaults.description)}</textarea></div><div class="field full-width"><span>Adicionar às listas</span><div class="checkbox-group">${store.state.lists.map((l) => `<label><input name="listIds" type="checkbox" value="${esc(l.id)}" ${defaults.listIds.includes(l.id) ? "checked" : ""}>${esc(l.name)}</label>`).join("") || "<small>Crie listas na Biblioteca para organizar seus livros.</small>"}</div></div>${tagCheckboxes(defaults, store.state.tags)}<div class="field full-width"><label for="book-pdf">Arquivo de leitura (PDF, opcional)</label><input id="book-pdf" name="pdf" type="file" accept="application/pdf,.pdf"><small>Até 25 MB. O arquivo fica privado neste navegador.${defaults.file ? " Arquivo atual: " + esc(defaults.file.name) : ""}</small></div><div class="full-width"><label class="form-help"><input name="allowDuplicate" type="checkbox" style="min-height:auto;accent-color:var(--red)"> Esta é outra cópia ou edição; permitir duplicado.</label></div></div><div class="form-actions"><span class="form-help">* Campo obrigatório. Salvamento neste navegador.</span><button class="primary-button" type="submit">Salvar livro ${icon("arrow")}</button></div></form>`,
      "book-form",
    );
  }
  async function saveBookForm(form) {
    if (saving) return;
    saving = true;
    dirty = true;
    const targetBookId = modalBook;
    form.querySelectorAll("[data-error]").forEach((e) => (e.textContent = ""));
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const fd = new FormData(form),
      data = Object.fromEntries(fd);
    data.totalPages = Number(data.totalPages || 0);
    data.currentPage = Number(data.currentPage || 0);
    data.rating = data.rating ? Number(data.rating) : null;
    data.listIds = fd.getAll("listIds");
    data.tagIds = fd.getAll("tagIds");
    delete data.pdf;
    delete data.coverUpload;
    delete data.allowDuplicate;
    try {
      const upload = fd.get("coverUpload");
      if (upload?.size) {
        data.cover = await prepareCover(upload);
      }
      const file = fd.get("pdf");
      if (file?.size) await validatePdf(file);
      let book;
      if (targetBookId)
        book = store.updateBook(targetBookId, data, {
          allowDuplicate: fd.get("allowDuplicate") === "on",
        });
      else {
        book = store.addBook(data, {
          allowDuplicate: fd.get("allowDuplicate") === "on",
        });
        modalBook = book.id;
      }
      if (file?.size) {
        try {
          await store.saveFile(book.id, file);
        } catch (e) {
          toast("O livro foi salvo, mas o PDF falhou: " + e.message);
          return;
        }
      }
      saving = false;
      closeModal(true);
      toast("Livro salvo na sua biblioteca.");
    } catch (error) {
      fail(error, form);
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }
  function showDetail(id) {
    const b = store.getBook(id);
    if (!b) return;
    modalBook = id;
    showModal(
      modalHeader("Ficha do livro") +
        `<div class="detail-layout"><div>${cover(b, "detail-cover")}<p class="book-file-name">${b.file ? esc(b.file.name) : "Sem arquivo de leitura"}</p></div><div class="detail-info"><span class="eyebrow red">${esc(b.genre || "SUA BIBLIOTECA")}</span><h2 style="margin-top:10px">${esc(b.title)}</h2><span class="detail-author">${esc(b.author || "Autor não informado")}</span>${bookTags(b, store.state.tags)}<div class="detail-meta"><span>${b.totalPages ? b.totalPages + " páginas" : "Total de páginas não informado"}</span>${b.isbn ? `<span>ISBN ${esc(b.isbn)}</span>` : ""}${b.edition ? `<span>${esc(b.edition)}</span>` : ""}</div><p class="detail-description">${esc(b.description || "Cada livro guarda um universo. Edite a ficha para adicionar uma descrição da obra.")}</p><div class="preferences-actions">${b.deletedAt ? `<button class="primary-button" data-action="restore-book" data-id="${esc(id)}">Restaurar livro ↶</button>` : `<button class="primary-button" data-action="read-book" data-id="${esc(id)}">Continuar leitura ${icon("arrow")}</button><button class="secondary-button" data-action="edit-book" data-id="${esc(id)}">Editar ficha</button>`}</div></div><section class="detail-section full-width"><h3>Seu encontro com este livro.</h3><form id="detail-progress" class="inline-form"><input type="hidden" name="bookId" value="${esc(id)}"><div class="field"><label for="detail-status">Situação</label><select name="status" id="detail-status">${Object.entries(
          statusLabels,
        )
          .map(
            ([v, l]) =>
              `<option value="${v}" ${b.status === v ? "selected" : ""}>${l}</option>`,
          )
          .join(
            "",
          )}</select></div><div class="field"><label for="detail-page">Página atual${b.totalPages ? " / " + b.totalPages : ""}</label><input name="currentPage" id="detail-page" type="number" min="0" ${b.totalPages ? 'max="' + b.totalPages + '"' : ""} value="${b.currentPage}" required><span data-error="currentPage" class="field-error"></span></div><button class="secondary-button" ${b.deletedAt ? "disabled" : ""}>Salvar progresso</button></form><div class="reading-progress"><span style="width:${progress(b)}%"></span></div><div class="rating-stars" aria-label="Avaliação pessoal">${[1, 2, 3, 4, 5].map((n) => `<button class="${(b.rating || 0) >= n ? "filled" : ""}" data-action="rating" data-id="${esc(id)}" data-value="${n}" aria-label="Avaliar com ${n} ${n === 1 ? "estrela" : "estrelas"}">${(b.rating || 0) >= n ? "★" : "☆"}</button>`).join("")}<button class="clear-rating" data-action="rating" data-id="${esc(id)}" data-value="">Sem avaliação</button></div></section><section class="detail-section full-width"><h3>Na companhia de outras histórias.</h3><form id="detail-lists"><input type="hidden" name="bookId" value="${esc(id)}"><div class="checkbox-group">${store.state.lists.map((l) => `<label><input name="listIds" type="checkbox" value="${esc(l.id)}" ${b.listIds.includes(l.id) ? "checked" : ""}>${esc(l.name)}</label>`).join("") || '<small class="form-help">Crie uma lista na Biblioteca para agrupar este livro.</small>'}</div>${store.state.lists.length ? '<button class="text-button">Salvar listas</button>' : ""}</form></section><section class="detail-section full-width"><h3>À margem, suas ideias.</h3><form id="note-form"><input type="hidden" name="bookId" value="${esc(id)}"><div class="field"><label for="note-text">Nova anotação privada</label><textarea id="note-text" name="text" rows="3" placeholder="O que esta leitura despertou em você?" required maxlength="20000"></textarea><span class="field-error" data-error="text"></span></div><div class="inline-form" style="margin-top:12px"><div class="field"><label for="note-page">Página (opcional)</label><input id="note-page" name="page" type="number" min="1" ${b.totalPages ? 'max="' + b.totalPages + '"' : ""} placeholder="Ex.: 42"><span class="field-error" data-error="page"></span></div><button class="secondary-button">Guardar anotação +</button></div></form><div>${
          store
            .getNotes(id)
            .map(
              (n) =>
                `<article class="note">${esc(n.text)}<div class="note-meta"><span>${n.page != null ? "Pág. " + n.page + " · " : ""}${fmtDate(n.updatedAt || n.createdAt)} · privada</span><div class="note-edit"><button class="text-button" data-action="edit-note" data-id="${esc(n.id)}">Editar</button> · <button class="text-button danger-button" data-action="delete-note" data-id="${esc(n.id)}">Excluir</button></div></div></article>`,
            )
            .join("") ||
          '<p class="storage-message">As suas ideias ficam só com você, neste navegador.</p>'
        }</div></section><div class="form-actions full-width"><span class="storage-message">Dados da obra acima. Seus registros pessoais abaixo.</span>${b.deletedAt ? "" : `<button class="text-button danger-button" data-action="delete-book" data-id="${esc(id)}">Remover livro</button>`}</div></div>`,
      "detail",
    );
  }
  function catalogDetail(b) {
    if (!b) return;
    showModal(
      modalHeader("Um convite à leitura.") +
        `<div class="detail-layout"><div>${cover(b, "detail-cover")}</div><div class="detail-info"><span class="eyebrow red">${esc(b.genre || "PARA DESCOBRIR")}</span><h2 style="margin-top:12px">${esc(b.title)}</h2><p class="detail-author">${esc(b.author)}</p><p class="detail-description">${esc(b.description)}</p><p class="storage-message">Confira os dados da sua edição ao adicionar. As capas da curadoria são ilustrativas.</p><button class="primary-button" data-action="result-add" data-id="${esc(b.id)}">${isInLibrary(b) ? "Abrir na biblioteca" : "Adicionar à biblioteca"} ${icon("arrow")}</button></div></div>`,
      "catalog",
    );
  }
  function listForm(id = "") {
    const list = store.state.lists.find((l) => l.id === id);
    showModal(
      modalHeader(list ? "Sua lista, suas histórias." : "Criar uma lista.") +
        `<form id="list-form"><input name="id" type="hidden" value="${esc(id)}"><div class="field"><label for="list-name">Nome da lista *</label><input id="list-name" name="name" value="${esc(list?.name || "")}" placeholder="Ex.: Livros para reler" maxlength="120" required><span class="field-error" data-error="name"></span></div><div class="form-actions">${id ? `<button type="button" class="text-button danger-button" data-action="delete-list" data-id="${esc(id)}">Excluir lista</button>` : '<span class="form-help">Um livro pode fazer parte de várias listas.</span>'}<button class="primary-button">Salvar lista ${icon("arrow")}</button></div></form>`,
      "list-form",
    );
  }
  function showGoals() {
    const g = store.state.goals;
    showModal(
      modalHeader("Um ritmo que é seu.") +
        `<form id="goals-form"><div class="book-form">${field("year", "Ano da meta", g.year, "number", 'min="1900" max="2200" required')}${field("annualBooks", "Livros por ano", g.annualBooks || 12, "number", 'min="1" max="10000" required')}${field("dailyPages", "Páginas por dia", g.dailyPages || 0, "number", 'min="0" max="10000"')}${field("weeklyPages", "Páginas por semana", g.weeklyPages || 0, "number", 'min="0" max="100000"')}<div class="field"><label for="goals-paused">Situação da meta</label><select id="goals-paused" name="paused"><option value="false">Em andamento</option><option value="true" ${g.paused ? "selected" : ""}>Suspensa</option></select></div></div><p class="storage-message" style="margin-top:20px">Use zero para deixar páginas sem uma meta. Pausar não apaga o histórico e não gera penalidades.</p><div class="form-actions"><span></span><button class="primary-button">Salvar metas ${icon("arrow")}</button></div></form>`,
      "goals",
    );
  }
  function showMonthlyGoal(month) {
    showModal(
      modalHeader("Uma meta para este mês.") +
        renderMonthlyGoalForm({ store, month }),
      "monthly-goal",
    );
  }
  function showTags() {
    showModal(
      modalHeader("Marcas da sua estante.") + renderTagManager(store.getTags()),
      "tags",
    );
  }
  function tagForm(id = "") {
    const tag = store.getTags().find((tag) => tag.id === id);
    showModal(
      modalHeader(tag ? "Editar esta marca." : "Uma nova marca.") +
        renderTagForm(tag),
      "tag-form",
    );
  }
  function showPreferences() {
    showModal(
      modalHeader("Seu espaço de leitura.") +
        `<div class="preferences-row"><h3>Seus dados são seus.</h3><p>Esta versão salva sua biblioteca, listas, notas e sessões neste navegador. Seus PDFs ficam armazenados localmente. Exporte um backup para transferir o acervo ou guardá-lo em segurança.</p><div class="preferences-actions"><button class="primary-button" data-action="export">Exportar backup ${icon("download")}</button><button class="secondary-button" data-action="import">Importar backup ↑</button><button class="text-button" data-action="export-records">Exportar só os registros</button></div><p class="storage-message">O backup completo inclui PDFs e capas. A importação combina registros sem apagar seu acervo atual e cria uma cópia de segurança antes de começar.</p><input class="hidden" type="file" id="backup-input" accept="application/json,.json"></div><div class="preferences-row"><h3>Uma experiência no seu ritmo.</h3><p>Defina seus objetivos para o mês e acompanhe cada novo capítulo da sua jornada.</p><button class="secondary-button" data-action="goals">Ajustar minhas metas ↗</button></div><div class="preferences-row"><h3>Sobre esta edição.</h3><p>Atheneum é uma biblioteca pessoal feita de leitor para leitor. Busca externa por Open Library. Contas, sincronização entre dispositivos, EPUB e comunidade fazem parte de uma etapa futura.</p><p class="storage-message"><span>●</span> Biblioteca salva localmente · Sem conta conectada</p></div>`,
      "preferences",
    );
  }
  function editNote(id) {
    const n = store.state.notes.find((x) => x.id === id);
    if (!n) return;
    showModal(
      modalHeader("Volte às suas ideias.") +
        `<form id="edit-note-form"><input name="id" type="hidden" value="${esc(id)}"><input name="bookId" type="hidden" value="${esc(n.bookId)}"><div class="field"><label for="edit-note-text">Anotação</label><textarea id="edit-note-text" name="text" rows="7" required maxlength="20000">${esc(n.text)}</textarea><span class="field-error" data-error="text"></span></div><div class="field" style="margin-top:16px"><label for="edit-note-page">Página (opcional)</label><input id="edit-note-page" name="page" type="number" min="1" value="${n.page ?? ""}"><span class="field-error" data-error="page"></span></div><div class="form-actions"><span class="form-help">Sua anotação permanece privada.</span><button class="primary-button">Salvar anotação ${icon("arrow")}</button></div></form>`,
      "edit-note",
    );
  }
  function editSession(id) {
    const s = store.state.sessions.find((x) => x.id === id);
    if (!s) return;
    showModal(
      modalHeader("Corrigir sessão de leitura.") +
        `<form id="edit-session-form"><input type="hidden" name="id" value="${esc(id)}"><div class="book-form">${field("fromPage", "Página inicial", s.fromPage, "number", 'min="0" required')}${field("toPage", "Página final", s.toPage, "number", 'min="0" required')}${field("duration", "Duração em minutos", s.duration, "number", 'min="0" max="1440" required')}${field("date", "Data da sessão", s.day || s.date.slice(0, 10), "date", "required")}</div><p class="storage-message" style="margin-top:20px">A correção atualiza as estatísticas. O marcador atual do livro é independente e pode ser corrigido na ficha. Recompensas históricas não são repetidas.</p><div class="form-actions"><button type="button" class="text-button danger-button" data-action="delete-session" data-id="${esc(id)}">Excluir sessão</button><button class="primary-button">Salvar correção ${icon("arrow")}</button></div></form>`,
      "session",
    );
  }
  function download(text, name) {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportBackup() {
    toast("Preparando seu backup completo…");
    try {
      const json = await store.exportBackupWithFiles();
      download(
        json,
        `atheneum-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
      toast("Backup completo exportado.");
    } catch (error) {
      fail(error);
    }
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      const json = await prepareBackup(file);
      let before;
      try {
        before = await store.exportBackupWithFiles();
      } catch {
        before = store.exportBackup();
      }
      download(before, `atheneum-antes-da-importacao-${Date.now()}.json`);
      await store.importBackupWithFiles(json, { mode: "merge" });
      dirty = false;
      showPreferences();
      toast("Backup importado. Seu acervo anterior foi preservado.");
    } catch (error) {
      fail(error);
    }
  }

  return {
    modalHeader,
    showModal,
    closeModal,
    bookForm,
    saveBookForm,
    showDetail,
    catalogDetail,
    listForm,
    showGoals,
    showMonthlyGoal,
    showTags,
    tagForm,
    showPreferences,
    editNote,
    editSession,
    download,
    exportBackup,
    importBackup,
    markDirty() {
      dirty = true;
    },
    clearDirty() {
      dirty = false;
    },
    get dirty() {
      return dirty;
    },
    get saving() {
      return saving;
    },
  };
}
