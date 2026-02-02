import Bunnix, { Show, ForEach } from '@bunnix/core';
import {
  settings, providers, docs,
  isSettingsOpen, activeSettingsPanel,
  closeSettings, setSettingsPanel
} from '../state/settings.js';
import { AnthropicPanel } from './settings/panels/AnthropicPanel.js';
import { ClaudeCodePanel } from './settings/panels/ClaudeCodePanel.js';
import { OpenAICodexPanel } from './settings/panels/OpenAICodexPanel.js';
import { KimiPanel } from './settings/panels/KimiPanel.js';
import { NvidiaPanel } from './settings/panels/NvidiaPanel.js';
import { OllamaPanel } from './settings/panels/OllamaPanel.js';
import { WebPanel } from './settings/panels/WebPanel.js';
import { MemoryPanel } from './settings/panels/MemoryPanel.js';
import './SettingsModal.css';

const { div, h3, button, span } = Bunnix;

// Provider IDs that can be disabled
const PROVIDER_IDS = ['claude-code', 'anthropic', 'openai-codex', 'kimi', 'nvidia', 'ollama'];

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

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('settings-modal-overlay')) {
      closeSettings();
    }
  };

  const navSections = [
    {
      id: 'providers',
      title: 'Providers',
      items: [
        { id: 'claude-code', label: 'Claude Code', type: 'provider' },
        { id: 'anthropic', label: 'Anthropic', type: 'provider' },
        { id: 'openai-codex', label: 'OpenAI Codex', type: 'provider' },
        { id: 'kimi', label: 'Kimi', type: 'provider' },
        { id: 'nvidia', label: 'NVIDIA', type: 'provider' },
        { id: 'ollama', label: 'Ollama', type: 'provider' }
      ]
    },
    {
      id: 'system',
      title: 'System',
      items: [
        { id: 'web', label: 'Web', type: 'system' },
        { id: 'memory', label: 'Memory', type: 'system' }
      ]
    }
  ];

  const visibleNavSections = Bunnix.Compute([providersData], (pData) =>
    navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (item.type === 'system') return true;
        return isProviderEnabled(pData, item.id);
      })
    })).filter(section => section.items.length > 0)
  );

  const anthropicPanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'anthropic' && isProviderEnabled(pData, 'anthropic') ? sData : null
  );
  const claudeCodePanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'claude-code' && isProviderEnabled(pData, 'claude-code') ? sData : null
  );
  const codexPanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'openai-codex' && isProviderEnabled(pData, 'openai-codex') ? sData : null
  );
  const kimiPanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'kimi' && isProviderEnabled(pData, 'kimi') ? sData : null
  );
  const nvidiaPanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'nvidia' && isProviderEnabled(pData, 'nvidia') ? sData : null
  );
  const ollamaPanel = Bunnix.Compute([panel, providersData, settingsData], (p, pData, sData) =>
    p === 'ollama' && isProviderEnabled(pData, 'ollama') ? { sData, pData } : null
  );
  const webPanel = Bunnix.Compute([panel, settingsData], (p, sData) => p === 'web' ? sData : null);
  const memoryPanel = Bunnix.Compute([panel, docsList], (p, dData) => p === 'memory' ? dData : null);

  return Show(isOpen, () =>
    div({ class: 'settings-modal-overlay', click: handleOverlayClick },
      div({ class: 'settings-modal' },
        div({ class: 'settings-modal-header' },
          h3({ class: 'settings-modal-title' }, 'Settings'),
          button({ class: 'settings-modal-close', click: closeSettings }, '✕')
        ),

        div({ class: 'settings-modal-body' },
          div({ class: 'settings-sidebar' },
            ForEach(visibleNavSections, 'id', (section) =>
              div({ class: 'settings-nav-section' },
                div({ class: 'settings-nav-section-header' }, section.title),
                ForEach(section.items, 'id', (btn) =>
                  button({
                    class: Bunnix.Compute(panel, p => `settings-nav-btn ${p === btn.id ? 'active' : ''}`),
                    click: () => setSettingsPanel(btn.id)
                  }, btn.label)
                )
              )
            )
          ),

          div({ class: 'settings-content' },
            Show(claudeCodePanel, (sData) => sData ? ClaudeCodePanel({ settings: sData }) : null),
            Show(anthropicPanel, (sData) => sData ? AnthropicPanel({ settings: sData }) : null),
            Show(codexPanel, (sData) => sData ? OpenAICodexPanel({ settings: sData }) : null),
            Show(kimiPanel, (sData) => sData ? KimiPanel({ settings: sData }) : null),
            Show(nvidiaPanel, (sData) => sData ? NvidiaPanel({ settings: sData }) : null),
            Show(ollamaPanel, (data) => data ? OllamaPanel({ settings: data.sData, providers: data.pData }) : null),
            Show(webPanel, (sData) => sData ? WebPanel({ settings: sData }) : null),
            Show(memoryPanel, (dData) => dData ? MemoryPanel({ docs: dData }) : null)
          )
        ),

        div({ class: 'settings-modal-footer' },
          button({ class: 'modal-btn cancel', click: closeSettings }, 'Close')
        )
      )
    )
  );
}
