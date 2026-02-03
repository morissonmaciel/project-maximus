import Bunnix from '@bunnix/core';
import { openModelSelector } from '../state/models.js';
import { isConnected, provider, providerReady, latency, currentModel, connectionStore } from '../state/connection.js';

const { div, span } = Bunnix;

// Status Bar Component (footer below input)
export function StatusBar() {
  const prov = provider.map(p => p || 'Not selected');
  const ready = providerReady.map(r => r);
  const ping = latency.map(l => l ? `${Math.round(l)}ms` : '--');
  const model = currentModel.map(m => m || 'Unknown');
  const connected = isConnected.map(c => c);

  const statusText = Bunnix.Compute([connected, ready], (c, r) => {
    if (!c) return 'Disconnected';
    if (!r) return 'Configuring';
    return 'Ready';
  });

  return div({ class: 'status-bar' },
    div({ class: 'stat' },
      span({ class: 'stat-label' }, 'WS:'),
      span({ class: 'stat-value' }, connected.map(c => c ? 'connected' : 'disconnected'))
    ),
    div({ class: 'stat stat-clickable', click: () => connectionStore.openProviderSelector() },
      span({ class: 'stat-label' }, 'Provider:'),
      span({ class: 'stat-value stat-value-highlight' }, prov)
    ),
    div({
      class: 'stat stat-clickable',
      click: () => openModelSelector(provider.get(), currentModel.get())
    },
      span({ class: 'stat-label' }, 'Model:'),
      span({ class: 'stat-value stat-value-highlight' }, model)
    ),
    div({ class: 'stat' },
      span({ class: 'stat-label' }, 'Latency:'),
      span({ class: 'stat-value' }, ping)
    ),
    div({ class: 'stat' },
      span({ class: 'stat-label' }, 'Status:'),
      span({ class: 'stat-value' }, statusText)
    )
  );
}
