/* Bundled catalogue: source transcription lives in data/personal-library.json.
 * The store owns migration and commits the complete import in one transaction.
 */
export const COLLECTION_RELEASE = 'personal-library-2026-10-09';
export const COLLECTION_TOTAL = 137;
export const COLLECTION_SECTIONS = Object.freeze([
  Object.freeze({ name: 'Clássicos', count: 59 }),
  Object.freeze({ name: 'Ficção', count: 25 }),
  Object.freeze({ name: 'Carreira', count: 53 })
]);
export const COLLECTION_SUMMARY = Object.freeze({
  id: COLLECTION_RELEASE,
  name: 'Biblioteca pessoal',
  source: 'Biblioteca.md',
  sourceDate: '2026-09-27',
  total: COLLECTION_TOTAL,
  sections: COLLECTION_SECTIONS
});

export async function loadPersonalCollection(store) {
  if (store.state.imports.includes(COLLECTION_RELEASE)) {
    return { added: 0, matched: 0, total: COLLECTION_TOTAL, alreadyImported: true };
  }
  const response = await fetch(new URL('../data/personal-library.json', import.meta.url));
  if (!response.ok) throw new Error('Não foi possível abrir a coleção pessoal. Recarregue a página para tentar novamente.');
  const collection = await response.json();
  if (collection.id !== COLLECTION_RELEASE || collection.total !== COLLECTION_TOTAL || !Array.isArray(collection.books) || collection.books.length !== COLLECTION_TOTAL) {
    throw new Error('A coleção pessoal está incompleta. Os dados da biblioteca foram preservados.');
  }
  return store.importCollection(collection);
}
