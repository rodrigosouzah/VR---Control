import { DOCUMENT_DATABASE, IS_DEMO } from './runtime';
const DATABASE = DOCUMENT_DATABASE;
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível acessar o armazenamento de anexos.'));
  });
}
export async function saveDocument(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('O anexo deve ter até 5 MB.');
  if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use PDF, PNG, JPG ou WebP.');
  const db = await database(); const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    transaction.objectStore('documents').put({ id, blob: file });
    transaction.oncomplete = resolve; transaction.onerror = () => reject(new Error('Não foi possível salvar o anexo.'));
  }).finally(() => db.close());
  return { id, name: file.name, type: file.type, size: file.size };
}
export async function openDocument(document) {
  const db = await database();
  const value = await new Promise((resolve, reject) => {
    const request = db.transaction('documents').objectStore('documents').get(document.id);
    request.onsuccess = () => resolve(request.result); request.onerror = reject;
  }).finally(() => db.close());
  if (!value?.blob) throw new Error('O arquivo não está neste navegador. Anexe-o novamente ao registro.');
  const url = URL.createObjectURL(value.blob);
  const a = window.document.createElement('a'); a.href = url; a.download = document.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}
export async function documentBlob(id) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('documents').objectStore('documents').get(id);
    request.onsuccess = () => resolve(request.result?.blob || null); request.onerror = reject;
  }).finally(() => db.close());
}

export async function installDemoDocuments(documents, reset = false) {
  if (!IS_DEMO) throw new Error('Anexos fictícios só podem ser gravados na demonstração.');
  const db = await database();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    if (reset) store.clear();
    for (const document of documents) store.put(document);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(new Error('Não foi possível preparar os anexos fictícios.'));
  }).finally(() => db.close());
}
