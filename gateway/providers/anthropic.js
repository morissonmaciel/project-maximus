/**
 * Anthropic Provider Adapter
 * 
 * Responsibilities:
 * - Anthropic SDK client operations
 * - Streaming response handling
 * - Rate limit tracking
 * 
 * Note: Payload construction lives in services/chat-payloads.js
 * Note: Tool loop execution lives in tools/loops.js
 */

import { ProviderCapabilities, parseRateLimitHeaders } from './types.js';
import { emitError, emitStreamChunk, emitStreamEnd, emitStreamStart } from '../ws/protocol.js';

export const name = ProviderCapabilities.ANTHROPIC.name;
export const supportsTools = ProviderCapabilities.ANTHROPIC.supportsTools;

/**
 * Stream chat with Anthropic
 * @param {Object} params
 * @param {Object} params.client - Anthropic SDK client
 * @param {Object} params.payload - Pre-built payload from services/chat-payloads.js
 * @param {WebSocket} params.ws - WebSocket for streaming
 * @returns {Promise<{finalMessage: Object, rateLimits: Object|null}>}
 */
export async function streamChat({ client, payload, ws }) {
  return new Promise((resolve, reject) => {
    let finalMessage = null;
    let rateLimits = null;

    emitStreamStart(ws);
    const stream = client.messages.stream(payload);

    stream.on('text', (text) => {
      emitStreamChunk(ws, text);
    });

    stream.on('finalMessage', (message) => {
      finalMessage = message;
    });

    stream.on('end', () => {
      emitStreamEnd(ws);
      resolve({ finalMessage, rateLimits });
    });

    stream.on('error', (err) => {
      emitError(ws, err.message);
      reject(err);
    });

    // Capture rate limits from response headers
    stream.withResponse()
      .then(({ response }) => {
        rateLimits = parseRateLimitHeaders(response.headers);
      })
      .catch(() => {
        // Ignore header parsing errors
      });
  });
}

/**
 * Check if Anthropic provider is ready (API key only)
 * @param {Object} credentials
 * @returns {boolean}
 */
export function isReady(credentials) {
  return !!credentials && credentials.type === 'apiKey';
}

/**
 * Get auth type from credentials
 * @param {Object} credentials
 * @returns {string|null} 'apiKey' or null
 */
export function getAuthType(credentials) {
  if (!credentials) return null;
  return credentials.type === 'apiKey' ? 'apiKey' : null;
}

/**
 * Detect credential type from key string
 * @param {string} key
 * @returns {string} 'apiKey' or 'unknown'
 */
export function detectCredentialType(key) {
  if (!key || typeof key !== 'string') return 'unknown';
  if (key.startsWith('sk-ant-api')) return 'apiKey';
  return 'unknown';
}
