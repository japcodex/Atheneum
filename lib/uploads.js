/**
 * Browser-local file boundary. Filenames and MIME labels are untrusted: inspect
 * bytes before decoding, then redraw cover pixels into a new JPEG. PDFs remain
 * original documents and are displayed by the canvas-only reader, never HTML.
 */
export const UPLOAD_LIMITS = Object.freeze({
  coverBytes: 2 * 1024 * 1024,
  pdfBytes: 25 * 1024 * 1024,
  backupBytes: 150 * 1024 * 1024,
  backupPdfBytes: 100 * 1024 * 1024,
  imagePixels: 16 * 1024 * 1024,
  imageEdge: 8192,
});

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const badKeys = new Set(["__proto__", "prototype", "constructor"]);
const ascii = (bytes, start, length) =>
  String.fromCharCode(...bytes.subarray(start, start + length));
const error = (message) => new Error(message);

function checkFile(file, limit, extensions, types, label) {
  if (!file || typeof file.arrayBuffer !== "function" ||
      !Number.isSafeInteger(file.size) || file.size <= 0)
    throw error(`Escolha um ${label} válido e não vazio.`);
  if (file.size > limit) throw error(`O ${label} ultrapassa o limite permitido.`);
  // Blob objects used internally have no filename. User File objects do.
  if (file.name !== undefined &&
      (typeof file.name !== "string" || file.name.length > 255 ||
       /[\u0000-\u001f\u007f\\/:]/.test(file.name) ||
       !extensions.test(file.name)))
    throw error(`O nome ou a extensão do ${label} não é permitido.`);
  if (file.type && !types.has(file.type.toLowerCase()))
    throw error(`O tipo declarado do ${label} não é permitido.`);
}

/** Inspect raster dimensions before allocating a decoder or canvas. */
export function inspectImage(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 24 ||
      bytes.length > UPLOAD_LIMITS.coverBytes)
    throw error("A capa está vazia, incompleta ou ultrapassa 2 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let mime = "", width = 0, height = 0;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
    if (view.getUint32(8) !== 13 || ascii(bytes, 12, 4) !== "IHDR")
      throw error("O cabeçalho da capa PNG é inválido.");
    mime = "image/png";
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = "image/jpeg";
    let offset = 2;
    while (offset < bytes.length - 3) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) {
        if (length < 8) break;
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    mime = "image/webp";
    if (view.getUint32(4, true) + 8 !== bytes.length)
      throw error("O tamanho declarado da capa WebP é inválido.");
    const chunk = ascii(bytes, 12, 4);
    if (chunk === "VP8X" && bytes.length >= 30) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    } else if (chunk === "VP8 " && bytes.length >= 30 &&
               bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 0x3fff;
      height = view.getUint16(28, true) & 0x3fff;
    }
  }
  if (!mime || !width || !height)
    throw error("A capa deve conter uma imagem PNG, JPEG ou WebP válida.");
  if (width > UPLOAD_LIMITS.imageEdge || height > UPLOAD_LIMITS.imageEdge ||
      width * height > UPLOAD_LIMITS.imagePixels)
    throw error("A capa tem resolução excessiva. Use até 16 megapixels e 8.192 pixels por lado.");
  return { mime, width, height };
}

export function decodeBase64(value, maxBytes) {
  if (typeof value !== "string" || !value.length || value.length % 4 !== 0 ||
      value.length > Math.ceil(maxBytes / 3) * 4 ||
      /[^A-Za-z0-9+/=]/.test(value))
    throw error("Um arquivo do backup tem codificação inválida.");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const firstPadding = value.indexOf("=");
  if (firstPadding !== -1 && firstPadding !== value.length - padding)
    throw error("Um arquivo do backup tem codificação inválida.");
  if (value.length / 4 * 3 - padding > maxBytes)
    throw error("Um arquivo do backup ultrapassa o limite permitido.");
  const binary = atob(value);
  // Reject noncanonical pad bits as well as whitespace and ignored characters.
  if (btoa(binary) !== value) throw error("Um arquivo do backup tem codificação inválida.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Signature/EOF checks are a format gate, not a malware scanner. */
export function validatePdfBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 20 ||
      bytes.length > UPLOAD_LIMITS.pdfBytes ||
      !/^%PDF-(?:1\.[0-7]|2\.0)[\r\n\t ]/.test(ascii(bytes, 0, 12)))
    throw error("O arquivo não contém um PDF válido de até 25 MB.");
  const tail = ascii(bytes, Math.max(0, bytes.length - 4096), 4096);
  if (!/%%EOF[\t\r\n ]*$/.test(tail))
    throw error("O PDF está incompleto ou contém dados após o encerramento.");
  return { size: bytes.length, mime: "application/pdf" };
}

export async function validatePdf(file) {
  checkFile(file, UPLOAD_LIMITS.pdfBytes, /\.pdf$/i,
    new Set(["application/pdf"]), "PDF");
  return validatePdfBytes(new Uint8Array(await file.arrayBuffer()));
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(error("Não foi possível guardar a imagem de capa."));
    reader.readAsDataURL(blob);
  });
}

async function decodeImage(blob) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { image: bitmap, width: bitmap.width, height: bitmap.height,
      dispose: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(error("A imagem de capa não pôde ser decodificada.")), 10000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(error("A imagem de capa está corrompida.")); };
      image.src = url;
    });
    return { image, width: image.naturalWidth, height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(url) };
  } catch (cause) { URL.revokeObjectURL(url); throw cause; }
}

/** Only re-encoded pixels cross into persistent cover storage. */
export async function prepareCover(file) {
  checkFile(file, UPLOAD_LIMITS.coverBytes, /\.(?:png|jpe?g|webp)$/i,
    imageTypes, "arquivo de capa");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectImage(bytes);
  if (file.type && file.type.toLowerCase() !== inspected.mime)
    throw error("O conteúdo da capa não corresponde ao tipo declarado.");
  let decoded;
  try {
    decoded = await decodeImage(new Blob([bytes], { type: inspected.mime }));
    if (!decoded.width || !decoded.height ||
        decoded.width > UPLOAD_LIMITS.imageEdge || decoded.height > UPLOAD_LIMITS.imageEdge ||
        decoded.width * decoded.height > UPLOAD_LIMITS.imagePixels)
      throw error("A resolução da capa é inválida ou excessiva.");
    const scale = Math.min(1, 1400 / decoded.width, 2100 / decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw error("Este navegador não permite preparar a capa.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
    const clean = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    canvas.width = canvas.height = 1;
    if (!clean || clean.size > UPLOAD_LIMITS.coverBytes)
      throw error("A capa preparada ultrapassa 2 MB. Escolha uma imagem menor.");
    return await blobDataUrl(clean);
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("A ")) throw cause;
    throw error("Não foi possível preparar a capa. Confira se a imagem está íntegra.");
  } finally { decoded?.dispose(); }
}

/** Iterative traversal limits nesting and excludes prototype-pollution keys. */
export function assertSafeJson(value) {
  const queue = [{ value, depth: 0 }];
  let visited = 0;
  while (queue.length) {
    const item = queue.pop();
    if (++visited > 600000 || item.depth > 64)
      throw error("O backup é complexo demais para ser importado com segurança.");
    const current = item.value;
    if (current === null || typeof current !== "object") continue;
    if (Array.isArray(current) && current.length > 100000)
      throw error("Uma coleção do backup ultrapassa o limite permitido.");
    for (const [key, entry] of Object.entries(current)) {
      if (badKeys.has(key)) throw error("O backup contém propriedades não permitidas.");
      queue.push({ value: entry, depth: item.depth + 1 });
    }
  }
}

/** Validate all embedded files before creating the automatic pre-import backup. */
export async function prepareBackup(file) {
  checkFile(file, UPLOAD_LIMITS.backupBytes, /\.json$/i,
    new Set(["application/json", "text/plain"]), "backup JSON");
  let incoming;
  try { incoming = JSON.parse(await file.text()); }
  catch { throw error("O arquivo não contém um backup JSON válido."); }
  assertSafeJson(incoming);
  if (!incoming || incoming.format !== "atheneum-backup" || incoming.version !== 1 ||
      !incoming.state || !Array.isArray(incoming.state.books) ||
      (incoming.files !== undefined && !Array.isArray(incoming.files)))
    throw error("Este arquivo não é um backup compatível do Atheneum.");
  incoming.files ??= [];
  for (const book of incoming.state.books) {
    if (typeof book.cover !== "string" || !book.cover.startsWith("data:")) continue;
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(book.cover);
    if (!match) throw error("O backup contém uma capa em formato não permitido.");
    const bytes = decodeBase64(match[2], UPLOAD_LIMITS.coverBytes);
    book.cover = await prepareCover(new Blob([bytes], { type: match[1] }));
  }
  const references = new Map(incoming.state.books.filter((book) => book.file)
    .map((book) => [book.file.id, book.file]));
  const provided = new Set();
  let totalPdfBytes = 0;
  for (const embedded of incoming.files) {
    const meta = references.get(embedded?.id);
    if (!incoming.filesIncluded || !meta || provided.has(embedded.id))
      throw error("Há PDFs repetidos ou sem livro correspondente no backup.");
    provided.add(embedded.id);
    const bytes = decodeBase64(embedded.data, UPLOAD_LIMITS.pdfBytes);
    totalPdfBytes += bytes.length;
    if (totalPdfBytes > UPLOAD_LIMITS.backupPdfBytes)
      throw error("Os PDFs deste backup ultrapassam o limite total de 100 MB.");
    validatePdfBytes(bytes);
    if (meta.size !== bytes.length || meta.mime !== "application/pdf")
      throw error("Os metadados de um PDF não correspondem ao arquivo do backup.");
  }
  if (incoming.filesIncluded && provided.size !== references.size)
    throw error("O backup completo não contém todos os PDFs da biblioteca.");
  return JSON.stringify(incoming);
}
