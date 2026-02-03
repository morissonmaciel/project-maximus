import { createStore } from '@bunnix/redux';

// WebSocket send function (set by app.js)
let wsSend = null;

export function setWsSend(fn) {
  wsSend = fn;
}

function send(msg) {
  if (wsSend) wsSend(msg);
}

export const settingsStore = createStore({
  isOpen: false,
  activePanel: 'anthropic', // 'anthropic', 'openai-codex', 'kimi', 'nvidia', 'ollama', 'web', 'memory'
  authTab: 'apikey', // 'apikey', 'oauth'

  // OAuth state
  oauthStep: 1, // 1 or 2
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

  // Settings data from gateway
  settings: null,
  providers: null,
  docs: [],

  // Loading states
  isSaving: false,
  isStartingOAuth: false,
  isCompletingOAuth: false,
}, {
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

  // Data
  setSettings: (state, { settings }) => ({ ...state, settings }),
  setProviders: (state, { providers }) => ({ ...state, providers }),
  setDocs: (state, { docs }) => ({ ...state, docs }),

  // Loading states
  setSaving: (state, { value }) => ({ ...state, isSaving: value }),
  setStartingOAuth: (state, { value }) => ({ ...state, isStartingOAuth: value }),
  setCompletingOAuth: (state, { value }) => ({ ...state, isCompletingOAuth: value }),

  // Reset auth panels
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

// Export derived atoms
export const isSettingsOpen = settingsStore.state.map(s => s.isOpen);
export const activeSettingsPanel = settingsStore.state.map(s => s.activePanel);
export const authTab = settingsStore.state.map(s => s.authTab);
export const settings = settingsStore.state.map(s => s.settings);
export const providers = settingsStore.state.map(s => s.providers);
export const docs = settingsStore.state.map(s => s.docs);
export const currentModelFromSettings = settingsStore.state.map(s => s.settings?.currentModel || null);

// Helper functions
export function openSettings() {
  settingsStore.open();
  // Fetch data when opening settings
  send({ type: 'getSettings' });
  send({ type: 'getProviders' });
  send({ type: 'getDocs' });
}

export function updateProviders() {
  send({ type: 'getSettings' });
  send({ type: 'getProviders' });
}

export function closeSettings() {
  settingsStore.close();
}

export function setSettingsPanel(panel) {
  settingsStore.setPanel({ panel });
}

export function setAuthTab(tab) {
  settingsStore.setAuthTab({ tab });
}
