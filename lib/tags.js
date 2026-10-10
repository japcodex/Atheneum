import { esc, icon } from "./ui.js";

export const tagColor = (value) =>
  /^#[\da-f]{6}$/i.test(value || "") ? value : "#805d43";

export function tagChip(tag, { clickable = false, active = false } = {}) {
  const attributes = `class="book-tag ${active ? "active" : ""}" style="--tag-color:${tagColor(tag.color)}"`;
  const content = `<span class="tag-dot" aria-hidden="true"></span>${esc(tag.name)}`;
  return clickable
    ? `<button ${attributes} data-action="tag-filter" data-id="${esc(tag.id)}" aria-pressed="${active}">${content}</button>`
    : `<span ${attributes}>${content}</span>`;
}

export function bookTags(book, tags, clickable = false) {
  const selected = tags.filter((tag) => (book.tagIds || []).includes(tag.id));
  return selected.length
    ? `<div class="book-tags" aria-label="Tags de ${esc(book.title)}">${selected.map((tag) => tagChip(tag, { clickable })).join("")}</div>`
    : "";
}

export function tagCheckboxes(book, tags) {
  return `<fieldset class="tag-assignment full-width"><legend>Tags deste livro</legend>${
    tags.length
      ? `<div class="checkbox-group">${tags.map((tag) => `<label style="--tag-color:${tagColor(tag.color)}"><input type="checkbox" name="tagIds" value="${esc(tag.id)}" ${(book.tagIds || []).includes(tag.id) ? "checked" : ""}><span class="tag-dot" aria-hidden="true"></span>${esc(tag.name)}</label>`).join("")}</div>`
      : '<p class="form-help">Crie suas tags em Biblioteca → Gerenciar tags e escolha-as aqui.</p>'
  }<span class="field-error" data-error="tagIds"></span></fieldset>`;
}

export function renderTagManager(tags) {
  return `<p class="detail-description">Pequenas marcas para encontrar suas histórias. Nome e cor ficam iguais em todos os livros que usam a tag.</p><div class="tag-manager">${tags.length ? tags.map((tag) => `<div class="tag-manager-row">${tagChip(tag)}<button class="text-button" data-action="edit-tag" data-id="${esc(tag.id)}" aria-label="Editar tag ${esc(tag.name)}">Editar ↗</button></div>`).join("") : '<p class="subtle-message">Nenhuma tag criada. Comece com um tema, uma prioridade ou um sentimento.</p>'}</div><div class="form-actions"><span class="form-help">Um livro pode receber várias tags.</span><button class="primary-button" data-action="add-tag">Criar tag ${icon("plus")}</button></div>`;
}

export function renderTagForm(tag) {
  return `<form id="tag-form"><input type="hidden" name="id" value="${esc(tag?.id || "")}"><div class="book-form"><div class="field"><label for="tag-name">Nome da tag *</label><input id="tag-name" name="name" value="${esc(tag?.name || "")}" maxlength="40" placeholder="Ex.: Para reler" required><span class="field-error" data-error="name"></span></div><div class="field"><label for="tag-color">Cor da tag</label><input id="tag-color" type="color" name="color" value="${tagColor(tag?.color)}"><span class="field-error" data-error="color"></span></div></div><p class="storage-message">A cor identifica a marca; o nome permanece visível para facilitar a leitura.</p><div class="form-actions">${tag ? `<button type="button" class="text-button danger-button" data-action="delete-tag" data-id="${esc(tag.id)}">Excluir tag</button>` : "<span></span>"}<button class="primary-button" type="submit">Salvar tag ${icon("arrow")}</button></div></form>`;
}
