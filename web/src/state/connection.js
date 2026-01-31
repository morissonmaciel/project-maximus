import { createStore } from '@bunnix/redux';

let wsSend = null;
export function setWsSend(fn) {
  wsSend = fn;
}

export const connectionStore = createStore({
  isConnected: false,
  isConnecting: false,
  error: null,
  latency: 0,
  provider: null,
  providerReady: false,
  currentModel: null,
  anthropicConfigured: false,
  authType: null,
  ollamaReachable: null,
  ollamaModel: null,
  providerSelectorOpen: false,
  providerSelectorPrompted: false,
  providerList: [],
  selectedProvider: null
}, {
  setConnected: (state, { value }) => ({ ...state, isConnected: value }),
  setConnecting: (state, { value }) => ({ ...state, isConnecting: value }),
  setError: (state, { value }) => ({ ...state, error: value }),
  setLatency: (state, { value }) => ({ ...state, latency: value }),
  setProvider: (state, { value }) => ({ ...state, provider: value }),
  setProviderReady: (state, { value }) => ({ ...state, providerReady: value }),
  setCurrentModel: (state, { value }) => ({ ...state, currentModel: value }),
  setAnthropicConfigured: (state, { value }) => ({ ...state, anthropicConfigured: value }),
  setAuthType: (state, { value }) => ({ ...state, authType: value }),
  setOllamaReachable: (state, { value }) => ({ ...state, ollamaReachable: value }),
  setOllamaModel: (state, { value }) => ({ ...state, ollamaModel: value }),
  updateStatus: (state, { status }) => ({ ...state, ...status }),
  openProviderSelector: (state) => ({ ...state, providerSelectorOpen: true }),
  closeProviderSelector: (state) => ({ ...state, providerSelectorOpen: false }),
  markProviderSelectorPrompted: (state) => ({ ...state, providerSelectorPrompted: true }),
  setProviderList: (state, { providers, currentProvider }) => ({
    ...state,
    providerList: providers || [],
    selectedProvider: currentProvider || state.selectedProvider
  }),
  setSelectedProvider: (state, { value }) => ({ ...state, selectedProvider: value })
});

// Export derived atoms using .map() for reactivity
export const isConnected = connectionStore.state.map(s => s.isConnected);
export const isConnecting = connectionStore.state.map(s => s.isConnecting);
export const connectionError = connectionStore.state.map(s => s.error);
export const latency = connectionStore.state.map(s => s.latency);
export const provider = connectionStore.state.map(s => s.provider);
export const providerReady = connectionStore.state.map(s => s.providerReady);
export const currentModel = connectionStore.state.map(s => s.currentModel);
export const anthropicConfigured = connectionStore.state.map(s => s.anthropicConfigured);
export const authType = connectionStore.state.map(s => s.authType);
export const ollamaReachable = connectionStore.state.map(s => s.ollamaReachable);
export const ollamaModel = connectionStore.state.map(s => s.ollamaModel);
export const providerSelectorOpen = connectionStore.state.map(s => s.providerSelectorOpen);
export const providerList = connectionStore.state.map(s => s.providerList);
export const selectedProvider = connectionStore.state.map(s => s.selectedProvider);
