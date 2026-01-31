import { loadAwareness } from './load-awareness.js';
import { injectAwareness } from './inject-awareness.js';

const BOOTSTRAP_VERSION_KEY = 'memory_bootstrap_v26';

export async function applyAwareness(memoryStore, setGatewayState) {
  if (!memoryStore) {
    setGatewayState('ready', 'Gateway ready.');
    return;
  }

  const existing = memoryStore.getMeta(BOOTSTRAP_VERSION_KEY);
  if (existing) {
    setGatewayState('ready', 'Gateway ready.');
    return;
  }

  try {
    const items = loadAwareness();
    await injectAwareness(memoryStore, items, setGatewayState);
    memoryStore.setMeta(BOOTSTRAP_VERSION_KEY, String(Date.now()));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Gateway] Memory bootstrap failed: ${message}`);
  } finally {
    setGatewayState('ready', 'Gateway ready.');
  }
}
