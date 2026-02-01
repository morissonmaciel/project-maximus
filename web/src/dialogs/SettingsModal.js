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

// Provider IDs that can be disabled
const PROVIDER_IDS = ['anthropic', 'openai-codex', 'kimi', 'nvidia', 'ollama'];

function isProviderEnabled(providersData, providerId) {
  if (!providersData) return true;
  if (Array.isArray(providersData.providers)) {
    const match = providersData.providers.find(p => p.id === providerId);
    if (!match) return false;
    return match.enabled !== false;
  }
  if (!providersData[providerId]) return true;
  return providersData[providerId].enabled !== false;
}

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

  // Build nav buttons dynamically based on provider enabled status
  const allNavButtons = [
    { id: 'anthropic', label: 'Anthropic', type: 'provider' },
    { id: 'openai-codex', label: 'OpenAI Codex', type: 'provider' },
    { id: 'kimi', label: 'Kimi', type: 'provider' },
    { id: 'nvidia', label: 'NVIDIA', type: 'provider' },
    { id: 'ollama', label: 'Ollama', type: 'provider' },
    { id: 'web', label: 'Web', type: 'system' },
    { id: 'memory', label: 'Memory', type: 'system' }
  ];

  // Filter nav buttons to only show enabled providers
  const visibleNavButtons = allNavButtons.filter(btn => {
    if (btn.type === 'system') return true;
    return isProviderEnabled(pData, btn.id);
  });

  return Show(isOpen, () =>
    div({ class: 'settings-modal-overlay', click: handleOverlayClick },
      div({ class: 'settings-modal' },
        div({ class: 'settings-modal-header' },
          h3({ class: 'settings-modal-title' }, 'Settings'),
          button({ class: 'settings-modal-close', click: closeSettings }, '✕')
        ),

        div({ class: 'settings-modal-body' },
          div({ class: 'settings-sidebar' },
            ...visibleNavButtons.map(btn =>
              button({
                class: Bunnix.Compute(panel, p => `settings-nav-btn ${p === btn.id ? 'active' : ''}`),
                click: () => setSettingsPanel(btn.id)
              }, btn.label)
            )
          ),

          div({ class: 'settings-content' },
            Show(panel.map(p => p === 'anthropic' && isProviderEnabled(pData, 'anthropic')), () => AnthropicPanel({ settings: sData })),
            Show(panel.map(p => p === 'openai-codex' && isProviderEnabled(pData, 'openai-codex')), () => OpenAICodexPanel({ settings: sData })),
            Show(panel.map(p => p === 'kimi' && isProviderEnabled(pData, 'kimi')), () => KimiPanel({ settings: sData })),
            Show(panel.map(p => p === 'nvidia' && isProviderEnabled(pData, 'nvidia')), () => NvidiaPanel({ settings: sData })),
            Show(panel.map(p => p === 'ollama' && isProviderEnabled(pData, 'ollama')), () => OllamaPanel({ settings: sData, providers: pData })),
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
