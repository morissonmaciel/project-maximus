import Bunnix from '@bunnix/core';
import { send, settingsStore, formatValue } from '../helpers.js';
import { connectionStore } from '../../../state/connection.js';
import { openModelSelector } from '../../../state/models.js';
import './NvidiaPanel.css';

const { div, h4, p, button, input, span } = Bunnix;

export function NvidiaPanel({ settings: nvidiaSettings }) {
  const nvidiaData = nvidiaSettings?.providers?.nvidia || {};
  const usage = nvidiaData.usage;
  const limits = nvidiaData.limits || {};
  const currentModelValue = connectionStore.state.get().currentModel;
  const availableModels = nvidiaData.models || [];
  const displayModel = currentModelValue || nvidiaData.model || availableModels[0] || 'Unknown';

  const nvidiaKey = settingsStore.state.map(s => s.nvidiaApiKey);
  const isSaving = settingsStore.state.map(s => s.isSaving);

  const saveApiKey = () => {
    const apiKey = settingsStore.state.get().nvidiaApiKey?.trim();
    if (!apiKey) return;
    settingsStore.setSaving({ value: true });
    send({ type: 'setNvidiaApiKey', apiKey });
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Authentication'),
      p('Enter your NVIDIA API key.'),
      input({
        type: 'password',
        placeholder: 'nvidia-...',
        value: nvidiaKey,
        input: (e) => settingsStore.setNvidiaApiKey({ value: e.target.value }),
        keydown: (e) => { if (e.key === 'Enter') saveApiKey(); }
      }),
      div({ class: 'modal-actions auth-actions' },
        button({
          class: 'modal-btn save',
          click: saveApiKey
        }, isSaving.map(v => v ? 'Saving...' : 'Save Key'))
      )
    ),

    div({ class: 'settings-section' },
      h4('Model Selection'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Current Model'),
        span({ class: 'settings-value' }, formatValue(displayModel, 'Unknown'))
      ),
      div({ class: 'modal-actions', style: 'margin-top: 12px;' },
        button({
          class: 'modal-btn save',
          click: () => openModelSelector('nvidia', displayModel)
        }, 'Select Model')
      )
    ),

    div({ class: 'settings-section' },
      h4('Usage (Last Response)'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Max tokens'),
        span({ class: 'settings-value' }, formatValue(limits.maxTokens))
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
