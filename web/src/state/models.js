import { createStore } from '@bunnix/redux';

let wsSend = null;
export function setWsSend(fn) {
  wsSend = fn;
}

function send(msg) {
  if (wsSend) wsSend(msg);
}

export const modelsStore = createStore({
  // Model selector dialog state
  isModelSelectorOpen: false,
  selectedModel: null,

  // Available models for current provider
  availableModels: [],
  modelsLoading: false,

  // Current provider for model selection context
  provider: null
}, {
  openModelSelector: (state, { provider, currentModel }) => ({
    ...state,
    isModelSelectorOpen: true,
    provider,
    selectedModel: currentModel || null,
    modelsLoading: true
  }),

  closeModelSelector: (state) => ({
    ...state,
    isModelSelectorOpen: false,
    modelsLoading: false
  }),

  setSelectedModel: (state, { model }) => ({
    ...state,
    selectedModel: model
  }),

  setAvailableModels: (state, { models }) => ({
    ...state,
    availableModels: models || [],
    modelsLoading: false
  }),

  setModelsLoading: (state, { loading }) => ({
    ...state,
    modelsLoading: loading
  }),

  setProvider: (state, { provider }) => ({
    ...state,
    provider
  })
});

// Export derived atoms
export const isModelSelectorOpen = modelsStore.state.map(s => s.isModelSelectorOpen);
export const selectedModel = modelsStore.state.map(s => s.selectedModel);
export const availableModels = modelsStore.state.map(s => s.availableModels);
export const modelsLoading = modelsStore.state.map(s => s.modelsLoading);
export const currentModelProvider = modelsStore.state.map(s => s.provider);

// Helper functions
export function openModelSelector(provider, currentModel) {
  modelsStore.openModelSelector({ provider, currentModel });
  // Fetch models for the provider
  send({ type: 'getModels', provider });
}

export function closeModelSelector() {
  modelsStore.closeModelSelector();
}

export function selectModel(model, provider) {
  modelsStore.setSelectedModel({ model });
  // Send to gateway
  send({ type: 'setModel', model, provider });
  // Close the selector
  modelsStore.closeModelSelector();
}

export function setAvailableModels(models) {
  modelsStore.setAvailableModels({ models });
}
