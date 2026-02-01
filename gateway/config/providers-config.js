import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVIDERS_CONFIG_PATH = path.join(__dirname, 'providers-config.json');

let providersConfig = null;

/**
 * Load provider configuration from JSON file
 */
export function loadProvidersConfig() {
  try {
    if (fs.existsSync(PROVIDERS_CONFIG_PATH)) {
      const rawConfig = JSON.parse(fs.readFileSync(PROVIDERS_CONFIG_PATH, 'utf-8'));
      providersConfig = rawConfig.providers || {};
      console.log('[Gateway] Provider configuration loaded');
    } else {
      console.warn('[Gateway] Provider config file not found, using defaults');
      providersConfig = {};
    }
  } catch (err) {
    console.error('[Gateway] Failed to load provider config:', err.message);
    providersConfig = {};
  }
  return providersConfig;
}

/**
 * Get the loaded providers configuration
 */
export function getProvidersConfig() {
  if (!providersConfig) {
    loadProvidersConfig();
  }
  return providersConfig || {};
}

/**
 * Check if a provider is enabled
 */
export function isProviderEnabled(providerId) {
  const config = getProvidersConfig();
  const provider = config[providerId];
  if (!provider) return true; // Default to enabled if not in config
  return provider.enabled !== false;
}

/**
 * Get the list of models for a provider
 */
export function getProviderModels(providerId) {
  const config = getProvidersConfig();
  const provider = config[providerId];
  if (!provider) return [];
  return provider.models || [];
}

/**
 * Validate that a provider and model are valid and enabled
 * Returns { valid: boolean, error: string | null }
 */
export function validateProviderAndModel(providerId, modelId) {
  const config = getProvidersConfig();

  // Check if provider exists in config
  const provider = config[providerId];
  if (!provider) {
    return { valid: false, error: `Provider '${providerId}' not found in configuration` };
  }

  // Check if provider is enabled
  if (provider.enabled === false) {
    return { valid: false, error: `Provider '${providerId}' is currently disabled` };
  }

  // For Ollama, models are dynamic, so we don't validate against the list
  if (providerId === 'ollama') {
    return { valid: true, error: null };
  }

  // Check if model is in the provider's model list
  if (modelId && provider.models && provider.models.length > 0) {
    if (!provider.models.includes(modelId)) {
      return { valid: false, error: `Model '${modelId}' is not supported by provider '${providerId}'` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Get list of enabled providers
 */
export function getEnabledProviders() {
  const config = getProvidersConfig();
  return Object.entries(config)
    .filter(([_, provider]) => provider.enabled !== false)
    .map(([id, provider]) => ({
      id,
      ...provider
    }));
}
