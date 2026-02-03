import Bunnix, { useMemo } from '@bunnix/core';
import { isConnected, latency, currentProvider, currentModel, providersConfig } from '../state/config.js';
import { providersCatalog } from '../state/catalog.js';

const { div, span } = Bunnix;

// Status Bar Component (footer below input)
export function StatusBar() {
  const prov = currentProvider.map(p => p || 'Not selected');
  const ping = latency.map(l => l ? `${Math.round(l)}ms` : '--');
  const model = currentModel.map(m => m || 'Unknown');
  const connected = isConnected.map(c => c);

  const providerData = useMemo([providersCatalog, currentProvider], (catalog, providerId) => {
    if (!providerId) return null;
    return (catalog || []).find(p => p.id === providerId) || null;
  });

  const providerConfig = useMemo([providersConfig, currentProvider], (cfg, providerId) => {
    if (!providerId) return null;
    return cfg?.[providerId] || null;
  });

  const ready = useMemo([providerData, providerConfig, currentProvider], (data, cfg, providerId) => {
    if (!providerId) return false;
    const enabled = data?.enabled !== false;
    const configured = cfg?.configured === true || providerId === 'ollama';
    if (providerId === 'ollama') {
      return enabled && data?.reachable === true;
    }
    return enabled && configured;
  });

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
    div({ class: 'stat' },
      span({ class: 'stat-label' }, 'Provider:'),
      span({ class: 'stat-value stat-value-highlight' }, prov)
    ),
    div({ class: 'stat' },
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
