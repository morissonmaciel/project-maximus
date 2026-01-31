import Bunnix from '@bunnix/core';
import { send, settingsStore } from '../helpers.js';
import './WebPanel.css';

const { div, h4, p, button, input } = Bunnix;

export function WebPanel({ settings: webSettings }) {
  const state = settingsStore.state.get();
  const braveConfigured = webSettings?.system?.web?.search?.brave_api_key_configured;

  const handleSave = () => {
    const apiKey = state.braveApiKey?.trim();
    if (!apiKey) {
      settingsStore.setBraveApiKey({ value: '' });
      return;
    }
    settingsStore.setSaving({ value: true });
    send({ type: 'setBraveApiKey', apiKey });
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Brave Web Search'),
      p({ class: 'settings-muted' }, 'Provide a Brave Search API key to enable web_search. Get a key at api.search.brave.com.'),
      input({
        type: 'password',
        placeholder: 'brave API key...',
        value: state.braveApiKey,
        input: (e) => settingsStore.setBraveApiKey({ value: e.target.value }),
        keydown: (e) => { if (e.key === 'Enter') handleSave(); }
      }),
      div({ class: 'modal-actions auth-actions' },
        button({
          class: 'modal-btn save',
          click: handleSave
        }, state.isSaving ? 'SAVING...' : 'SAVE_KEY')
      ),
      p({ class: 'settings-muted' }, braveConfigured ? 'Status: configured' : 'Status: not configured')
    )
  );
}
