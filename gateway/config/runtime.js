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

export function updateProvider(nextProvider, updateConfig, configState, getProviderModels) {
    if (!['anthropic', 'claude-code', 'ollama', 'openai-codex', 'kimi', 'nvidia'].includes(nextProvider)) {
        throw new Error(`Unknown provider: ${nextProvider}`);
    }

    const updates = { provider: nextProvider };

    // Load the provider's preferred model (if it has one)
    const preferredModel = getProviderPreferredModel(nextProvider, configState);

    if (preferredModel) {
        // Use the provider's saved preference
        updates.currentModel = preferredModel;
        console.log(`[Config] Switching to provider '${nextProvider}' with preferred model '${preferredModel}'`);
    } else {
        // Fallback to first available model for the provider
        const models = getProviderModels(nextProvider);
        if (models && models.length > 0) {
            updates.currentModel = models[0];
            console.log(`[Config] Switching to provider '${nextProvider}' with default model '${models[0]}'`);
        } else {
            console.log(`[Config] Switching to provider '${nextProvider}' (no models available)`);
        }
    }

    updateConfig(updates);
}

export function updateSystemConfig(partial, configState, updateConfig) {
    const newSystemConfig = { ...(configState.systemConfig || {}), ...partial };
    updateConfig({ systemConfig: newSystemConfig });
}

/**
 * Update provider's preferred model
 * @param {string} providerId - Provider ID (e.g., 'anthropic', 'claude-code')
 * @param {string} model - Model ID
 * @param {Function} updateConfig - Config update function
 */
export function updateProviderModel(providerId, model, updateConfig) {
  const updates = {};

  switch (providerId) {
    case 'anthropic':
      updates.anthropicPreferredModel = model;
      break;
    case 'claude-code':
      updates.claudeCodePreferredModel = model;
      break;
    case 'openai-codex':
      updates.openaiCodexPreferredModel = model;
      break;
    case 'kimi':
      updates.kimiPreferredModel = model;
      break;
    case 'nvidia':
      updates.nvidiaPreferredModel = model;
      break;
    case 'ollama':
      updates.ollamaConfig = { ...updateConfig.ollamaConfig, model };
      break;
    default:
      console.warn(`[Config] Unknown provider: ${providerId}`);
      return;
  }

  updateConfig(updates);
}

/**
 * Get provider's preferred model
 * @param {string} providerId - Provider ID
 * @param {Object} configState - Config state object
 * @returns {string|null} Model ID or null
 */
export function getProviderPreferredModel(providerId, configState) {
  switch (providerId) {
    case 'anthropic':
      return configState.anthropicPreferredModel;
    case 'claude-code':
      return configState.claudeCodePreferredModel;
    case 'openai-codex':
      return configState.openaiCodexPreferredModel;
    case 'kimi':
      return configState.kimiPreferredModel;
    case 'nvidia':
      return configState.nvidiaPreferredModel;
    case 'ollama':
      return configState.ollamaConfig.model;
    default:
      return null;
  }
}
