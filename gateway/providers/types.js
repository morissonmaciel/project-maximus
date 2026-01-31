/**
 * Shared provider types and constants
 */

/**
 * @typedef {Object} StreamChatResult
 * @property {Array<{type: string, text?: string}>} content - Response content blocks
 * @property {Array<{id: string, name: string, input: object}>} [toolCalls] - Tool calls requested
 * @property {Object} [usage] - Token usage info
 * @property {number} [usage.input_tokens]
 * @property {number} [usage.output_tokens]
 * @property {Object} [rateLimits] - Rate limit info (Anthropic only)
 * @property {number} [rateLimits.requestsLimit]
 * @property {number} [rateLimits.requestsRemaining]
 * @property {string} [rateLimits.requestsReset]
 * @property {number} [rateLimits.tokensLimit]
 * @property {number} [rateLimits.tokensRemaining]
 * @property {string} [rateLimits.tokensReset]
 */

/**
 * @typedef {Object} StreamChatParams
 * @property {string} model - Model identifier
 * @property {Array<{role: string, content: string|Array}>} messages - Chat messages
 * @property {string} [systemPrompt] - System prompt text
 * @property {string} [memoryText] - Memory context text
 * @property {Object} credentials - Provider credentials
 * @property {WebSocket} ws - WebSocket connection for streaming
 */

/**
 * Provider adapter interface
 * @typedef {Object} ProviderAdapter
 * @property {string} name - Provider name
 * @property {boolean} supportsTools - Whether provider supports tool calls
 * @property {function(StreamChatParams): Promise<StreamChatResult>} streamChat - Stream chat method
 * @property {function(Object): boolean} [isReady] - Check if provider is ready to use
 */

export const ProviderCapabilities = {
  ANTHROPIC: {
    name: 'anthropic',
    supportsTools: true,
    supportsStreaming: true,
    supportsOAuth: true,
    defaultModel: 'claude-sonnet-4-20250514',
    defaultMaxTokens: 4096
  },
  OLLAMA: {
    name: 'ollama',
    supportsTools: true,
    supportsStreaming: true,
    supportsOAuth: false,
    defaultHost: 'http://127.0.0.1:11434'
  },
  OPENAI_CODEX: {
    name: 'openai-codex',
    supportsTools: true,
    supportsStreaming: true,
    supportsOAuth: true,
    defaultModel: 'gpt-5.1-codex-max',
    defaultMaxTokens: 4096
  },
  KIMI: {
    name: 'kimi',
    supportsTools: true,
    supportsStreaming: true,
    supportsOAuth: false,
    defaultModel: 'kimi-k2.5',
    defaultMaxTokens: 32768
  },
  NVIDIA: {
    name: 'nvidia',
    supportsTools: true,
    supportsStreaming: true,
    supportsOAuth: false,
    defaultModel: 'moonshotai/kimi-k2.5',
    defaultMaxTokens: 16384
  }
};

/**
 * Parse rate limit headers from Anthropic response
 * @param {Headers} headers
 * @returns {Object|null}
 */
export function parseRateLimitHeaders(headers) {
  const toNumber = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const toString = (value) => (value === null || value === undefined ? null : String(value));

  const requestsLimit = toNumber(headers.get('anthropic-ratelimit-requests-limit'));
  const requestsRemaining = toNumber(headers.get('anthropic-ratelimit-requests-remaining'));
  const requestsReset = toString(headers.get('anthropic-ratelimit-requests-reset'));
  const tokensLimit = toNumber(headers.get('anthropic-ratelimit-tokens-limit'));
  const tokensRemaining = toNumber(headers.get('anthropic-ratelimit-tokens-remaining'));
  const tokensReset = toString(headers.get('anthropic-ratelimit-tokens-reset'));

  if (
    requestsLimit === null &&
    requestsRemaining === null &&
    tokensLimit === null &&
    tokensRemaining === null &&
    !requestsReset &&
    !tokensReset
  ) {
    return null;
  }

  return {
    requestsLimit,
    requestsRemaining,
    requestsReset,
    tokensLimit,
    tokensRemaining,
    tokensReset
  };
}
