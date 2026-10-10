/** Small HTML helpers shared by the pages and dialogs. User content is escaped here. */
export const $ = (query, scope = document) => scope.querySelector(query);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
export const statusLabels = {
  want: "Quero ler",
  reading: "Lendo",
  read: "Lido",
};
export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export const fmtDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
export const progress = (book) =>
  book.totalPages
    ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    : 0;

const paths = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1"/>',
  shelf: '<path d="M3 21V4h4v17m3 0V4h4v17m4 0-3-16 4-1 3 17M2 21h21"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  book: '<path d="M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ""}</svg>`;
export function safeImage(value) {
  const candidate = String(value || "");
  if (/^assets\/covers\/[a-z0-9-]+\.svg$/.test(candidate)) return candidate;
  if (
    /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(candidate) &&
    candidate.length <= 2800000
  )
    return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function coverStyle(book) {
  const subject = normalize(book.genre);
  if (
    /carreira|tecnolog|tech|program|design|negoci|econom|finance|psicolog|desenvolv|gestao|marketing|automotiv|automotive|empreendedor|mecatron/.test(
      subject,
    )
  )
    return "cover-career";
  if (/class|filosof|literatura|poesia/.test(subject)) return "cover-classics";
  if (/ficcao|fantasia|romance/.test(subject)) return "cover-fiction";
  const hash = [...normalize(book.title)].reduce(
    (sum, character) => sum + character.codePointAt(0),
    0,
  );
  return ["cover-classics", "cover-fiction", "cover-career"][hash % 3];
}

export function fallbackCover(book, extraClass = "") {
  return `<div class="cover cover-fallback ${coverStyle(book)} ${esc(extraClass)}" role="img" aria-label="Capa tipográfica de ${esc(book.title)}"><span class="cover-kicker">ATHENEUM · BIBLIOTECA PESSOAL</span><span class="cover-ornament" aria-hidden="true">❦</span><strong class="cover-title">${esc(book.title)}</strong><span class="cover-rule" aria-hidden="true"></span><small class="cover-author">${esc(book.author || "Autor não informado")}</small><span class="cover-colophon" aria-hidden="true">EX LIBRIS</span></div>`;
}

export function cover(book, extraClass = "") {
  const image = safeImage(book.cover);
  return image
    ? `<img class="cover ${esc(extraClass)}" src="${esc(image)}" alt="Capa de ${esc(book.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cover-title="${esc(book.title)}" data-cover-author="${esc(book.author)}" data-cover-genre="${esc(book.genre)}">`
    : fallbackCover(book, extraClass);
}

export const heading = (kicker, title, description = "", action = "") =>
  `<div class="page-title"><div><span class="eyebrow red">${kicker}</span><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</div>${action}</div>`;
export const addButton = `<button class="primary-button" data-action="add-book">Adicionar livro ${icon("plus")}</button>`;
export const empty = (title, description, action = addButton) =>
  `<div class="empty-state"><div class="empty-symbol">✦</div><h2>${title}</h2><p>${description}</p>${action}</div>`;

export function bookCard(
  book,
  discovery = false,
  isInLibrary = () => false,
  tags = "",
) {
  const details = `<button data-action="${discovery ? "result-book" : "detail"}" data-id="${esc(book.id)}" aria-label="Abrir ${esc(book.title)}">${cover(book)}<div><h3>${esc(book.title)}</h3><span class="author">${esc(book.author || "Autor não informado")}</span></div></button>`;
  const actions = discovery
    ? `<p class="discover-description">${esc(book.description || "Conheça esta obra e confira os dados da sua edição antes de adicionar.")}</p><button class="secondary-button" data-action="result-add" data-id="${esc(book.id)}">${isInLibrary(book) ? "Na biblioteca ↗" : "Adicionar à biblioteca +"}</button>`
    : `<div class="book-actions"><span class="badge ${esc(book.status)}">${book.deletedAt ? "Removido" : statusLabels[book.status]}</span><button class="book-more" data-action="${book.deletedAt ? "restore-book" : "edit-book"}" data-id="${esc(book.id)}" aria-label="${book.deletedAt ? "Restaurar" : "Editar"} ${esc(book.title)}">${book.deletedAt ? "↶" : "⋯"}</button></div>${tags}${book.status === "reading" && !book.deletedAt ? `<div class="reading-progress"><span style="width:${progress(book)}%"></span></div>` : ""}`;
  return `<article class="book-card">${details}${actions}</article>`;
}

export const EDITION_PAGES = Object.freeze([
  {
    id: "inicio",
    name: "Primeira página",
    label: "A edição de hoje",
    folio: "01",
  },
  {
    id: "biblioteca",
    name: "Biblioteca",
    label: "O acervo completo",
    folio: "02",
  },
  {
    id: "leitura",
    name: "Sala de leitura",
    label: "O seu próximo capítulo",
    folio: "03",
  },
  {
    id: "descobrir",
    name: "Descobrir",
    label: "Novas histórias à vista",
    folio: "04",
  },
  {
    id: "santuario",
    name: "Santuário",
    label: "Memória da sua jornada",
    folio: "05",
  },
]);

export function editionRelated(page) {
  const current = EDITION_PAGES.find((item) => item.id === page);
  return `<nav class="edition-related edition-linked" aria-label="Outras páginas desta edição"><span class="eyebrow red">OUTRAS PÁGINAS DESTA EDIÇÃO</span><div>${EDITION_PAGES.filter(
    (item) => item.id !== page,
  )
    .map(
      (item) =>
        `<a href="#${item.id}"><span class="eyebrow">CADERNO ${item.folio}</span><strong>${item.name}</strong><small>${item.label} ↗</small></a>`,
    )
    .join(
      "",
    )}</div></nav><div class="page-folio"><span>ATHENEUM · EDIÇÃO PESSOAL</span><span>${current ? `${current.name.toUpperCase()} · CADERNO ${current.folio}` : "ARQUIVO · PÁGINA 404"}</span></div>`;
}
