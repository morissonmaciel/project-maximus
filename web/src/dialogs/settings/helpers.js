import { send } from '../../lib/websocket.js';
import { settingsStore } from '../../state/settings.js';
import { formatValue as fmt } from '../../utils/helpers.js';

export function resolveProviderModel(providerData) {
  const models = providerData?.models || [];
  // Priority: preferredModel > runtime model > first available model
  return providerData?.preferredModel || providerData?.model || models[0] || 'Unknown';
}

export { send, settingsStore, fmt as formatValue };
