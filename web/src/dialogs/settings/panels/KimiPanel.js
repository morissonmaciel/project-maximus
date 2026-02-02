import Bunnix, { Show } from '@bunnix/core';
import { send, settingsStore, formatValue, resolveProviderModel } from '../helpers.js';
import { openModelSelector } from '../../../state/models.js';
import './KimiPanel.css';

const { div, h4, p, button, input, span } = Bunnix;

export function KimiPanel({ settings: kimiSettings }) {
  const state = settingsStore.state.get();
  const kimiData = kimiSettings?.providers?.kimi || {};
  const usage = kimiData.accumulatedUsage || kimiData.usage;
  const limits = kimiData.limits || {};
  const kimiKey = settingsStore.state.map(s => s.kimiApiKey);
  const isSaving = settingsStore.state.map(s => s.isSaving);
  const displayModel = resolveProviderModel(kimiData);
  const isConfigured = () => {
    const s = settingsStore.state.get();
    return s.settings?.providers?.kimi?.configured || false;
  };

  const saveApiKey = () => {
    const apiKey = settingsStore.state.get().kimiApiKey?.trim();
    if (!apiKey) return;
    settingsStore.setSaving({ value: true });
    send({ type: 'setKimiApiKey', apiKey });
  };

  const changeApiKey = () => {
    send({ type: 'clearApiKey', provider: 'kimi' });
  };

  const configured = settingsStore.state.map(s => s.settings?.providers?.kimi?.configured || false);

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Authentication'),
      p('Enter your Kimi Code API key.'),

      Show(configured, (isConfigured) => {
        if (isConfigured) {
          return div(null,
            div({ class: 'oauth-status configured' },
              span({ class: 'status-badge configured' }, '✓'),
              'Configured'
            ),
            div({ class: 'modal-actions' },
              button({
                class: 'modal-btn oauth',
                click: changeApiKey
              }, 'Change API Key')
            )
          );
        }

        return div(null,
          input({
            type: 'password',
            placeholder: 'kimi-...',
            value: kimiKey,
            input: (e) => settingsStore.setKimiApiKey({ value: e.target.value }),
            keydown: (e) => { if (e.key === 'Enter') saveApiKey(); }
          }),
          div({ class: 'modal-actions auth-actions' },
            button({
              class: 'modal-btn save',
              click: saveApiKey
            }, isSaving.map(v => v ? 'Saving...' : 'Save Key'))
          )
        );
      })
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
          click: () => openModelSelector('kimi', displayModel)
        }, 'Select Model')
      )
    ),

    div({ class: 'settings-section' },
      h4('Current Session Usage'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Input tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.input_tokens) : 'No usage yet — make a request to see usage')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Output tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.output_tokens) : '--')
      )
    ),

    div({ class: 'settings-section' },
      h4('Limits'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Max tokens'),
        span({ class: 'settings-value' }, formatValue(limits.maxTokens))
      )
    )
  );
}
