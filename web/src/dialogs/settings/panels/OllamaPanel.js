import Bunnix from '@bunnix/core';
import { send, formatValue } from '../helpers.js';
import './OllamaPanel.css';

const { div, h4, p, select, option, span } = Bunnix;

export function OllamaPanel({ settings: ollamaSettingsData, providers: ollamaProvidersData }) {
  const ollamaProviders = ollamaProvidersData?.providers?.find(p => p.id === 'ollama');
  const ollamaSettings = ollamaSettingsData?.providers?.ollama || {};

  const ollamaData = {
    ...ollamaSettings,
    ...ollamaProviders,
    models: ollamaProviders?.models || ollamaSettings.models || [],
    model: ollamaProviders?.model || ollamaSettings.model,
    reachable: ollamaProviders?.reachable ?? ollamaSettings.reachable,
    error: ollamaProviders?.error || ollamaSettings.error
  };

  const usage = ollamaData.usage;
  const models = ollamaData.models || [];
  const currentModel = ollamaData.model;
  const reachable = ollamaData.reachable;

  let statusText = 'Status: unknown';
  if (reachable === false) {
    statusText = `Status: unavailable (${ollamaData.error || 'unknown error'})`;
  } else if (reachable === true) {
    statusText = 'Status: reachable';
  }

  const handleModelChange = (e) => {
    const model = e.target.value;
    if (model) {
      send({ type: 'setOllamaModel', model });
    }
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Ollama Model'),
      p({ class: 'settings-muted' }, 'Select a local model to use for chat.'),
      select({
        value: currentModel || '',
        change: handleModelChange,
        disabled: !reachable
      },
        !currentModel && option({ value: '' }, 'Select a model...'),
        ...models.map(m => {
          const name = m?.name || m?.model || String(m);
          return option({ value: name, selected: name === currentModel }, name);
        }),
        models.length === 0 && option({ value: '' }, 'No models available')
      ),
      p({ class: 'settings-muted' }, statusText)
    ),

    div({ class: 'settings-section' },
      h4('Usage (Last Response)'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Model'),
        span({ class: 'settings-value' }, formatValue(ollamaData.model, 'Unknown'))
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Input tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.input_tokens) : 'No usage yet')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Output tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.output_tokens) : '--')
      )
    )
  );
}
