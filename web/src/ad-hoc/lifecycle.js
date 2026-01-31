/**
 * Connection lifecycle handlers
 * Manages WebSocket open, close, pong, and status events
 */

import { on, send, getLastPingTime } from '../lib/websocket.js';
import { connectionStore } from '../state/connection.js';

export function installLifecycleHandlers() {
  on('open', () => {
    connectionStore.setConnected({ value: true });
    send({ type: 'getProviders' });
  });

  on('close', () => {
    connectionStore.setConnected({ value: false });
    connectionStore.setLatency({ value: 0 });
  });

  on('pong', (data) => {
    // Calculate latency
    const lastPing = getLastPingTime();
    if (lastPing) {
      const latency = Date.now() - lastPing;
      connectionStore.setLatency({ value: latency });
    }

    // Update provider info
    if (data.provider) {
      connectionStore.setProvider({ value: data.provider });
    }
    if (data.providerReady !== undefined) {
      connectionStore.setProviderReady({ value: data.providerReady });
    }

    // Auto-open provider selector if no provider is set
    const state = connectionStore.state.get();
    if (state.providerSelectorOpen === false &&
        state.providerSelectorPrompted === false &&
        data.provider == null) {
      connectionStore.openProviderSelector();
      connectionStore.markProviderSelectorPrompted();
    }

    // Update current model based on provider
    const prov = data.provider;
    let model = null;
    if (prov === 'anthropic') {
      model = 'claude-sonnet-4';
    } else if (prov === 'openai-codex') {
      model = 'gpt-5.1-codex-max';
    } else if (prov === 'kimi') {
      model = 'kimi-k2.5';
    } else if (prov === 'nvidia') {
      model = 'moonshotai/kimi-k2.5';
    } else if (prov === 'ollama') {
      model = data.ollama?.model || null;
    }
    if (model) {
      connectionStore.setCurrentModel({ value: model });
    }
  });

  on('status', (data) => {
    if (data.provider) {
      connectionStore.setProvider({ value: data.provider });
    }
    if (data.providerReady !== undefined) {
      connectionStore.setProviderReady({ value: data.providerReady });
    }

    // Auto-open provider selector if no provider is set
    const state = connectionStore.state.get();
    if (state.providerSelectorOpen === false &&
        state.providerSelectorPrompted === false &&
        data.provider == null) {
      connectionStore.openProviderSelector();
      connectionStore.markProviderSelectorPrompted();
    }
  });
}
