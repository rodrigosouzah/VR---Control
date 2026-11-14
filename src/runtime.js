// The HTML entry chooses the mode. A URL query can never switch production data.
export const IS_DEMO = typeof document !== 'undefined' && document.documentElement.dataset.appMode === 'demo';
export const STORAGE_KEY = IS_DEMO ? 'vr-control-demo-v1' : 'vr-control-v1';
export const DOCUMENT_DATABASE = IS_DEMO ? 'vr-control-demo-documents' : 'vr-control-documents';
export const CACHE_PREFIX = IS_DEMO ? 'vr-demo' : 'vr';
export let demoDefaults = null;
let resetHandler;
export function configureDemo(defaults, reset) { demoDefaults = defaults; resetHandler = reset; }
export async function resetDemo() {
  if (!IS_DEMO || !resetHandler) throw new Error('Restauração disponível somente na demonstração.');
  await resetHandler();
}
