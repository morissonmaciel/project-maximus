/**
 * Provider Adapters Public API
 * 
 * This module exports normalized provider adapters that each implement:
 * - streamChat(params): Stream chat and return { content, toolCalls, usage, rateLimits? }
 * - supportsTools: boolean flag
 * - isReady(credentials): Check if provider is configured
 * 
 * Responsibilities:
 * - Provider-specific API communication
 * - Stream parsing and normalization
 * 
 * NOT Responsibilities:
 * - Payload construction (services/chat-payloads.js)
 * - WebSocket event sending (services/chat-stream.js)
 * - Tool execution (tools/loops.js)
 */

import * as anthropic from './anthropic.js';
import * as claudeCode from './claude-code.js';
import * as ollama from './ollama.js';
import * as openaiCodex from './openai-codex.js';
import * as kimi from './kimi.js';
import * as nvidia from './nvidia.js';

export { anthropic, claudeCode, ollama, openaiCodex, kimi, nvidia };

/**
 * Get provider adapter by name
 * @param {string} name - Provider name
 * @returns {Object|null} Provider adapter module
 */
export function getProvider(name) {
  switch (name) {
    case 'anthropic':
      return anthropic;
    case 'claude-code':
      return claudeCode;
    case 'ollama':
      return ollama;
    case 'openai-codex':
      return openaiCodex;
    case 'kimi':
      return kimi;
    case 'nvidia':
      return nvidia;
    default:
      return null;
  }
}

/**
 * Check if provider supports tools
 * @param {string} name - Provider name
 * @returns {boolean}
 */
export function providerSupportsTools(name) {
  const provider = getProvider(name);
  return provider?.supportsTools ?? false;
}

/**
 * Check if provider is ready
 * @param {string} name - Provider name
 * @param {Object} credentials - Provider credentials
 * @returns {boolean}
 */
export function isProviderReady(name, credentials) {
  const provider = getProvider(name);
  if (!provider || typeof provider.isReady !== 'function') {
    return false;
  }
  return provider.isReady(credentials);
}
