import crypto from 'node:crypto';

let lastOllamaStatus = null;

export async function refreshOllamaStatus(ollamaClient) {
  try {
    const list = await ollamaClient.list();
    const models = Array.isArray(list?.models) ? list.models : [];
    lastOllamaStatus = {
      reachable: true,
      models,
      error: null
    };
  } catch (err) {
    lastOllamaStatus = {
      reachable: false,
      models: [],
      error: err.message
    };
  }
  return lastOllamaStatus;
}

export function getLastOllamaStatus() {
    return lastOllamaStatus;
}

export function ensureSessionId(configState, updateConfig) {
  if (!configState.lastSessionId) {
    updateConfig({ lastSessionId: crypto.randomUUID() });
    return true; // was created
  }
  return false; // already existed
}

export function updateProvider(nextProvider, updateConfig) {
    if (!['anthropic', 'ollama', 'openai-codex', 'kimi', 'nvidia'].includes(nextProvider)) {
        throw new Error(`Unknown provider: ${nextProvider}`);
    }
    updateConfig({ provider: nextProvider });
}

export function updateSystemConfig(partial, configState, updateConfig) {
    const newSystemConfig = { ...(configState.systemConfig || {}), ...partial };
    updateConfig({ systemConfig: newSystemConfig });
}
