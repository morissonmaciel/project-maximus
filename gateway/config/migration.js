/**
 * Configuration Migration Utilities
 *
 * Handles one-time migrations when config schema changes
 */

import { saveConfig as saveConfigToFile } from './io.js';
import { getProviderPreferredModel } from './runtime.js';

/**
 * Migrates OAuth credentials from anthropic provider to claude-code provider
 * This is a one-time migration for existing users who have OAuth credentials
 * stored under the anthropic provider.
 *
 * @param {Object} configState - Current configuration state
 * @returns {boolean} - True if migration was performed, false otherwise
 */
export function migrateAnthropicOAuthToClaudeCode(configState) {
  const anthropicCreds = configState.anthropicCredentials;

  // Check if Anthropic has OAuth credentials that need migration
  if (anthropicCreds?.type === 'oauth') {
    console.log('[Migration] Migrating Anthropic OAuth to Claude Code provider...');

    // Move OAuth credentials to Claude Code
    configState.claudeCodeCredentials = {
      type: 'oauth',
      accessToken: anthropicCreds.accessToken,
      refreshToken: anthropicCreds.refreshToken,
      expiresAt: anthropicCreds.expiresAt
    };

    // Clear OAuth from Anthropic (set to null, not apiKey)
    configState.anthropicCredentials = { type: null };

    // If current provider is anthropic, switch to claude-code
    if (configState.provider === 'anthropic') {
      configState.provider = 'claude-code';
      console.log('[Migration] Switched active provider from anthropic to claude-code');
    }

    // Save migrated config
    saveConfigToFile(configState);

    console.log('[Migration] OAuth credentials migrated to Claude Code provider');
    return true;
  }

  return false;
}

/**
 * Migrates currentModel to per-provider preferences
 * Sets the currentModel as the preferred model for the current provider
 *
 * @param {Object} configState - Current configuration state
 * @returns {boolean} - True if migration was performed, false otherwise
 */
export function migrateCurrentModelToProviderPreferences(configState) {
  const currentProvider = configState.provider;
  const currentModel = configState.currentModel;

  // Only migrate if we have both a current provider and model
  if (!currentProvider || !currentModel) {
    return false;
  }

  // Check if the provider already has a preferred model
  const hasPreference = getProviderPreferredModel(currentProvider, configState);
  if (hasPreference) {
    return false; // Already migrated
  }

  // Set the current model as the provider's preference
  console.log(`[Migration] Setting ${currentModel} as preferred model for ${currentProvider}`);

  switch (currentProvider) {
    case 'anthropic':
      configState.anthropicPreferredModel = currentModel;
      break;
    case 'claude-code':
      configState.claudeCodePreferredModel = currentModel;
      break;
    case 'openai-codex':
      configState.openaiCodexPreferredModel = currentModel;
      break;
    case 'kimi':
      configState.kimiPreferredModel = currentModel;
      break;
    case 'nvidia':
      configState.nvidiaPreferredModel = currentModel;
      break;
    case 'ollama':
      // Ollama already stores model in ollamaConfig.model
      break;
  }

  saveConfigToFile(configState);
  return true;
}
