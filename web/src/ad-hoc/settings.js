/**
 * Settings and configuration handlers
 * Manages settings, providers, oauth, apiKey, and related events
 */

import { on, send } from '../lib/websocket.js';
import { settingsStore } from '../state/settings.js';
import { connectionStore } from '../state/connection.js';

export function installSettingsHandlers() {
  on('settings', (data) => {
    settingsStore.setSettings({ settings: data });
  });

  on('providers', (data) => {
    settingsStore.setProviders({ providers: data });
    connectionStore.setProviderList({
      providers: data.providers || [],
      currentProvider: data.currentProvider || null
    });

    // Merge providers into settings
    const currentSettings = settingsStore.state.get().settings || {};
    const providersMap = {};
    (data.providers || []).forEach(p => {
      providersMap[p.id === 'openai-codex' ? 'openai-codex' : p.id] = p;
    });

    settingsStore.setSettings({
      settings: {
        ...currentSettings,
        providers: {
          ...(currentSettings.providers || {}),
          ...providersMap
        }
      }
    });
  });

  on('docsList', (data) => {
    settingsStore.setDocs({ docs: data.docs || [] });
  });

  on('oauthUrl', (data) => {
    const state = settingsStore.state.get();
    if (state.activePanel === 'openai-codex') {
      settingsStore.setCodexOAuthUrl({ url: data.url });
    } else {
      settingsStore.setOAuthUrl({ url: data.url });
    }
    settingsStore.setStartingOAuth({ value: false });
  });

  on('apiKeySet', (data) => {
    settingsStore.setSaving({ value: false });
    settingsStore.setCompletingOAuth({ value: false });
    if (data.success) {
      settingsStore.resetAuth();
    }
  });

  on('braveApiKeySet', (data) => {
    settingsStore.setSaving({ value: false });
    if (data.success) {
      settingsStore.setBraveApiKey({ value: '' });
    }
  });

  on('ollamaModelSet', () => {
    send({ type: 'getSettings' });
  });

  on('providerSet', (data) => {
    if (data?.provider) {
      connectionStore.setProvider({ value: data.provider });
      connectionStore.setSelectedProvider({ value: data.provider });
    }
    connectionStore.closeProviderSelector();
  });
}
