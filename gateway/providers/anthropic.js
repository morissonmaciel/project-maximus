/**
 * Anthropic Provider Adapter
 * 
 * Responsibilities:
 * - Anthropic SDK client operations
 * - Streaming response handling
 * - Rate limit tracking
 * 
 * Note: Payload construction lives in messaging/payloads.js
 * Note: Tool loop execution lives in tools/loops.js
 */

import { ProviderCapabilities, parseRateLimitHeaders } from './types.js';

export const name = ProviderCapabilities.ANTHROPIC.name;
export const supportsTools = ProviderCapabilities.ANTHROPIC.supportsTools;

/**
 * Stream chat with Anthropic
 * @param {Object} params
 * @param {Object} params.client - Anthropic SDK client
 * @param {Object} params.payload - Pre-built payload from messaging/payloads.js
 * @param {WebSocket} params.ws - WebSocket for streaming
 * @returns {Promise<{finalMessage: Object, rateLimits: Object|null}>}
 */
export async function streamChat({ client, payload, ws }) {
  return new Promise((resolve, reject) => {
    let finalMessage = null;
    let rateLimits = null;

    ws.send(JSON.stringify({ type: 'streamStart' }));
    const stream = client.messages.stream(payload);

    stream.on('text', (text) => {
      ws.send(JSON.stringify({ type: 'streamChunk', content: text }));
    });

    stream.on('finalMessage', (message) => {
      finalMessage = message;
    });

    stream.on('end', () => {
      ws.send(JSON.stringify({ type: 'streamEnd' }));
      resolve({ finalMessage, rateLimits });
    });

    stream.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
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
 * Check if Anthropic provider is ready
 * @param {Object} credentials
 * @returns {boolean}
 */
export function isReady(credentials) {
  return !!credentials && (credentials.type === 'apiKey' || credentials.type === 'oauth');
}

/**
 * Get auth type from credentials
 * @param {Object} credentials
 * @returns {string|null} 'apiKey', 'oauth', or null
 */
export function getAuthType(credentials) {
  if (!credentials) return null;
  return credentials.type || null;
}

/**
 * Detect credential type from key string
 * @param {string} key
 * @returns {string} 'apiKey', 'oauth', or 'unknown'
 */
export function detectCredentialType(key) {
  if (!key || typeof key !== 'string') return 'unknown';
  if (key.startsWith('sk-ant-api')) return 'apiKey';
  if (key.startsWith('sk-ant-oat')) return 'oauth';
  return 'unknown';
}
