import { configState } from './state.js';
import { loadConfigFromFile, saveConfig as saveConfigToFile } from './io.js';
import { loadProvidersConfig, getProvidersConfig, getProviderModels } from './providers-config.js';
import { normalizeConfig } from './normalize.js';
import { applyConfig } from './apply.js';
import { migrateAnthropicOAuthToClaudeCode, migrateCurrentModelToProviderPreferences } from './migration.js';
import * as providerHelpers from './providers.js';
import * as runtimeHelpers from './runtime.js';

export function loadConfig() {
  const rawConfig = loadConfigFromFile();
  const normalized = normalizeConfig(rawConfig);
  Object.assign(configState, normalized);

  // Run migrations if needed (only affects users upgrading from old version)
  const oauthMigrated = migrateAnthropicOAuthToClaudeCode(configState);
  const modelMigrated = migrateCurrentModelToProviderPreferences(configState);

  if (oauthMigrated || modelMigrated) {
    console.log('[Config] Configuration migrated successfully');
  }

  // Load provider configuration
  loadProvidersConfig();

  const clients = applyConfig(configState);
  configState.anthropicClient = clients.anthropicClient;
  configState.claudeCodeClient = clients.claudeCodeClient;
  configState.ollamaClient = clients.ollamaClient;
}

export function saveConfig() {
    saveConfigToFile(configState);
}

export function updateConfig(updates) {
  Object.assign(configState, updates);
  
  const clients = applyConfig(configState);
  configState.anthropicClient = clients.anthropicClient;
  configState.claudeCodeClient = clients.claudeCodeClient;
  configState.ollamaClient = clients.ollamaClient;
  
  saveConfig();
}

export function getConfigState() {
    return { ...configState };
}

export const buildStatusSnapshot = (runtimeState) => providerHelpers.buildStatusSnapshot(configState, runtimeState, getProvidersConfig());
export const buildConfigurationSnapshot = (runtimeState, gatewayState) => providerHelpers.buildConfigurationSnapshot({ configState, runtimeState, gatewayState }, getProvidersConfig());
export const buildConfigSnapshot = (runtimeState) => providerHelpers.buildConfigSnapshot(configState, runtimeState);
export const buildCatalogSnapshot = (runtimeState) => providerHelpers.buildCatalogSnapshot(runtimeState, getProvidersConfig());
export const buildSettingsSnapshot = (runtimeState) => providerHelpers.buildSettingsSnapshot(configState, runtimeState, getProvidersConfig());
export const refreshOllamaStatus = async () => runtimeHelpers.refreshOllamaStatus(configState.ollamaClient);
export const getLastOllamaStatus = () => runtimeHelpers.getLastOllamaStatus();
export const ensureSessionId = () => runtimeHelpers.ensureSessionId(configState, updateConfig);
export const updateProvider = (provider) => runtimeHelpers.updateProvider(provider, updateConfig, configState, getProviderModels);
export const updateSystemConfig = (partial) => runtimeHelpers.updateSystemConfig(partial, configState, updateConfig);
export const updateProviderModel = (providerId, model) => runtimeHelpers.updateProviderModel(providerId, model, updateConfig);
export const getProviderPreferredModel = (providerId) => runtimeHelpers.getProviderPreferredModel(providerId, configState);
export { getProvidersConfig, isProviderEnabled, getProviderModels, validateProviderAndModel } from './providers-config.js';


// Initial load
loadConfig();
