import { createStore } from '@bunnix/redux';
import { send } from '../ws/client.js';

export const configStore = createStore({
  // Connection state
  isConnected: false,
  latency: 0,

  // User config snapshot (source of truth from gateway)
  currentProvider: null,
  currentModel: null,
  providers: {},
  system: {},

  // Settings dialog UI state
  isOpen: false,
  activePanel: 'anthropic',
  authTab: 'apikey',

  // OAuth state
  oauthStep: 1,
  oauthUrl: null,
  oauthCode: '',

  // Codex OAuth state
  codexOauthStep: 1,
  codexOauthUrl: null,
  codexOauthCode: '',

  // API Key inputs
  apiKey: '',
  kimiApiKey: '',
  nvidiaApiKey: '',
  braveApiKey: '',

  // Loading states
  isSaving: false,
  isStartingOAuth: false,
  isCompletingOAuth: false
}, {
  setConnected: (state, { value }) => ({ ...state, isConnected: value }),
  setLatency: (state, { value }) => ({ ...state, latency: value }),

  setConfig: (state, { config }) => ({
    ...state,
    currentProvider: config?.currentProvider ?? null,
    currentModel: config?.currentModel ?? null,
    providers: config?.providers || {},
    system: config?.system || {}
  }),

  open: (state) => ({ ...state, isOpen: true }),
  close: (state) => ({
    ...state,
    isOpen: false,
    oauthStep: 1,
    codexOauthStep: 1,
    oauthUrl: null,
    codexOauthUrl: null,
    isSaving: false,
    isStartingOAuth: false,
    isCompletingOAuth: false
  }),

  setPanel: (state, { panel }) => ({ ...state, activePanel: panel }),
  setAuthTab: (state, { tab }) => ({ ...state, authTab: tab }),

  // OAuth
  setOAuthStep: (state, { step }) => ({ ...state, oauthStep: step }),
  setOAuthUrl: (state, { url }) => ({ ...state, oauthUrl: url, oauthStep: 2 }),
  setOAuthCode: (state, { code }) => ({ ...state, oauthCode: code }),

  // Codex OAuth
  setCodexOAuthStep: (state, { step }) => ({ ...state, codexOauthStep: step }),
  setCodexOAuthUrl: (state, { url }) => ({ ...state, codexOauthUrl: url, codexOauthStep: 2 }),
  setCodexOAuthCode: (state, { code }) => ({ ...state, codexOauthCode: code }),

  // Inputs
  setApiKey: (state, { value }) => ({ ...state, apiKey: value }),
  setKimiApiKey: (state, { value }) => ({ ...state, kimiApiKey: value }),
  setNvidiaApiKey: (state, { value }) => ({ ...state, nvidiaApiKey: value }),
  setBraveApiKey: (state, { value }) => ({ ...state, braveApiKey: value }),

  // Loading states
  setSaving: (state, { value }) => ({ ...state, isSaving: value }),
  setStartingOAuth: (state, { value }) => ({ ...state, isStartingOAuth: value }),
  setCompletingOAuth: (state, { value }) => ({ ...state, isCompletingOAuth: value }),

  resetAuth: (state) => ({
    ...state,
    oauthStep: 1,
    oauthUrl: null,
    oauthCode: '',
    codexOauthStep: 1,
    codexOauthUrl: null,
    codexOauthCode: '',
    apiKey: '',
    kimiApiKey: '',
    nvidiaApiKey: '',
    isSaving: false,
    isStartingOAuth: false,
    isCompletingOAuth: false
  })
});

// Reactive selectors
export const isConnected = configStore.state.map(s => s.isConnected);
export const latency = configStore.state.map(s => s.latency);
export const currentProvider = configStore.state.map(s => s.currentProvider);
export const currentModel = configStore.state.map(s => s.currentModel);
export const providersConfig = configStore.state.map(s => s.providers);
export const systemConfig = configStore.state.map(s => s.system);
export const isSettingsOpen = configStore.state.map(s => s.isOpen);
export const activeSettingsPanel = configStore.state.map(s => s.activePanel);
export const authTab = configStore.state.map(s => s.authTab);

// Helper functions
export function openSettings() {
  configStore.open();
  send({ type: 'getConfig' });
  send({ type: 'getCatalog' });
}

export function closeSettings() {
  configStore.close();
}

export function setSettingsPanel(panel) {
  configStore.setPanel({ panel });
}

export function setAuthTab(tab) {
  configStore.setAuthTab({ tab });
}
