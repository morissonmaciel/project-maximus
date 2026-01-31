import Bunnix, { Show } from '@bunnix/core';
import {
  settings, providers, docs,
  isSettingsOpen, activeSettingsPanel,
  closeSettings, setSettingsPanel
} from '../state/settings.js';
import { AnthropicPanel } from './settings/panels/AnthropicPanel.js';
import { OpenAICodexPanel } from './settings/panels/OpenAICodexPanel.js';
import { KimiPanel } from './settings/panels/KimiPanel.js';
import { NvidiaPanel } from './settings/panels/NvidiaPanel.js';
import { OllamaPanel } from './settings/panels/OllamaPanel.js';
import { WebPanel } from './settings/panels/WebPanel.js';
import { MemoryPanel } from './settings/panels/MemoryPanel.js';
import './SettingsModal.css';

const { div, h3, button, span } = Bunnix;

export function SettingsModal() {
  const isOpen = isSettingsOpen.map(o => o);
  const panel = activeSettingsPanel.map(p => p);
  const settingsData = settings.map(s => s || {});
  const providersData = providers.map(p => p || {});
  const docsList = docs.map(d => d || []);

  const sData = settingsData.get();
  const pData = providersData.get();
  const dData = docsList.get();

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('settings-modal-overlay')) {
      closeSettings();
    }
  };

  const navButtons = [
    { id: 'anthropic', label: 'Anthropic' },
    { id: 'openai-codex', label: 'OpenAI Codex' },
    { id: 'kimi', label: 'Kimi' },
    { id: 'nvidia', label: 'NVIDIA' },
    { id: 'ollama', label: 'Ollama' },
    { id: 'web', label: 'Web' },
    { id: 'memory', label: 'Memory' }
  ];

  return Show(isOpen, () =>
    div({ class: 'settings-modal-overlay', click: handleOverlayClick },
      div({ class: 'settings-modal' },
        div({ class: 'settings-modal-header' },
          h3({ class: 'settings-modal-title' }, 'Settings'),
          button({ class: 'settings-modal-close', click: closeSettings }, '✕')
        ),

        div({ class: 'settings-modal-body' },
          div({ class: 'settings-sidebar' },
            ...navButtons.map(btn =>
              button({
                class: Bunnix.Compute(panel, p => `settings-nav-btn ${p === btn.id ? 'active' : ''}`),
                click: () => setSettingsPanel(btn.id)
              }, btn.label)
            )
          ),

          div({ class: 'settings-content' },
            Show(panel.map(p => p === 'anthropic'), () => AnthropicPanel({ settings: sData })),
            Show(panel.map(p => p === 'openai-codex'), () => OpenAICodexPanel({ settings: sData })),
            Show(panel.map(p => p === 'kimi'), () => KimiPanel({ settings: sData })),
            Show(panel.map(p => p === 'nvidia'), () => NvidiaPanel({ settings: sData })),
            Show(panel.map(p => p === 'ollama'), () => OllamaPanel({ settings: sData, providers: pData })),
            Show(panel.map(p => p === 'web'), () => WebPanel({ settings: sData })),
            Show(panel.map(p => p === 'memory'), () => MemoryPanel({ docs: dData }))
          )
        ),

        div({ class: 'settings-modal-footer' },
          button({ class: 'modal-btn cancel', click: closeSettings }, 'Close')
        )
      )
    )
  );
}
