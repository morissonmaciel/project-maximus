import { configState } from './state.js';
import { loadConfigFromFile, saveConfig as saveConfigToFile } from './io.js';
import { loadProvidersConfig, getProvidersConfig } from './providers-config.js';
import { normalizeConfig } from './normalize.js';
import { applyConfig } from './apply.js';
import * as providerHelpers from './providers.js';
import * as runtimeHelpers from './runtime.js';

export function loadConfig() {
  const rawConfig = loadConfigFromFile();
  const normalized = normalizeConfig(rawConfig);
  Object.assign(configState, normalized);

  // Load provider configuration
  loadProvidersConfig();

  const clients = applyConfig(configState);
  configState.anthropicClient = clients.anthropicClient;
  configState.ollamaClient = clients.ollamaClient;
}

export function saveConfig() {
    saveConfigToFile(configState);
}

export function updateConfig(updates) {
  Object.assign(configState, updates);
  
  const clients = applyConfig(configState);
  configState.anthropicClient = clients.anthropicClient;
  configState.ollamaClient = clients.ollamaClient;
  
  saveConfig();
}

export function getConfigState() {
    return { ...configState };
}

export const buildStatusSnapshot = (runtimeState) => providerHelpers.buildStatusSnapshot(configState, runtimeState, getProvidersConfig());
export const buildConfigurationSnapshot = (runtimeState, gatewayState) => providerHelpers.buildConfigurationSnapshot({ configState, runtimeState, gatewayState }, getProvidersConfig());
export const buildSettingsSnapshot = (runtimeState) => providerHelpers.buildSettingsSnapshot(configState, runtimeState, getProvidersConfig());
export const refreshOllamaStatus = async () => runtimeHelpers.refreshOllamaStatus(configState.ollamaClient);
export const getLastOllamaStatus = () => runtimeHelpers.getLastOllamaStatus();
export const ensureSessionId = () => runtimeHelpers.ensureSessionId(configState, updateConfig);
export const updateProvider = (provider) => runtimeHelpers.updateProvider(provider, updateConfig);
export const updateSystemConfig = (partial) => runtimeHelpers.updateSystemConfig(partial, configState, updateConfig);
export { getProvidersConfig, isProviderEnabled, getProviderModels, validateProviderAndModel } from './providers-config.js';


// Initial load
loadConfig();
