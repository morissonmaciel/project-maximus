/**
 * Claude Code Provider Adapter
 *
 * OAuth-authenticated provider for Claude Pro/Max users.
 * Wraps Anthropic SDK with OAuth credentials.
 *
 * Responsibilities:
 * - Anthropic SDK client operations (OAuth only)
 * - Streaming response handling
 * - Rate limit tracking
 *
 * Note: Payload construction lives in messaging/payloads.js
 * Note: Tool loop execution lives in tools/loops.js
 */

import { ProviderCapabilities, parseRateLimitHeaders } from './types.js';

export const name = 'claude-code';
export const supportsTools = ProviderCapabilities.ANTHROPIC.supportsTools;

/**
 * Stream chat with Claude Code (OAuth)
 * @param {Object} params
 * @param {Object} params.client - Anthropic SDK client (OAuth configured)
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
 * Check if Claude Code provider is ready
 * @param {Object} credentials
 * @returns {boolean}
 */
export function isReady(credentials) {
  return !!credentials && credentials.type === 'oauth';
}

/**
 * Get auth type from credentials
 * @param {Object} credentials
 * @returns {string|null} 'oauth' or null
 */
export function getAuthType(credentials) {
  if (!credentials) return null;
  return credentials.type === 'oauth' ? 'oauth' : null;
}
