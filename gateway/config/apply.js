import Anthropic from '@anthropic-ai/sdk';
import { Ollama } from 'ollama';

export function createOAuthClient(accessToken) {
  const defaultHeaders = {
    accept: 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
    'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14',
    'user-agent': 'claude-cli/2.1.2 (external, cli)',
    'x-app': 'cli'
  };

  return new Anthropic({
    apiKey: null,
    authToken: accessToken,
    defaultHeaders
  });
}

export function createOllamaClient(host) {
  return new Ollama({ host });
}

export function applyConfig(configState) {
  let anthropicClient = null;
  let ollamaClient = null;

  if (configState.anthropicCredentials) {
    if (configState.anthropicCredentials.type === 'apiKey') {
      anthropicClient = new Anthropic({ apiKey: configState.anthropicCredentials.apiKey });
      console.log('[Gateway] Loaded API key from config');
    } else if (configState.anthropicCredentials.type === 'oauth') {
      anthropicClient = createOAuthClient(configState.anthropicCredentials.accessToken);
      console.log('[Gateway] Loaded OAuth tokens from config');
    }
  }

  ollamaClient = createOllamaClient(configState.ollamaConfig.host);

  return {
    anthropicClient,
    ollamaClient
  };
}
