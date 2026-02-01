import Bunnix, { ForEach, Show } from '@bunnix/core';
import {
  isModelSelectorOpen,
  availableModels,
  selectedModel,
  modelsLoading,
  currentModelProvider,
  selectModel,
  closeModelSelector
} from '../state/models.js';
import './ModelSelector.css';

const { div, h3, p, button, span } = Bunnix;

export function ModelSelector() {
  const isOpen = isModelSelectorOpen.map(o => o);
  const models = availableModels.map(m => m || []);
  const loading = modelsLoading.map(l => l);
  const provider = currentModelProvider.map(p => p);
  const selected = selectedModel.map(m => m);

  const close = () => closeModelSelector();

  const handleSelect = (modelId) => {
    const currentProvider = provider.get();
    selectModel(modelId, currentProvider);
  };

  return Show(isOpen, () =>
    div({ class: 'modal-overlay active' },
      div({ class: 'modal model-selector' },
        h3('Choose Model'),
        Show(provider, (providerValue) =>
          providerValue ? p({}, `Provider: ${providerValue}`) : null
        ),
        Show(loading, () =>
          p({}, 'Loading models...')
        ),
        Show(Bunnix.Compute([loading, models], (isLoading, list) => !isLoading && list.length === 0), () =>
          p({}, 'No models available for this provider.')
        ),
        div({ class: 'model-grid' },
          ForEach(models, (item) => item, (item) => {
            const isSelected = Bunnix.Compute([selected], (sel) => sel === item);
            const cardClass = isSelected.map(sel =>
              `model-card ${sel ? 'selected' : ''}`
            );
            return div({
              class: cardClass,
              click: () => handleSelect(item)
            },
              div({ class: 'model-title' }, item),
              Show(isSelected, () =>
                span({ class: 'model-check' }, '✓')
              )
            );
          })
        ),
        div({ class: 'modal-actions' },
          button({ class: 'modal-btn cancel', click: close }, 'Cancel')
        )
      )
    )
  );
}
