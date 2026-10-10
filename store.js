/* Atheneum — browser-local domain and persistence.
 * A single localStorage write commits a complete revision. PDFs live in IndexedDB.
 * Rewards are lifetime events: deleting a book or correcting a session never repeats XP.
 */
(function (global) {
  "use strict";

  const VERSION = 1;
  const STORAGE_KEY = "atheneum.v1";
  const MAX_PDF_BYTES = 25 * 1024 * 1024;
  const MAX_BACKUP_BYTES = 150 * 1024 * 1024;
  const MAX_BACKUP_PDF_BYTES = 100 * 1024 * 1024;
  const MAX_COVER_BYTES = 2 * 1024 * 1024;
  const XP = Object.freeze({ start: 10, finish: 50 });
  const STATUS = new Set(["want", "reading", "read"]);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = (prefix) =>
    prefix +
    "_" +
    (global.crypto?.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2));
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const text = (value, max = 10000) =>
    String(value ?? "")
      .trim()
      .slice(0, max);
  const plain = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
  const validId = (value) =>
    typeof value === "string" &&
    !dangerousKeys.has(value) &&
    /^[a-zA-Z0-9_:\-.]{1,160}$/.test(value);
  const validDate = (value) =>
    typeof value === "string" &&
    value.length <= 64 &&
    !Number.isNaN(Date.parse(value));
  const integer = (value) =>
    (typeof value === "number" ||
      (typeof value === "string" && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 0;
  const isbnKey = (value) =>
    String(value || "")
      .replace(/[^\dX]/gi, "")
      .toUpperCase();
  const bookKey = (b) =>
    [b.title, b.author, b.edition]
      .map((v) =>
        String(v || "")
          .trim()
          .toLocaleLowerCase("pt-BR"),
      )
      .join("|");
  const collectionTextKey = (value) =>
    text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ");
  const dostoevskyAliases = new Set([
    "dostoievski",
    "fiodor dostoievski",
    "fiodor mikhailovich dostoievski",
    "dostoevsky",
    "fyodor dostoevsky",
    "fyodor dostoyevsky",
  ]);
  function collectionAuthorKey(value) {
    const key = collectionTextKey(value)
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();
    // The personal catalogue supplies the short Portuguese surname. Existing
    // editions may already use the full author name or a common transliteration.
    return dostoevskyAliases.has(key) ? "fiodor dostoievski" : key;
  }
  const collectionBookKey = (b) =>
    `${collectionTextKey(b.title)}|${collectionAuthorKey(b.author)}`;
  function collectionReleaseKey(release) {
    if (release.length <= 100) return release;
    // Keep generated IDs inside the persistent schema's length limit while
    // retaining a stable identity for unusually long release names.
    let first = 0x811c9dc5,
      second = 0x9e3779b9;
    for (let index = 0; index < release.length; index++) {
      const code = release.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193);
      second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `${release.slice(0, 80)}:${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
  }

  class ValidationError extends Error {
    constructor(
      errors,
      message = "Confira os campos indicados antes de salvar.",
    ) {
      super(message);
      this.name = "ValidationError";
      this.errors = errors;
    }
  }
  class StorageError extends Error {
    constructor(message, cause) {
      super(message);
      this.name = "StorageError";
      this.cause = cause;
    }
  }
  class DuplicateError extends ValidationError {
    constructor(book) {
      super({
        title:
          "Este título e edição já estão na biblioteca. Confirme se deseja outra cópia.",
      });
      this.name = "DuplicateError";
      this.book = clone(book);
    }
  }

  // Validate before copying untrusted records. This also rejects accessors and
  // cycles when the programmatic API receives an object rather than JSON text.
  function assertSafeData(value) {
    const stack = [{ value, depth: 0 }],
      visited = new Set();
    let count = 0;
    while (stack.length) {
      const entry = stack.pop(),
        current = entry.value;
      if (++count > 1000000 || entry.depth > 100)
        throw new ValidationError({
          backup: "O arquivo contém dados demais ou uma estrutura inválida.",
        });
      if (current === null || typeof current !== "object") {
        if (
          !["string", "number", "boolean", "undefined"].includes(
            typeof current,
          ) &&
          current !== null
        )
          throw new ValidationError({
            backup: "O arquivo contém dados inválidos.",
          });
        continue;
      }
      if (visited.has(current))
        throw new ValidationError({
          backup: "O arquivo contém uma referência circular.",
        });
      visited.add(current);
      for (const key of Object.getOwnPropertyNames(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (dangerousKeys.has(key) || descriptor.get || descriptor.set)
          throw new ValidationError({
            backup: "O arquivo contém propriedades não permitidas.",
          });
        stack.push({ value: descriptor.value, depth: entry.depth + 1 });
      }
    }
  }

  function decodeBase64(value, maxBytes, field) {
    if (
      typeof value !== "string" ||
      !value ||
      value.length % 4 !== 0 ||
      value.length > Math.ceil(maxBytes / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
    )
      throw new ValidationError({
        [field]: "O arquivo contém dados de imagem ou PDF inválidos.",
      });
    let binary;
    try {
      binary = global.atob(value);
    } catch {
      throw new ValidationError({ [field]: "O arquivo está corrompido." });
    }
    if (binary.length > maxBytes || global.btoa(binary) !== value)
      throw new ValidationError({
        [field]: "O arquivo está corrompido ou ultrapassa o limite.",
      });
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  function coverDimensions(bytes, type) {
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let width = 0,
      height = 0;
    if (type === "png" && bytes.length >= 24 && data.getUint32(8) === 13) {
      width = data.getUint32(16);
      height = data.getUint32(20);
    } else if (type === "jpeg") {
      let offset = 2;
      while (offset < bytes.length - 3) {
        if (bytes[offset++] !== 255) break;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 217 || marker === 218) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        if (offset + 2 > bytes.length) break;
        const length = data.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) break;
        if (
          marker >= 192 &&
          marker <= 207 &&
          ![196, 200, 204].includes(marker)
        ) {
          if (length < 8) break;
          height = data.getUint16(offset + 3);
          width = data.getUint16(offset + 5);
          break;
        }
        offset += length;
      }
    } else if (
      type === "webp" &&
      bytes.length >= 25 &&
      data.getUint32(4, true) + 8 === bytes.length
    ) {
      const chunk = String.fromCharCode(...bytes.subarray(12, 16));
      if (chunk === "VP8X" && bytes.length >= 30) {
        width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
        height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      } else if (chunk === "VP8L" && bytes[20] === 47) {
        const bits = data.getUint32(21, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      } else if (
        chunk === "VP8 " &&
        bytes.length >= 30 &&
        bytes[23] === 157 &&
        bytes[24] === 1 &&
        bytes[25] === 42
      ) {
        width = data.getUint16(26, true) & 0x3fff;
        height = data.getUint16(28, true) & 0x3fff;
      }
    }
    if (
      !width ||
      !height ||
      width > 8192 ||
      height > 8192 ||
      width * height > 16 * 1024 * 1024
    )
      throw new ValidationError({
        cover:
          "A capa deve conter uma imagem válida de até 16 megapixels e 8.192 pixels por lado.",
      });
  }

  function safeCover(value) {
    if (typeof value !== "string")
      throw new ValidationError({ cover: "Informe uma capa válida." });
    if (!value || /^assets\/covers\/[a-z0-9-]+\.svg$/.test(value)) return value;
    const image = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
      value,
    );
    if (image) {
      const bytes = decodeBase64(image[2], MAX_COVER_BYTES, "cover");
      const png =
        bytes.length >= 24 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every(
          (byte, index) => bytes[index] === byte,
        ) &&
        String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR";
      const jpeg =
        bytes.length >= 4 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255 &&
        bytes.at(-2) === 255 &&
        bytes.at(-1) === 217;
      const webp =
        bytes.length >= 20 &&
        String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
      if (!(
        (image[1] === "png" && png) ||
        (image[1] === "jpeg" && jpeg) ||
        (image[1] === "webp" && webp)
      ))
        throw new ValidationError({
          cover: "O conteúdo da capa não corresponde à imagem informada.",
        });
      coverDimensions(bytes, image[1]);
      return value;
    }
    if (value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value))
      throw new ValidationError({
        cover: "Use um endereço HTTPS público para a capa.",
      });
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new ValidationError({
        cover: "Use uma imagem PNG, JPEG ou WebP ou um endereço HTTPS público.",
      });
    }
    const host = url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    const privateHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "::1" ||
      host === "::" ||
      (/^(?:fc|fd|fe[89ab])/i.test(host) && host.includes(":")) ||
      /^(?:0|10|127|169\.254|192\.168)\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) ||
      /^::ffff:/i.test(host);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !host.includes(".") ||
      privateHost ||
      /\.(?:svg|html?|xml)$/i.test(url.pathname)
    )
      throw new ValidationError({
        cover: "Use um endereço HTTPS público de imagem, sem credenciais.",
      });
    return url.href;
  }

  const validMonth = (value) =>
    typeof value === "string" &&
    /^(?:19\d{2}|20\d{2}|21\d{2}|2200)-(?:0[1-9]|1[0-2])$/.test(value);
  function normalizeMonthlyGoal(data, base, now) {
    const goal = {
      month: data.month,
      books: 0,
      pages: 0,
      minutes: 0,
      paused: false,
      createdAt: now,
      updatedAt: now,
      ...base,
      ...data,
    };
    const errors = {};
    if (!validMonth(goal.month))
      errors.month = "Escolha um mês válido entre 1900 e 2200.";
    for (const key of ["books", "pages", "minutes"]) {
      if (!integer(goal[key]) || Number(goal[key]) > 1000000)
        errors[key] =
          "Informe um número inteiro entre 0 e 1.000.000; zero desativa esta meta.";
      else goal[key] = Number(goal[key]);
    }
    if (typeof goal.paused !== "boolean")
      errors.paused = "O estado da meta é inválido.";
    if (Object.keys(errors).length) throw new ValidationError(errors);
    return Object.fromEntries(
      [
        "month",
        "books",
        "pages",
        "minutes",
        "paused",
        "createdAt",
        "updatedAt",
      ].map((key) => [key, goal[key]]),
    );
  }

  function monthlyStatistics(state, month) {
    if (!validMonth(month))
      throw new ValidationError({
        month: "Escolha um mês válido entre 1900 e 2200.",
      });
    const sessions = state.sessions.filter((session) =>
      session.day.startsWith(month + "-"),
    );
    const books = state.rewards.filter(
      (reward) =>
        reward.type === "finish" &&
        localDay(reward.date, state.prefs.timezone).startsWith(month + "-"),
    ).length;
    const pages = sessions.reduce((total, session) => total + session.pages, 0);
    const minutes = sessions.reduce(
      (total, session) => total + session.duration,
      0,
    );
    const goal = state.goals.monthly[month] || null;
    const targets = {
      books: goal?.books || 0,
      pages: goal?.pages || 0,
      minutes: goal?.minutes || 0,
    };
    const values = { books, pages, minutes },
      active = Object.keys(targets).filter((key) => targets[key] > 0);
    const completion = active.length
      ? active.reduce(
          (sum, key) => sum + Math.min(1, values[key] / targets[key]),
          0,
        ) / active.length
      : 0;
    const achieved =
      !!goal &&
      !goal.paused &&
      active.length > 0 &&
      active.every((key) => values[key] >= targets[key]);
    return {
      month,
      books,
      pages,
      minutes,
      sessions: sessions.length,
      goal: goal ? clone(goal) : null,
      targets,
      achieved,
      completion,
    };
  }

  function localDay(date = new Date(), timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(date));
    return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}-${parts.find((p) => p.type === "day").value}`;
  }
  function shiftDay(day, amount) {
    const d = new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + amount);
    return d.toISOString().slice(0, 10);
  }
  function ensureDate(value, field = "date") {
    if (!validDate(value))
      throw new ValidationError({ [field]: "Informe uma data válida." });
    return new Date(value).toISOString();
  }
  function sessionDate(value, timezone) {
    // An input[type=date] means the reader's calendar day, not midnight UTC.
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value + "T12:00:00Z");
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        throw new ValidationError({
          date: "Informe uma data válida para a sessão.",
        });
      return { date: date.toISOString(), day: value };
    }
    const date = ensureDate(value);
    return { date, day: localDay(date, timezone) };
  }
  function empty(now, timezone) {
    return {
      version: VERSION,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      books: [],
      lists: [],
      tags: [],
      notes: [],
      sessions: [],
      rewards: [],
      achievements: [],
      imports: [],
      goals: {
        annualBooks: 12,
        dailyPages: 20,
        weeklyPages: 0,
        paused: false,
        year: Number(localDay(now, timezone).slice(0, 4)),
        history: [],
        monthly: {},
      },
      prefs: {
        view: "grid",
        theme: "paper",
        reducedMotion: false,
        motionMode: "system",
        timezone,
        lastBookId: null,
        pdfPages: {},
      },
    };
  }

  function normalizeBook(data, base, now) {
    assertSafeData(data);
    const b = Object.assign(
      {
        id: id("book"),
        title: "",
        author: "",
        genre: "",
        isbn: "",
        edition: "",
        description: "",
        cover: "",
        totalPages: 0,
        currentPage: 0,
        status: "want",
        rating: null,
        listIds: [],
        tagIds: [],
        file: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      base || {},
      data,
    );
    const errors = {};
    if (!text(b.title)) errors.title = "O título é obrigatório.";
    if (String(b.title || "").length > 500)
      errors.title = "Use até 500 caracteres no título.";
    if (!integer(b.totalPages) || Number(b.totalPages) > 1000000)
      errors.totalPages =
        "Informe um total de páginas inteiro, entre 0 e 1.000.000.";
    if (!integer(b.currentPage) || Number(b.currentPage) > 1000000)
      errors.currentPage = "Informe uma página inteira e positiva, ou zero.";
    if (
      Number(b.totalPages) > 0 &&
      Number(b.currentPage) > Number(b.totalPages)
    )
      errors.currentPage = "A página atual não pode ultrapassar o total.";
    if (!STATUS.has(b.status))
      errors.status = "Escolha Quero ler, Lendo ou Lido.";
    if (
      b.rating !== null &&
      b.rating !== "" &&
      Number(b.rating) !== 0 &&
      (!Number.isInteger(Number(b.rating)) ||
        Number(b.rating) < 1 ||
        Number(b.rating) > 5)
    )
      errors.rating = "A avaliação deve ter de 1 a 5 estrelas.";
    for (const key of ["listIds", "tagIds"])
      if (
        !Array.isArray(b[key]) ||
        b[key].length > 1000 ||
        b[key].some((value) => !validId(value))
      )
        errors[key] = "As listas ou tags informadas são inválidas.";
    for (const [field, max] of Object.entries({
      title: 500,
      author: 500,
      genre: 200,
      isbn: 40,
      edition: 200,
      description: 20000,
    }))
      if (typeof b[field] !== "string" || b[field].length > max)
        errors[field] =
          `Use até ${max.toLocaleString("pt-BR")} caracteres neste campo.`;
    try {
      b.cover = safeCover(b.cover);
    } catch (error) {
      errors.cover = error.errors?.cover || "A capa informada é inválida.";
    }
    if (Object.keys(errors).length) throw new ValidationError(errors);
    for (const [field, max] of Object.entries({
      title: 500,
      author: 500,
      genre: 200,
      isbn: 40,
      edition: 200,
      description: 20000,
    }))
      b[field] = text(b[field], max);
    b.cover = String(b.cover || "");
    b.totalPages = Number(b.totalPages);
    b.currentPage = Number(b.currentPage);
    b.rating =
      b.rating === null || b.rating === "" || Number(b.rating) === 0
        ? null
        : Number(b.rating);
    b.listIds = [...new Set(b.listIds)];
    b.tagIds = [...new Set(b.tagIds)];
    if (b.status === "read" && b.totalPages > 0) b.currentPage = b.totalPages;
    b.updatedAt = now;
    // Whitelist fields; imported content never becomes executable or prototype data.
    return Object.fromEntries(
      [
        "id",
        "title",
        "author",
        "genre",
        "isbn",
        "edition",
        "description",
        "cover",
        "totalPages",
        "currentPage",
        "status",
        "rating",
        "listIds",
        "tagIds",
        "file",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ].map((k) => [k, b[k]]),
    );
  }

  function validateState(raw) {
    assertSafeData(raw);
    if (!plain(raw) || raw.version !== VERSION)
      throw new ValidationError({
        backup: "Este backup usa um formato incompatível.",
      });
    // Adding tags and monthly goals keeps the v1 format backwards compatible.
    raw = { ...raw, tags: own(raw, "tags") ? raw.tags : [] };
    for (const key of [
      "books",
      "lists",
      "tags",
      "notes",
      "sessions",
      "rewards",
      "achievements",
    ]) {
      if (!Array.isArray(raw[key]) || raw[key].length > 100000)
        throw new ValidationError({
          backup: `A coleção de ${key} é inválida.`,
        });
      const ids = new Set();
      for (const item of raw[key]) {
        if (!plain(item) || !validId(item.id) || ids.has(item.id))
          throw new ValidationError({
            backup: `Há identificadores inválidos ou repetidos em ${key}.`,
          });
        ids.add(item.id);
      }
    }
    if (!plain(raw.goals) || !plain(raw.prefs))
      throw new ValidationError({
        backup: "Metas ou preferências inválidas no backup.",
      });
    const result = clone(raw);
    // Earlier v1 records predate bundled collections. A release marker survives
    // backups so reopening the site never re-adds a deliberately removed book.
    result.imports = own(result, "imports") ? result.imports : [];
    if (
      !Array.isArray(result.imports) ||
      result.imports.length > 1000 ||
      result.imports.some((v) => !validId(v)) ||
      new Set(result.imports).size !== result.imports.length
    )
      throw new ValidationError({
        backup: "Os registros de importação são inválidos.",
      });
    const listIds = new Set(result.lists.map((l) => l.id));
    const tagIds = new Set(result.tags.map((tag) => tag.id));
    const bookIds = new Set(result.books.map((b) => b.id));
    for (const list of result.lists) {
      if (
        !text(list.name) ||
        String(list.name).length > 120 ||
        !validDate(list.createdAt) ||
        !validDate(list.updatedAt)
      )
        throw new ValidationError({
          backup: "Uma das listas está incompleta.",
        });
      list.name = text(list.name, 120);
    }
    const tagNames = new Set();
    result.tags = result.tags.map((tag) => {
      if (
        typeof tag.name !== "string" ||
        !text(tag.name) ||
        tag.name.length > 40 ||
        typeof tag.color !== "string" ||
        !/^#[0-9a-f]{6}$/i.test(tag.color) ||
        !validDate(tag.createdAt) ||
        !validDate(tag.updatedAt)
      )
        throw new ValidationError({
          backup: "Uma tag tem nome, cor ou datas inválidos.",
        });
      const name = text(tag.name, 40),
        key = collectionTextKey(name);
      if (tagNames.has(key))
        throw new ValidationError({
          backup: "Há tags com nomes repetidos no backup.",
        });
      tagNames.add(key);
      return {
        id: tag.id,
        name,
        color: tag.color.toLowerCase(),
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      };
    });
    result.books = result.books.map((b) => {
      if (
        !validDate(b.createdAt) ||
        !validDate(b.updatedAt) ||
        (b.deletedAt !== null && !validDate(b.deletedAt))
      )
        throw new ValidationError({ backup: "Um livro tem datas inválidas." });
      const normalized = normalizeBook(b, null, b.updatedAt);
      if (normalized.listIds.some((v) => !listIds.has(v)))
        throw new ValidationError({
          backup: "Um livro referencia uma lista ausente.",
        });
      if (normalized.tagIds.some((v) => !tagIds.has(v)))
        throw new ValidationError({
          backup: "Um livro referencia uma tag ausente.",
        });
      if (b.file !== null) {
        if (
          !plain(b.file) ||
          !validId(b.file.id) ||
          typeof b.file.name !== "string" ||
          !b.file.name ||
          b.file.name.length > 255 ||
          /[\u0000-\u001f\u007f\\/:]/.test(b.file.name) ||
          !/\.pdf$/i.test(b.file.name) ||
          !integer(b.file.size) ||
          b.file.size < 20 ||
          b.file.size > MAX_PDF_BYTES ||
          b.file.mime !== "application/pdf" ||
          !validDate(b.file.createdAt)
        )
          throw new ValidationError({ backup: "Metadados de PDF inválidos." });
        normalized.file = Object.fromEntries(
          ["id", "name", "size", "mime", "createdAt"].map((key) => [
            key,
            b.file[key],
          ]),
        );
      }
      return normalized;
    });
    const fileMetadata = new Map();
    for (const book of result.books.filter((book) => book.file)) {
      const previous = fileMetadata.get(book.file.id);
      if (
        previous &&
        ["id", "name", "size", "mime", "createdAt"].some(
          (key) => previous[key] !== book.file[key],
        )
      )
        throw new ValidationError({
          backup: "Dois livros usam o mesmo PDF com metadados incompatíveis.",
        });
      fileMetadata.set(book.file.id, book.file);
    }
    for (const note of result.notes) {
      if (
        !bookIds.has(note.bookId) ||
        !text(note.text) ||
        note.text.length > 100000 ||
        (note.page !== null && !integer(note.page)) ||
        !validDate(note.createdAt) ||
        !validDate(note.updatedAt)
      )
        throw new ValidationError({
          backup: "Uma anotação tem dados inválidos.",
        });
      note.text = text(note.text, 100000);
      note.quote = text(note.quote, 10000);
    }
    const requests = new Set();
    for (const s of result.sessions) {
      if (
        !bookIds.has(s.bookId) ||
        !validDate(s.date) ||
        !validDate(s.createdAt) ||
        !validDate(s.updatedAt) ||
        !integer(s.fromPage) ||
        !integer(s.toPage) ||
        s.toPage < s.fromPage ||
        s.pages !== s.toPage - s.fromPage ||
        !Number.isFinite(s.duration) ||
        s.duration < 0 ||
        s.duration > 1440 ||
        typeof s.day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.day)
      )
        throw new ValidationError({
          backup: "Uma sessão de leitura tem dados inválidos.",
        });
      if (s.requestId) {
        if (!validId(s.requestId) || requests.has(s.requestId))
          throw new ValidationError({
            backup: "Há sessões duplicadas no backup.",
          });
        requests.add(s.requestId);
      }
      try {
        sessionDate(s.day, result.prefs.timezone);
      } catch {
        throw new ValidationError({
          backup: "Uma sessão tem um dia de calendário inválido.",
        });
      }
    }
    for (const reward of result.rewards) {
      if (
        !bookIds.has(reward.bookId) ||
        !own(XP, reward.type) ||
        reward.id !== `book:${reward.bookId}:${reward.type}` ||
        reward.xp !== XP[reward.type] ||
        !validDate(reward.date)
      )
        throw new ValidationError({
          backup: "Um evento de recompensa é inválido.",
        });
    }
    for (const a of result.achievements)
      if (!validDate(a.date) || typeof a.name !== "string")
        throw new ValidationError({ backup: "Uma conquista é inválida." });
    result.lists = result.lists.map((list) =>
      Object.fromEntries(
        ["id", "name", "createdAt", "updatedAt"].map((key) => [key, list[key]]),
      ),
    );
    result.notes = result.notes.map((note) =>
      Object.fromEntries(
        ["id", "bookId", "text", "quote", "page", "createdAt", "updatedAt"].map(
          (key) => [key, note[key]],
        ),
      ),
    );
    result.sessions = result.sessions.map((session) =>
      Object.fromEntries(
        [
          "id",
          "bookId",
          "fromPage",
          "toPage",
          "pages",
          "duration",
          "date",
          "day",
          "createdAt",
          "requestId",
          "updatedAt",
        ]
          .filter((key) => own(session, key))
          .map((key) => [key, session[key]]),
      ),
    );
    result.rewards = result.rewards.map((reward) =>
      Object.fromEntries(
        ["id", "bookId", "type", "xp", "date", "title", "genre", "reason"]
          .filter((key) => own(reward, key))
          .map((key) => [key, reward[key]]),
      ),
    );
    result.achievements = result.achievements.map((achievement) => ({
      id: achievement.id,
      name: text(achievement.name, 120),
      date: achievement.date,
    }));
    for (const key of ["annualBooks", "dailyPages", "weeklyPages", "year"])
      if (!integer(result.goals[key]) || Number(result.goals[key]) > 1000000)
        throw new ValidationError({
          backup: "Uma meta tem um número inválido.",
        });
    if (
      result.goals.year < 1900 ||
      result.goals.year > 2200 ||
      typeof result.goals.paused !== "boolean" ||
      !Array.isArray(result.goals.history) ||
      result.goals.history.length > 10000
    )
      throw new ValidationError({ backup: "O período das metas é inválido." });
    const monthly = own(result.goals, "monthly") ? result.goals.monthly : {};
    if (!plain(monthly) || Object.keys(monthly).length > 3612)
      throw new ValidationError({ backup: "As metas mensais são inválidas." });
    result.goals.monthly = Object.fromEntries(
      Object.entries(monthly).map(([month, goal]) => {
        if (
          !plain(goal) ||
          goal.month !== month ||
          !validDate(goal.createdAt) ||
          !validDate(goal.updatedAt)
        )
          throw new ValidationError({
            backup: "Uma meta mensal tem dados ou datas inválidos.",
          });
        return [month, normalizeMonthlyGoal(goal, null, goal.updatedAt)];
      }),
    );
    result.goals = Object.fromEntries(
      [
        "annualBooks",
        "dailyPages",
        "weeklyPages",
        "paused",
        "year",
        "history",
        "monthly",
      ].map((key) => [key, result.goals[key]]),
    );
    result.goals.history = result.goals.history.map((goal) => {
      if (
        !plain(goal) ||
        !validDate(goal.changedAt) ||
        ["annualBooks", "dailyPages", "weeklyPages", "year"].some(
          (key) => !integer(goal[key]) || Number(goal[key]) > 1000000,
        ) ||
        typeof goal.paused !== "boolean" ||
        goal.year < 1900 ||
        goal.year > 2200
      )
        throw new ValidationError({
          backup: "O histórico das metas é inválido.",
        });
      return Object.fromEntries(
        [
          "annualBooks",
          "dailyPages",
          "weeklyPages",
          "paused",
          "year",
          "changedAt",
        ].map((key) => [key, goal[key]]),
      );
    });
    try {
      localDay(new Date(), result.prefs.timezone);
    } catch {
      throw new ValidationError({ backup: "O fuso horário é inválido." });
    }
    if (!["grid", "list", "shelf"].includes(result.prefs.view))
      throw new ValidationError({
        backup: "A visualização da biblioteca é inválida.",
      });
    result.prefs.motionMode = own(result.prefs, "motionMode")
      ? result.prefs.motionMode
      : "system";
    if (!["system", "full", "reduced"].includes(result.prefs.motionMode))
      throw new ValidationError({
        motionMode:
          "Escolha seguir o sistema, animações completas ou movimento reduzido.",
      });
    // Document position is separate from the reader's physical-book progress.
    // Missing maps upgrade earlier v1 records without discarding any existing data.
    const pdfPages = own(result.prefs, "pdfPages") ? result.prefs.pdfPages : {};
    if (!plain(pdfPages) || Object.keys(pdfPages).length > bookIds.size)
      throw new ValidationError({
        pdfPages: "As posições dos PDFs são inválidas.",
      });
    const checkedPdfPages = {};
    for (const [bookId, page] of Object.entries(pdfPages)) {
      if (
        !validId(bookId) ||
        !bookIds.has(bookId) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 1000000
      )
        throw new ValidationError({
          pdfPages:
            "Informe uma página de PDF inteira, entre 1 e 1.000.000, para um livro da biblioteca.",
        });
      checkedPdfPages[bookId] = page;
    }
    result.prefs.pdfPages = checkedPdfPages;
    for (const key of ["reducedMotion", "marqueePaused"])
      if (own(result.prefs, key) && typeof result.prefs[key] !== "boolean")
        throw new ValidationError({
          backup: "Uma preferência de movimento é inválida.",
        });
    if (
      own(result.prefs, "lastBookId") &&
      result.prefs.lastBookId !== null &&
      !bookIds.has(result.prefs.lastBookId)
    )
      throw new ValidationError({
        backup: "O último livro selecionado não existe.",
      });
    if (
      typeof result.prefs.theme !== "string" ||
      result.prefs.theme.length > 40 ||
      typeof result.prefs.timezone !== "string" ||
      result.prefs.timezone.length > 100
    )
      throw new ValidationError({
        backup: "O tema ou o fuso horário é inválido.",
      });
    result.prefs = Object.fromEntries(
      [
        "view",
        "theme",
        "reducedMotion",
        "motionMode",
        "timezone",
        "lastBookId",
        "marqueePaused",
        "pdfPages",
      ]
        .filter((key) => own(result.prefs, key))
        .map((key) => [key, result.prefs[key]]),
    );
    if (
      !integer(result.revision) ||
      !validDate(result.createdAt) ||
      !validDate(result.updatedAt)
    )
      throw new ValidationError({ backup: "O backup está incompleto." });
    // A stable schema keeps unknown imported fields out of future persistence.
    return Object.fromEntries(
      [
        "version",
        "revision",
        "createdAt",
        "updatedAt",
        "books",
        "lists",
        "tags",
        "notes",
        "sessions",
        "rewards",
        "achievements",
        "imports",
        "goals",
        "prefs",
      ].map((k) => [k, result[k]]),
    );
  }

  function streak(sessions, today) {
    const days = new Set(
      sessions.filter((s) => s.pages > 0 || s.duration > 0).map((s) => s.day),
    );
    let current = 0,
      cursor = days.has(today) ? today : shiftDay(today, -1);
    while (days.has(cursor)) {
      current++;
      cursor = shiftDay(cursor, -1);
    }
    let best = 0,
      run = 0,
      previous = null;
    for (const day of [...days].sort()) {
      run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
      best = Math.max(best, run);
      previous = day;
    }
    return { current, best };
  }

  class AtheneumStore {
    constructor(options = {}) {
      this.key = options.key || STORAGE_KEY;
      this._clock = options.clock || (() => new Date());
      this._listeners = new Set();
      this._dbPromise = null;
      try {
        this._storage = options.storage || global.localStorage;
      } catch (error) {
        throw new StorageError(
          "O navegador bloqueou o armazenamento local. Permita o armazenamento para salvar sua biblioteca.",
          error,
        );
      }
      if (!this._storage)
        throw new StorageError(
          "O armazenamento local não está disponível neste ambiente.",
        );
      const timezone =
        options.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "America/Sao_Paulo";
      try {
        const saved = this._storage.getItem(this.key);
        const loaded = this._readLocal(saved, timezone);
        this._state = loaded.state;
        this._persistedJSON = loaded.savedJSON;
        this.migrationWarnings = loaded.warnings;
      } catch (error) {
        throw new StorageError(
          "Não foi possível abrir os dados salvos. Eles foram preservados. Recupere um backup antes de continuar.",
          error,
        );
      }
    }
    _now() {
      return new Date(this._clock()).toISOString();
    }
    _readLocal(saved, timezone) {
      if (!saved)
        return {
          state: empty(this._now(), timezone),
          savedJSON: saved,
          warnings: [],
        };
      const raw = JSON.parse(saved),
        warnings = [];
      assertSafeData(raw);
      // Earlier local v1 data allowed HTTP and GIF covers. Neutralize only the
      // image before upgrading: bibliography, history, notes and PDFs remain.
      // Imported backups never pass through this compatibility migration.
      if (plain(raw) && raw.version === VERSION && Array.isArray(raw.books)) {
        for (const book of raw.books) {
          if (!plain(book) || !own(book, "cover")) continue;
          try {
            safeCover(book.cover);
          } catch {
            book.cover = "";
            warnings.push({
              bookId: book.id,
              type: "cover",
              message:
                "Uma capa antiga foi substituída pela capa tipográfica para manter sua biblioteca segura.",
            });
          }
        }
      }
      let state = validateState(raw),
        savedJSON = saved;
      if (warnings.length && Number.isSafeInteger(state.revision + 1)) {
        const migrated = {
          ...state,
          revision: state.revision + 1,
          updatedAt: this._now(),
        };
        const migratedJSON = JSON.stringify(migrated);
        try {
          // A shorter replacement needs no extra storage key. If storage is
          // blocked or another tab changed it, retain the original for recovery
          // and use the safe representation in memory until a normal commit.
          if (this._storage.getItem(this.key) === saved) {
            this._storage.setItem(this.key, migratedJSON);
            state = migrated;
            savedJSON = migratedJSON;
          }
        } catch {
          /* The safe in-memory library remains readable. */
        }
      }
      return { state, savedJSON, warnings };
    }
    get state() {
      return clone(this._state);
    }
    subscribe(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    }
    reload() {
      let loaded;
      try {
        const saved = this._storage.getItem(this.key);
        loaded = this._readLocal(saved, this._state.prefs.timezone);
      } catch (error) {
        throw new StorageError(
          "Não foi possível reler a biblioteca salva. Os dados da sessão continuam disponíveis para exportação.",
          error,
        );
      }
      this._state = loaded.state;
      this._persistedJSON = loaded.savedJSON;
      this.migrationWarnings = loaded.warnings;
      for (const listener of this._listeners) {
        try {
          listener(this.state);
        } catch (error) {
          global.console?.error?.(
            "Atheneum: falha ao atualizar a interface.",
            error,
          );
        }
      }
      return this.state;
    }
    _commit(mutator) {
      const next = clone(this._state);
      const value = mutator(next);
      next.updatedAt = this._now();
      next.revision = this._state.revision + 1;
      this._unlock(next);
      const checked = validateState(next);
      let savedJSON;
      try {
        // Avoid overwriting a newer revision produced by another tab.
        if (this._storage.getItem(this.key) !== this._persistedJSON)
          throw new StorageError(
            "Sua biblioteca foi alterada em outra aba. Atualize esta página antes de salvar; o conteúdo digitado continua no formulário.",
          );
        savedJSON = JSON.stringify(checked);
        this._storage.setItem(this.key, savedJSON);
      } catch (error) {
        if (error instanceof StorageError) throw error;
        throw new StorageError(
          "Não foi possível salvar. O navegador pode estar sem espaço ou com o armazenamento bloqueado. Seus dados anteriores continuam intactos; exporte um backup.",
          error,
        );
      }
      this._state = checked;
      this._persistedJSON = savedJSON;
      for (const listener of this._listeners) {
        try {
          listener(this.state);
        } catch (error) {
          global.console?.error?.(
            "Atheneum: falha ao atualizar a interface.",
            error,
          );
        }
      }
      return value === undefined ? this.state : clone(value);
    }
    _find(state, collection, itemId) {
      const item = state[collection].find((x) => x.id === itemId);
      if (!item)
        throw new ValidationError({
          [collection]: "Este registro não foi encontrado.",
        });
      return item;
    }
    _reward(state, book) {
      const now = this._now();
      const types =
        book.status === "read"
          ? ["start", "finish"]
          : book.status === "reading"
            ? ["start"]
            : [];
      for (const type of types) {
        const eventId = `book:${book.id}:${type}`;
        if (!state.rewards.some((r) => r.id === eventId))
          state.rewards.push({
            id: eventId,
            bookId: book.id,
            type,
            xp: XP[type],
            date: now,
            title: book.title,
            genre: book.genre,
            reason:
              type === "start"
                ? "Primeira leitura iniciada deste livro"
                : "Primeira conclusão deste livro",
          });
      }
    }
    _unlock(state) {
      const finished = state.rewards.filter((r) => r.type === "finish");
      const genres = new Set(finished.map((r) => r.genre).filter(Boolean));
      const today = localDay(this._now(), state.prefs.timezone);
      const days = streak(state.sessions, today);
      const annual = finished.filter((r) =>
        localDay(r.date, state.prefs.timezone).startsWith(
          String(state.goals.year),
        ),
      ).length;
      const criteria = [
        ["first-book", "Primeira travessia", finished.length >= 1],
        ["five-books", "Leitor constante", finished.length >= 5],
        ["ten-books", "Colecionador de histórias", finished.length >= 10],
        ["first-note", "Ideia guardada", state.notes.length >= 1],
        ["first-list", "Curador da estante", state.lists.length >= 1],
        ["three-genres", "Novos horizontes", genres.size >= 3],
        ["seven-days", "Sete dias de leitura", days.best >= 7],
        [
          `annual-${state.goals.year}`,
          "Meta anual alcançada",
          !state.goals.paused &&
            state.goals.annualBooks > 0 &&
            annual >= state.goals.annualBooks,
        ],
      ];
      for (const month of Object.keys(state.goals.monthly))
        criteria.push([
          `monthly-${month}`,
          "Meta mensal alcançada",
          monthlyStatistics(state, month).achieved,
        ]);
      for (const [aid, name, unlocked] of criteria)
        if (unlocked && !state.achievements.some((a) => a.id === aid))
          state.achievements.push({ id: aid, name, date: this._now() });
    }
    getBook(bookId) {
      const b = this._state.books.find((b) => b.id === bookId);
      return b ? clone(b) : null;
    }
    getBooks({ includeDeleted = false } = {}) {
      return clone(
        this._state.books.filter((b) => includeDeleted || !b.deletedAt),
      );
    }
    importCollection(data) {
      if (
        !plain(data) ||
        !validId(data.id) ||
        !Array.isArray(data.books) ||
        data.books.length > 100000
      )
        throw new ValidationError({
          collection: "A coleção de livros é inválida.",
        });
      if (this._state.imports.includes(data.id))
        return {
          added: 0,
          matched: 0,
          total: data.books.length,
          alreadyImported: true,
        };
      const now = this._now();
      const releaseKey = collectionReleaseKey(data.id);
      // Baseline timestamps and IDs are identical in every installation. A
      // freshly opened browser cannot supersede an older reader's real edits
      // when their backup is merged into the same bundled catalogue.
      const seededAt = validDate(data.sourceDate)
        ? new Date(data.sourceDate).toISOString()
        : "1970-01-01T00:00:00.000Z";
      // Prepare every row before committing. Unknown bibliography remains blank;
      // source metadata is descriptive data and cannot modify ownership records.
      const prepared = data.books.map((row, index) => {
        if (
          !plain(row) ||
          !Array.isArray(row.listNames) ||
          row.listNames.some(
            (name) =>
              typeof name !== "string" || !text(name) || name.length > 120,
          )
        )
          throw new ValidationError({
            collection: "Uma lista da coleção está incompleta.",
          });
        const book = normalizeBook(
          {
            title: row.title,
            author: row.author || "",
            genre: row.genre || row.section || "",
            status: "want",
          },
          null,
          seededAt,
        );
        book.id = `collection:${releaseKey}:book:${index + 1}`;
        return {
          book,
          names: [...new Set(row.listNames.map((name) => text(name, 120)))],
        };
      });
      const seedListIds = new Map();
      for (const { names } of prepared)
        for (const name of names) {
          const key = collectionTextKey(name);
          if (!seedListIds.has(key))
            seedListIds.set(
              key,
              `collection:${releaseKey}:list:${seedListIds.size + 1}`,
            );
        }
      return this._commit((state) => {
        const lists = new Map(
          state.lists.map((list) => [collectionTextKey(list.name), list]),
        );
        const books = new Map();
        // Include tombstones: the collection must respect an existing deletion.
        for (const book of state.books)
          if (!books.has(collectionBookKey(book)))
            books.set(collectionBookKey(book), book);
        let added = 0,
          matched = 0;
        for (const { book, names } of prepared) {
          const listIds = names.map((name) => {
            const key = collectionTextKey(name);
            if (!lists.has(key)) {
              const list = {
                id: seedListIds.get(key),
                name,
                createdAt: seededAt,
                updatedAt: seededAt,
              };
              state.lists.push(list);
              lists.set(key, list);
            }
            return lists.get(key).id;
          });
          const key = collectionBookKey(book),
            existing = books.get(key);
          if (existing) {
            // Add classification without replacing a reader's edition, status,
            // progress, notes, rating, files, or any existing list memberships.
            const merged = [...new Set([...existing.listIds, ...listIds])];
            if (merged.length !== existing.listIds.length) {
              existing.listIds = merged;
              existing.updatedAt = now;
            }
            matched++;
          } else {
            book.listIds = [...new Set(listIds)];
            state.books.push(book);
            books.set(key, book);
            added++;
          }
        }
        state.imports.push(data.id);
        // Wishlist rows are not reading events and do not earn XP.
        return {
          added,
          matched,
          total: prepared.length,
          alreadyImported: false,
        };
      });
    }
    addBook(data, { allowDuplicate = false } = {}) {
      const now = this._now();
      const b = normalizeBook(data, null, now);
      // IDs and ownership records are generated internally; callers supply bibliography.
      b.id = id("book");
      b.createdAt = now;
      b.updatedAt = now;
      b.deletedAt = null;
      b.file = null;
      const duplicate = this._state.books.find(
        (x) =>
          !x.deletedAt &&
          ((isbnKey(b.isbn) &&
            isbnKey(b.isbn) === isbnKey(x.isbn) &&
            text(b.edition) === text(x.edition)) ||
            bookKey(b) === bookKey(x)),
      );
      if (duplicate && !allowDuplicate) throw new DuplicateError(duplicate);
      return this._commit((state) => {
        state.books.push(b);
        this._reward(state, b);
        return b;
      });
    }
    updateBook(bookId, patch, { allowDuplicate = false } = {}) {
      const current = this._find(this._state, "books", bookId);
      assertSafeData(patch);
      const allowed = Object.fromEntries(
        [
          "title",
          "author",
          "genre",
          "isbn",
          "edition",
          "description",
          "cover",
          "totalPages",
          "currentPage",
          "status",
          "rating",
          "listIds",
          "tagIds",
        ]
          .filter((k) => own(patch, k))
          .map((k) => [k, patch[k]]),
      );
      const b = normalizeBook(allowed, current, this._now());
      const bibliographyChanged = ["title", "author", "isbn", "edition"].some(
        (k) => b[k] !== current[k],
      );
      const duplicate =
        bibliographyChanged &&
        this._state.books.find(
          (x) =>
            x.id !== bookId &&
            !x.deletedAt &&
            ((isbnKey(b.isbn) &&
              isbnKey(b.isbn) === isbnKey(x.isbn) &&
              text(b.edition) === text(x.edition)) ||
              bookKey(b) === bookKey(x)),
        );
      if (duplicate && !allowDuplicate) throw new DuplicateError(duplicate);
      return this._commit((state) => {
        state.books[state.books.findIndex((x) => x.id === bookId)] = b;
        if (!b.deletedAt) this._reward(state, b);
        return b;
      });
    }
    deleteBook(bookId) {
      return this._commit((state) => {
        const b = this._find(state, "books", bookId);
        if (!b.deletedAt) b.deletedAt = this._now();
        b.updatedAt = this._now();
        return b;
      });
    }
    restoreBook(bookId) {
      return this._commit((state) => {
        const b = this._find(state, "books", bookId);
        b.deletedAt = null;
        b.updatedAt = this._now();
        return b;
      });
    }
    addList(name) {
      name = text(typeof name === "object" ? name.name : name, 121);
      if (!name || name.length > 120)
        throw new ValidationError({
          name: "Informe um nome de lista com até 120 caracteres.",
        });
      if (
        this._state.lists.some(
          (l) =>
            l.name.toLocaleLowerCase("pt-BR") ===
            name.toLocaleLowerCase("pt-BR"),
        )
      )
        throw new ValidationError({
          name: "Já existe uma lista com este nome.",
        });
      return this._commit((state) => {
        const now = this._now();
        const l = { id: id("list"), name, createdAt: now, updatedAt: now };
        state.lists.push(l);
        return l;
      });
    }
    updateList(listId, name) {
      name = text(typeof name === "object" ? name.name : name, 121);
      if (!name || name.length > 120)
        throw new ValidationError({
          name: "Informe um nome de lista com até 120 caracteres.",
        });
      if (
        this._state.lists.some(
          (l) =>
            l.id !== listId &&
            l.name.toLocaleLowerCase("pt-BR") ===
              name.toLocaleLowerCase("pt-BR"),
        )
      )
        throw new ValidationError({
          name: "Já existe uma lista com este nome.",
        });
      return this._commit((state) => {
        const l = this._find(state, "lists", listId);
        l.name = name;
        l.updatedAt = this._now();
        return l;
      });
    }
    deleteList(listId) {
      return this._commit((state) => {
        this._find(state, "lists", listId);
        state.lists = state.lists.filter((l) => l.id !== listId);
        for (const b of state.books)
          b.listIds = b.listIds.filter((v) => v !== listId);
      });
    }
    setBookLists(bookId, listIds) {
      return this.updateBook(bookId, { listIds });
    }
    addBookToList(bookId, listId) {
      const b = this._find(this._state, "books", bookId);
      return this.setBookLists(bookId, [...new Set([...b.listIds, listId])]);
    }
    removeBookFromList(bookId, listId) {
      const b = this._find(this._state, "books", bookId);
      return this.setBookLists(
        bookId,
        b.listIds.filter((v) => v !== listId),
      );
    }
    getTags() {
      return clone(this._state.tags);
    }
    _tag(data, base) {
      assertSafeData(data);
      if (!plain(data))
        throw new ValidationError({ name: "Informe o nome e a cor da tag." });
      const tag = {
        id: id("tag"),
        name: "",
        color: "#a53d2c",
        createdAt: this._now(),
        updatedAt: this._now(),
        ...base,
      };
      for (const key of ["name", "color"])
        if (own(data, key)) tag[key] = data[key];
      const errors = {};
      if (
        typeof tag.name !== "string" ||
        !text(tag.name) ||
        tag.name.length > 40
      )
        errors.name = "Informe um nome de tag com até 40 caracteres.";
      if (typeof tag.color !== "string" || !/^#[0-9a-f]{6}$/i.test(tag.color))
        errors.color = "Escolha uma cor válida no formato #RRGGBB.";
      const key = collectionTextKey(tag.name);
      if (
        this._state.tags.some(
          (other) =>
            other.id !== base?.id && collectionTextKey(other.name) === key,
        )
      )
        errors.name = "Já existe uma tag com este nome.";
      if (Object.keys(errors).length) throw new ValidationError(errors);
      tag.name = text(tag.name, 40);
      tag.color = tag.color.toLowerCase();
      tag.updatedAt = this._now();
      return tag;
    }
    addTag(data) {
      const tag = this._tag(typeof data === "string" ? { name: data } : data);
      return this._commit((state) => {
        state.tags.push(tag);
        return tag;
      });
    }
    updateTag(tagId, patch) {
      const current = this._find(this._state, "tags", tagId),
        tag = this._tag(patch, current);
      return this._commit((state) => {
        state.tags[state.tags.findIndex((item) => item.id === tagId)] = tag;
        return tag;
      });
    }
    deleteTag(tagId) {
      return this._commit((state) => {
        this._find(state, "tags", tagId);
        state.tags = state.tags.filter((tag) => tag.id !== tagId);
        for (const book of state.books)
          if (book.tagIds.includes(tagId)) {
            book.tagIds = book.tagIds.filter((value) => value !== tagId);
            book.updatedAt = this._now();
          }
      });
    }
    setBookTags(bookId, tagIds) {
      return this.updateBook(bookId, { tagIds });
    }
    getNotes(bookId) {
      return clone(
        this._state.notes.filter((n) => !bookId || n.bookId === bookId),
      );
    }
    _note(data, base) {
      const n = Object.assign(
        {
          id: id("note"),
          bookId: null,
          text: "",
          page: null,
          quote: "",
          createdAt: this._now(),
          updatedAt: this._now(),
        },
        base || {},
        data,
      );
      const errors = {};
      if (!text(n.text)) errors.text = "Escreva a anotação antes de salvar.";
      if (String(n.text).length > 100000)
        errors.text = "A anotação pode ter até 100.000 caracteres.";
      if (n.page === "") n.page = null;
      const b = this._find(this._state, "books", n.bookId);
      if (
        n.page !== null &&
        (!integer(n.page) ||
          Number(n.page) === 0 ||
          (b.totalPages > 0 && Number(n.page) > b.totalPages))
      )
        errors.page =
          "Informe uma página existente no livro ou deixe o campo vazio.";
      if (Object.keys(errors).length) throw new ValidationError(errors);
      n.text = text(n.text, 100000);
      n.quote = text(n.quote, 10000);
      n.page = n.page === null ? null : Number(n.page);
      n.updatedAt = this._now();
      return n;
    }
    addNote(bookId, data) {
      const n = this._note(
        Object.assign({}, typeof data === "string" ? { text: data } : data, {
          bookId,
        }),
      );
      return this._commit((state) => {
        state.notes.push(n);
        return n;
      });
    }
    updateNote(noteId, patch) {
      const current = this._find(this._state, "notes", noteId);
      const n = this._note(
        Object.fromEntries(
          ["text", "page", "quote"]
            .filter((k) => own(patch, k))
            .map((k) => [k, patch[k]]),
        ),
        current,
      );
      return this._commit((state) => {
        state.notes[state.notes.findIndex((x) => x.id === noteId)] = n;
        return n;
      });
    }
    deleteNote(noteId) {
      return this._commit((state) => {
        this._find(state, "notes", noteId);
        state.notes = state.notes.filter((n) => n.id !== noteId);
      });
    }
    updateProgress(bookId, page) {
      const b = this._find(this._state, "books", bookId);
      const status =
        b.totalPages > 0 && Number(page) === b.totalPages
          ? "read"
          : Number(page) > 0
            ? "reading"
            : b.status === "read"
              ? "reading"
              : b.status;
      return this.updateBook(bookId, { currentPage: page, status });
    }
    _session(book, data, base) {
      const fromPage = Number(
        data.fromPage ?? base?.fromPage ?? book.currentPage,
      );
      const toPage = Number(data.toPage ?? base?.toPage ?? fromPage);
      const duration = Number(data.duration ?? base?.duration ?? 0);
      const errors = {};
      if (
        !integer(fromPage) ||
        !integer(toPage) ||
        toPage < fromPage ||
        toPage > 1000000 ||
        (book.totalPages > 0 && toPage > book.totalPages)
      )
        errors.toPage =
          "A página final deve ser maior ou igual à inicial e não ultrapassar o total. Para corrigir a posição, use Atualizar progresso.";
      if (!Number.isFinite(duration) || duration < 0 || duration > 1440)
        errors.duration = "Informe uma duração entre 0 e 1.440 minutos.";
      if (toPage === fromPage && duration === 0)
        errors.toPage =
          "Registre páginas lidas ou uma duração para esta sessão.";
      const date = data.date ?? base?.date ?? this._now();
      let recordedDate;
      try {
        recordedDate = sessionDate(date, this._state.prefs.timezone);
      } catch {
        errors.date = "Informe uma data válida para a sessão.";
      }
      if (data.requestId && !validId(data.requestId))
        errors.requestId = "O identificador da sessão é inválido.";
      if (Object.keys(errors).length) throw new ValidationError(errors);
      return Object.assign(
        {},
        base || {
          id: id("session"),
          bookId: book.id,
          createdAt: this._now(),
          requestId: data.requestId || id("request"),
        },
        {
          fromPage,
          toPage,
          pages: toPage - fromPage,
          duration,
          date: recordedDate.date,
          day: own(data, "date") || !base ? recordedDate.day : base.day,
          updatedAt: this._now(),
        },
      );
    }
    recordSession(bookId, data = {}) {
      if (data.requestId) {
        const prior = this._state.sessions.find(
          (s) => s.requestId === data.requestId,
        );
        if (prior) {
          if (prior.bookId !== bookId)
            throw new ValidationError({
              requestId: "Esta sessão já foi registrada para outro livro.",
            });
          return clone(prior);
        }
      }
      const b = this._find(this._state, "books", bookId);
      if (b.deletedAt)
        throw new ValidationError({
          book: "Restaure o livro antes de registrar uma leitura.",
        });
      const session = this._session(b, data);
      return this._commit((state) => {
        state.sessions.push(session);
        const book = this._find(state, "books", bookId);
        book.currentPage = session.toPage;
        book.updatedAt = this._now();
        book.status =
          book.totalPages > 0 && book.currentPage === book.totalPages
            ? "read"
            : "reading";
        this._reward(state, book);
        return session;
      });
    }
    updateSession(sessionId, patch) {
      const old = this._find(this._state, "sessions", sessionId);
      const b = this._find(this._state, "books", old.bookId);
      const s = this._session(b, patch, old);
      // Correcting history updates totals, but does not move the current book position.
      return this._commit((state) => {
        state.sessions[state.sessions.findIndex((x) => x.id === sessionId)] = s;
        return s;
      });
    }
    deleteSession(sessionId) {
      return this._commit((state) => {
        this._find(state, "sessions", sessionId);
        state.sessions = state.sessions.filter((s) => s.id !== sessionId);
      });
    }
    getSessions(bookId) {
      return clone(
        this._state.sessions
          .filter((s) => !bookId || s.bookId === bookId)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    }
    setGoals(patch) {
      assertSafeData(patch);
      const allowed = Object.fromEntries(
        ["annualBooks", "dailyPages", "weeklyPages", "paused", "year"]
          .filter((k) => own(patch, k))
          .map((k) => [k, patch[k]]),
      );
      const errors = {};
      for (const k of ["annualBooks", "dailyPages", "weeklyPages"])
        if (own(allowed, k)) {
          if (!integer(allowed[k]) || Number(allowed[k]) > 1000000)
            errors[k] =
              "Informe um número inteiro positivo, ou zero para desativar.";
          else allowed[k] = Number(allowed[k]);
        }
      if (own(allowed, "year")) {
        if (
          !integer(allowed.year) ||
          Number(allowed.year) < 1900 ||
          Number(allowed.year) > 2200
        )
          errors.year = "Informe um ano entre 1900 e 2200.";
        else allowed.year = Number(allowed.year);
      }
      if (own(allowed, "paused") && typeof allowed.paused !== "boolean")
        errors.paused = "O estado da meta é inválido.";
      if (Object.keys(errors).length) throw new ValidationError(errors);
      return this._commit((state) => {
        const { history, monthly, ...previous } = state.goals;
        state.goals.history.push({ ...previous, changedAt: this._now() });
        Object.assign(state.goals, allowed);
        return state.goals;
      });
    }
    setMonthlyGoal(patch) {
      assertSafeData(patch);
      if (!plain(patch) || !validMonth(patch.month))
        throw new ValidationError({
          month: "Escolha um mês válido entre 1900 e 2200.",
        });
      const allowed = Object.fromEntries(
        ["month", "books", "pages", "minutes", "paused"]
          .filter((key) => own(patch, key))
          .map((key) => [key, patch[key]]),
      );
      const now = this._now(),
        goal = normalizeMonthlyGoal(
          allowed,
          this._state.goals.monthly[patch.month],
          now,
        );
      goal.updatedAt = now;
      return this._commit((state) => {
        state.goals.monthly[goal.month] = goal;
        return goal;
      });
    }
    monthlyStats(
      month = localDay(this._now(), this._state.prefs.timezone).slice(0, 7),
    ) {
      return monthlyStatistics(this._state, month);
    }
    setPrefs(patch) {
      assertSafeData(patch);
      const allowed = Object.fromEntries(
        [
          "view",
          "theme",
          "reducedMotion",
          "motionMode",
          "timezone",
          "lastBookId",
          "marqueePaused",
          "pdfPages",
        ]
          .filter((k) => own(patch, k))
          .map((k) => [k, patch[k]]),
      );
      if (allowed.view && !["grid", "list", "shelf"].includes(allowed.view))
        throw new ValidationError({ view: "Escolha Estante, Grade ou Lista." });
      if (allowed.timezone) {
        try {
          localDay(this._now(), allowed.timezone);
        } catch {
          throw new ValidationError({
            timezone: "Informe um fuso horário válido.",
          });
        }
      }
      if (allowed.lastBookId && !this.getBook(allowed.lastBookId))
        throw new ValidationError({
          lastBookId: "Este livro não existe na biblioteca.",
        });
      return this._commit((state) => {
        Object.assign(state.prefs, allowed);
        return state.prefs;
      });
    }
    stats() {
      const state = this._state;
      const active = state.books.filter((b) => !b.deletedAt);
      const finished = state.rewards.filter((r) => r.type === "finish");
      const xp = state.rewards.reduce((n, r) => n + r.xp, 0);
      const level = Math.floor(xp / 200) + 1;
      const today = localDay(this._now(), state.prefs.timezone);
      const weekday = new Date(today + "T12:00:00Z").getUTCDay();
      const weekStart = shiftDay(today, -((weekday + 6) % 7));
      const annualBooks = finished.filter((r) =>
        localDay(r.date, state.prefs.timezone).startsWith(
          String(state.goals.year),
        ),
      ).length;
      const todayPages = state.sessions
        .filter((s) => s.day === today)
        .reduce((n, s) => n + s.pages, 0);
      const weekPages = state.sessions
        .filter((s) => s.day >= weekStart && s.day <= today)
        .reduce((n, s) => n + s.pages, 0);
      const pages = state.sessions.reduce((n, s) => n + s.pages, 0);
      const duration = state.sessions.reduce((n, s) => n + s.duration, 0);
      return {
        totalBooks: active.length,
        want: active.filter((b) => b.status === "want").length,
        reading: active.filter((b) => b.status === "reading").length,
        read: active.filter((b) => b.status === "read").length,
        deleted: state.books.length - active.length,
        xp,
        level,
        levelTitle: [
          "Visitante",
          "Aprendiz",
          "Leitor",
          "Curador",
          "Guardião",
          "Sábio",
        ][Math.min(level - 1, 5)],
        levelProgress: xp % 200,
        nextLevelXp: level * 200,
        xpToNext: 200 - (xp % 200),
        finishedBooks: finished.length,
        pages,
        totalPages: pages,
        duration,
        sessions: state.sessions.length,
        notes: state.notes.length,
        lists: state.lists.length,
        today,
        todayPages,
        weekPages,
        annualBooks,
        streak: streak(state.sessions, today).current,
        bestStreak: streak(state.sessions, today).best,
        monthly: this.monthlyStats(today.slice(0, 7)),
        goals: clone(state.goals),
        achievements: clone(state.achievements),
        genres: [...new Set(active.map((b) => b.genre).filter(Boolean))],
      };
    }
    exportBackup() {
      return JSON.stringify(
        {
          format: "atheneum-backup",
          version: VERSION,
          exportedAt: this._now(),
          filesIncluded: false,
          state: this._state,
        },
        null,
        2,
      );
    }
    _parseBackup(input) {
      let parsed;
      if (typeof input !== "string") {
        assertSafeData(input);
        try {
          input = JSON.stringify(input);
        } catch {
          throw new ValidationError({
            backup: "O arquivo não contém um JSON válido.",
          });
        }
      }
      if (
        typeof input !== "string" ||
        input.length > MAX_BACKUP_BYTES ||
        new Blob([input]).size > MAX_BACKUP_BYTES
      )
        throw new ValidationError({
          backup: "O backup pode ter no máximo 150 MB.",
        });
      try {
        parsed = JSON.parse(input);
      } catch {
        throw new ValidationError({
          backup: "O arquivo não contém um JSON válido.",
        });
      }
      assertSafeData(parsed);
      if (!plain(parsed))
        throw new ValidationError({
          backup: "O arquivo não contém um backup válido.",
        });
      if (parsed.format && parsed.format !== "atheneum-backup")
        throw new ValidationError({
          backup: "Este arquivo não é um backup do Atheneum.",
        });
      if (
        (parsed.version !== undefined && parsed.version !== VERSION) ||
        (parsed.filesIncluded !== undefined &&
          typeof parsed.filesIncluded !== "boolean") ||
        (parsed.files !== undefined &&
          (!Array.isArray(parsed.files) || parsed.files.length > 100000))
      )
        throw new ValidationError({
          backup: "O formato ou a coleção de arquivos do backup é inválido.",
        });
      return {
        state: validateState(parsed.state || parsed),
        files: parsed.files || [],
        filesIncluded: !!parsed.filesIncluded,
      };
    }
    _merge(current, incoming) {
      const merged = clone(current);
      const restored = clone(incoming);
      const seedBook = (book) => /^collection:.+:book:\d+$/.test(book.id);
      const seedList = (list) => /^collection:.+:list:\d+$/.test(list.id);
      const untouchedBook = (book, state) =>
        seedBook(book) &&
        book.createdAt === book.updatedAt &&
        book.status === "want" &&
        book.currentPage === 0 &&
        book.totalPages === 0 &&
        book.rating === null &&
        !book.isbn &&
        !book.edition &&
        !book.description &&
        !book.cover &&
        !book.file &&
        !book.deletedAt &&
        !book.tagIds.length &&
        !own(state.prefs.pdfPages, book.id) &&
        !["notes", "sessions", "rewards"].some((key) =>
          state[key].some((record) => record.bookId === book.id),
        );
      const bookRemaps = new Map(),
        listRemaps = new Map();
      const reconcileBooks = (seedState, manualState) => {
        for (const book of [...seedState.books]) {
          if (
            !untouchedBook(book, seedState) ||
            manualState.books.some((other) => other.id === book.id)
          )
            continue;
          const key = collectionBookKey(book);
          // A seed and a manual copy already present together are intentional.
          // Only reconcile a pristine baseline against a legacy installation
          // where the collection originally reused the reader's manual record.
          if (
            seedState.books.some(
              (other) => !seedBook(other) && collectionBookKey(other) === key,
            )
          )
            continue;
          const manual = manualState.books.find(
            (other) => !seedBook(other) && collectionBookKey(other) === key,
          );
          if (!manual) continue;
          manual.listIds = [...new Set([...manual.listIds, ...book.listIds])];
          seedState.books = seedState.books.filter(
            (other) => other.id !== book.id,
          );
          bookRemaps.set(book.id, manual.id);
        }
      };
      const reconcileLists = (seedState, manualState) => {
        for (const list of [...seedState.lists]) {
          if (
            !seedList(list) ||
            list.createdAt !== list.updatedAt ||
            manualState.lists.some((other) => other.id === list.id)
          )
            continue;
          const key = collectionTextKey(list.name);
          if (
            seedState.lists.some(
              (other) =>
                !seedList(other) && collectionTextKey(other.name) === key,
            )
          )
            continue;
          const manual = manualState.lists.find(
            (other) =>
              !seedList(other) && collectionTextKey(other.name) === key,
          );
          if (!manual) continue;
          seedState.lists = seedState.lists.filter(
            (other) => other.id !== list.id,
          );
          listRemaps.set(list.id, manual.id);
        }
      };
      reconcileBooks(merged, restored);
      reconcileBooks(restored, merged);
      reconcileLists(merged, restored);
      reconcileLists(restored, merged);
      for (const state of [merged, restored]) {
        for (const book of state.books)
          book.listIds = [
            ...new Set(
              book.listIds.map((listId) => listRemaps.get(listId) || listId),
            ),
          ];
        for (const key of ["notes", "sessions", "rewards"])
          for (const record of state[key]) {
            if (!bookRemaps.has(record.bookId)) continue;
            record.bookId = bookRemaps.get(record.bookId);
            if (key === "rewards")
              record.id = `book:${record.bookId}:${record.type}`;
          }
        if (bookRemaps.has(state.prefs.lastBookId))
          state.prefs.lastBookId = bookRemaps.get(state.prefs.lastBookId);
        state.prefs.pdfPages = Object.fromEntries(
          Object.entries(state.prefs.pdfPages).map(([bookId, page]) => [
            bookRemaps.get(bookId) || bookId,
            page,
          ]),
        );
      }
      // Stable record IDs make repeated import idempotent. Latest modification wins.
      for (const key of [
        "books",
        "lists",
        "tags",
        "notes",
        "sessions",
        "rewards",
        "achievements",
      ]) {
        const records = new Map(merged[key].map((v) => [v.id, v]));
        for (const item of restored[key]) {
          const prior = records.get(item.id);
          if (
            !prior ||
            (item.updatedAt || item.date || "") >
              (prior.updatedAt || prior.date || "")
          )
            records.set(item.id, clone(item));
          if (key === "books" && prior)
            records.get(item.id).tagIds = [
              ...new Set([...prior.tagIds, ...item.tagIds]),
            ];
        }
        merged[key] = [...records.values()];
      }
      // Tags created independently with the same name become one classification.
      // Books retain both browsers' memberships and repeated merges remain stable.
      const tagsByName = new Map(),
        tagRemaps = new Map();
      for (const tag of merged.tags) {
        const key = collectionTextKey(tag.name),
          existing = tagsByName.get(key);
        if (!existing) {
          tagsByName.set(key, tag);
          continue;
        }
        tagRemaps.set(tag.id, existing.id);
        if (tag.updatedAt > existing.updatedAt)
          Object.assign(existing, {
            name: tag.name,
            color: tag.color,
            updatedAt: tag.updatedAt,
          });
      }
      merged.tags = [...tagsByName.values()];
      for (const book of merged.books)
        book.tagIds = [
          ...new Set(book.tagIds.map((tagId) => tagRemaps.get(tagId) || tagId)),
        ];
      // Annual/daily settings stay local in merge mode. Monthly records have
      // their own modification timestamps and can safely merge by calendar month.
      for (const [month, goal] of Object.entries(restored.goals.monthly)) {
        const previous = merged.goals.monthly[month];
        if (!previous || goal.updatedAt > previous.updatedAt)
          merged.goals.monthly[month] = clone(goal);
      }
      merged.imports = [...new Set([...merged.imports, ...restored.imports])];
      // Keep this browser's preferences and annual/daily goals; replace restores all.
      return merged;
    }
    _applyBackup(incoming, { mode = "merge" } = {}) {
      if (!["merge", "replace"].includes(mode))
        throw new ValidationError({
          backup: "Escolha mesclar ou substituir os dados.",
        });
      return this._commit((state) => {
        const next =
          mode === "replace"
            ? incoming.state
            : this._merge(state, incoming.state);
        Object.assign(state, next);
        return {
          books: state.books.length,
          notes: state.notes.length,
          sessions: state.sessions.length,
          filesIncluded: incoming.filesIncluded,
          mode,
        };
      });
    }
    importBackup(input, options = {}) {
      return this._applyBackup(this._parseBackup(input), options);
    }
    async _db() {
      if (!global.indexedDB)
        throw new StorageError(
          "Este navegador não permite guardar arquivos. O cadastro e os registros continuam disponíveis.",
        );
      if (!this._dbPromise)
        this._dbPromise = new Promise((resolve, reject) => {
          const request = global.indexedDB.open("atheneum-files", 1);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains("files"))
              request.result.createObjectStore("files", { keyPath: "id" });
          };
          request.onsuccess = () => {
            request.result.onversionchange = () => {
              request.result.close();
              this._dbPromise = null;
            };
            resolve(request.result);
          };
          request.onerror = () =>
            reject(
              new StorageError(
                "Não foi possível abrir o armazenamento dos PDFs.",
                request.error,
              ),
            );
          request.onblocked = () =>
            reject(
              new StorageError(
                "Feche as outras abas do Atheneum e tente guardar o PDF novamente.",
              ),
            );
        }).catch((error) => {
          this._dbPromise = null;
          throw error;
        });
      return this._dbPromise;
    }
    async _fileTransaction(mode, action) {
      const db = await this._db();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("files", mode);
        let result;
        const request = action(tx.objectStore("files"));
        request.onsuccess = () => {
          result = request.result;
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () =>
          reject(
            new StorageError(
              "Não foi possível salvar ou abrir o PDF. Verifique o espaço disponível no navegador.",
              tx.error,
            ),
          );
        tx.onabort = () =>
          reject(
            new StorageError(
              "A operação do PDF foi interrompida; os registros anteriores foram preservados.",
              tx.error,
            ),
          );
      });
    }
    async _validatePdf(file) {
      if (
        !file ||
        typeof file.arrayBuffer !== "function" ||
        typeof file.slice !== "function" ||
        !Number.isSafeInteger(file.size)
      )
        throw new ValidationError({ file: "Escolha um arquivo PDF válido." });
      if (
        (file.name !== undefined &&
          (typeof file.name !== "string" ||
            file.name.length > 255 ||
            !/\.pdf$/i.test(file.name) ||
            /[\u0000-\u001f\u007f\\/:]/.test(file.name))) ||
        (file.type &&
          (typeof file.type !== "string" ||
            file.type.toLowerCase() !== "application/pdf"))
      )
        throw new ValidationError({
          file: "Escolha um arquivo com extensão .pdf e conteúdo PDF.",
        });
      if (file.size > MAX_PDF_BYTES)
        throw new ValidationError({ file: "O PDF pode ter no máximo 25 MB." });
      if (file.size < 20)
        throw new ValidationError({
          file: "Este PDF está vazio ou incompleto.",
        });
      const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      const ending = new Uint8Array(
        await file.slice(Math.max(0, file.size - 4096)).arrayBuffer(),
      );
      if (
        !/^%PDF-(?:1\.[0-7]|2\.0)[\r\n\t ]/.test(
          new TextDecoder("latin1").decode(header),
        ) ||
        !/%%EOF[\t\n\r ]*$/.test(new TextDecoder("latin1").decode(ending))
      )
        throw new ValidationError({
          file: "O conteúdo do arquivo não é um PDF completo e válido.",
        });
    }
    async saveFile(bookId, file) {
      this._find(this._state, "books", bookId);
      await this._validatePdf(file);
      const fileId = id("file");
      const metadata = {
        id: fileId,
        name: text(file.name || "leitura.pdf", 255),
        size: file.size,
        mime: "application/pdf",
        createdAt: this._now(),
      };
      const old = this.getBook(bookId).file;
      await this._fileTransaction("readwrite", (os) =>
        os.put({ ...metadata, blob: file }),
      );
      try {
        this._commit((state) => {
          const b = this._find(state, "books", bookId);
          b.file = metadata;
          b.updatedAt = this._now();
        });
      } catch (error) {
        try {
          await this._fileTransaction("readwrite", (os) => os.delete(fileId));
        } catch {}
        throw error;
      }
      if (old) {
        try {
          await this._fileTransaction("readwrite", (os) => os.delete(old.id));
        } catch {
          /* An orphan cannot invalidate the newly saved file. */
        }
      }
      return clone(metadata);
    }
    async getFile(bookIdOrFileId) {
      const book = this.getBook(bookIdOrFileId);
      const fileId = book ? book.file?.id : bookIdOrFileId;
      if (!fileId) return null;
      const record = await this._fileTransaction("readonly", (os) =>
        os.get(fileId),
      );
      if (!record?.blob) return null;
      return typeof global.File === "function"
        ? new global.File([record.blob], record.name, {
            type: "application/pdf",
          })
        : record.blob;
    }
    async deleteFile(bookId) {
      const b = this._find(this._state, "books", bookId);
      if (!b.file) return;
      const fileId = b.file.id;
      const prior = await this._fileTransaction("readonly", (os) =>
        os.get(fileId),
      );
      await this._fileTransaction("readwrite", (os) => os.delete(fileId));
      try {
        this._commit((state) => {
          const book = this._find(state, "books", bookId);
          book.file = null;
          book.updatedAt = this._now();
        });
      } catch (error) {
        if (prior) {
          try {
            await this._fileTransaction("readwrite", (os) => os.put(prior));
          } catch {}
        }
        throw error;
      }
    }
    async exportBackupWithFiles() {
      const snapshot = this.state;
      const files = [];
      const requiredFiles = new Map(
        snapshot.books
          .filter((book) => book.file)
          .map((book) => [book.file.id, book.file.size]),
      );
      if (
        [...requiredFiles.values()].reduce((total, size) => total + size, 0) >
        MAX_BACKUP_PDF_BYTES
      )
        throw new StorageError(
          "Os PDFs ultrapassam o limite de 100 MB por backup. Exporte os registros e guarde os PDFs originais separadamente.",
        );
      for (const book of snapshot.books.filter((b) => b.file)) {
        if (files.some((f) => f.id === book.file.id)) continue;
        const record = await this._fileTransaction("readonly", (os) =>
          os.get(book.file.id),
        );
        if (!record?.blob)
          throw new StorageError(
            `O PDF de “${book.title}” está ausente. Reanexe o arquivo ou use um backup apenas dos registros.`,
          );
        const bytes = new Uint8Array(await record.blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768)
          binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        files.push({ ...book.file, data: global.btoa(binary) });
      }
      return JSON.stringify(
        {
          format: "atheneum-backup",
          version: VERSION,
          exportedAt: this._now(),
          filesIncluded: true,
          state: snapshot,
          files,
        },
        null,
        2,
      );
    }
    async importBackupWithFiles(input, options = {}) {
      const incoming = this._parseBackup(input);
      if (
        options.mode !== undefined &&
        !["merge", "replace"].includes(options.mode)
      )
        throw new ValidationError({
          backup: "Escolha mesclar ou substituir os dados.",
        });
      if (!incoming.filesIncluded) return this._applyBackup(incoming, options);
      const referenced = new Set(
        incoming.state.books.filter((b) => b.file).map((b) => b.file.id),
      );
      if (!referenced.size && !incoming.files.length)
        return this._applyBackup(incoming, options);
      const prepared = [];
      const rollback = [];
      const provided = new Set();
      const localFiles = new Map(
        this._state.books
          .filter((book) => book.file)
          .map((book) => [book.file.id, book.file]),
      );
      let totalBytes = 0;
      for (const file of incoming.files) {
        if (
          !plain(file) ||
          typeof file.data !== "string" ||
          file.data.length > Math.ceil(MAX_PDF_BYTES / 3) * 4
        )
          throw new ValidationError({
            backup: "Há um PDF inválido no backup.",
          });
        totalBytes +=
          Math.floor((file.data.length * 3) / 4) -
          (file.data.endsWith("==") ? 2 : file.data.endsWith("=") ? 1 : 0);
        if (totalBytes > MAX_BACKUP_PDF_BYTES)
          throw new ValidationError({
            backup: "Os PDFs de um backup podem somar até 100 MB.",
          });
      }
      for (const f of incoming.files) {
        if (
          !plain(f) ||
          !referenced.has(f.id) ||
          provided.has(f.id) ||
          typeof f.data !== "string" ||
          f.data.length > Math.ceil(MAX_PDF_BYTES / 3) * 4 + 10
        )
          throw new ValidationError({
            backup: "Há um PDF inválido ou repetido no backup.",
          });
        provided.add(f.id);
        const bytes = decodeBase64(f.data, MAX_PDF_BYTES, "backup");
        const blob = new Blob([bytes], { type: "application/pdf" });
        await this._validatePdf(blob);
        const meta = incoming.state.books.find((b) => b.file?.id === f.id).file;
        if (meta.size !== blob.size)
          throw new ValidationError({
            backup: "O tamanho de um PDF não corresponde ao backup.",
          });
        const local = options.mode !== "replace" && localFiles.get(meta.id);
        if (
          local &&
          ["id", "name", "size", "mime", "createdAt"].some(
            (key) => meta[key] !== local[key],
          )
        )
          throw new ValidationError({
            backup:
              "Um PDF do backup usa o identificador de outro arquivo local. A mesclagem foi cancelada para preservar seus arquivos.",
          });
        prepared.push({ ...meta, blob });
      }
      if (prepared.length !== referenced.size)
        throw new ValidationError({
          backup: "O backup não inclui todos os PDFs da biblioteca.",
        });
      try {
        for (const f of prepared) {
          const prior = await this._fileTransaction("readonly", (os) =>
            os.get(f.id),
          );
          // File IDs are immutable. Merge restores absent files but never
          // overwrites a present local document with an older backup's bytes.
          // Replace explicitly restores the backup's complete document set.
          if (
            options.mode !== "replace" &&
            localFiles.has(f.id) &&
            prior?.blob?.size === localFiles.get(f.id).size
          )
            continue;
          rollback.push({ id: f.id, prior });
          await this._fileTransaction("readwrite", (os) => os.put(f));
        }
        return this._applyBackup(incoming, options);
      } catch (error) {
        for (const item of rollback.reverse()) {
          try {
            await this._fileTransaction("readwrite", (os) =>
              item.prior ? os.put(item.prior) : os.delete(item.id),
            );
          } catch {}
        }
        throw error;
      }
    }
  }

  AtheneumStore.VERSION = VERSION;
  AtheneumStore.XP = XP;
  AtheneumStore.MAX_PDF_BYTES = MAX_PDF_BYTES;
  AtheneumStore.ValidationError = ValidationError;
  AtheneumStore.StorageError = StorageError;
  AtheneumStore.DuplicateError = DuplicateError;
  AtheneumStore.localDay = localDay;
  global.AtheneumStore = AtheneumStore;
  if (typeof module !== "undefined" && module.exports)
    module.exports = {
      AtheneumStore,
      ValidationError,
      StorageError,
      DuplicateError,
    };
})(typeof window !== "undefined" ? window : globalThis);
