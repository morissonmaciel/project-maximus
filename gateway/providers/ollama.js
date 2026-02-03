/**
 * Ollama Provider Adapter
 * 
 * Responsibilities:
 * - Ollama SDK client operations
 * - Streaming response handling
 * - Tool call extraction from stream
 * 
 * Note: Payload construction lives in services/chat-payloads.js
 * Note: Tool loop execution lives in tools/loops.js
 */

import { ProviderCapabilities } from './types.js';
import { emitStreamChunk, emitStreamEnd, emitStreamStart } from '../ws/protocol.js';

export const name = ProviderCapabilities.OLLAMA.name;
export const supportsTools = ProviderCapabilities.OLLAMA.supportsTools;

/**
 * Stream chat with Ollama
 * @param {Object} params
 * @param {Object} params.client - Ollama SDK client
 * @param {Object} params.payload - Pre-built payload from services/chat-payloads.js
 * @param {WebSocket} params.ws - WebSocket for streaming
 * @returns {Promise<{assistantText: string, toolCalls: Array, usage: Object|null}>}
 */
export async function streamChat({ client, payload, ws }) {
  emitStreamStart(ws);
  
  const stream = await client.chat(payload);
  let lastChunk = null;
  let toolCalls = [];
  let assistantText = '';

  for await (const part of stream) {
    lastChunk = part;
    const content = part?.message?.content || part?.response || '';
    
    if (content) {
      assistantText += content;
      emitStreamChunk(ws, content);
    }
    
    // Ollama may return tool calls in stream
    const chunkToolCalls = part?.message?.tool_calls || part?.tool_calls || [];
    if (Array.isArray(chunkToolCalls) && chunkToolCalls.length) {
      toolCalls = toolCalls.concat(chunkToolCalls);
    }
  }

  emitStreamEnd(ws);

  const usage = lastChunk ? {
    input_tokens: lastChunk.prompt_eval_count ?? null,
    output_tokens: lastChunk.eval_count ?? null
  } : null;

  return { assistantText, toolCalls, usage };
}

/**
 * Check if Ollama is reachable and ready
 * @param {Object} client - Ollama client
 * @param {string} model - Model name
 * @returns {Promise<{ready: boolean, reachable: boolean, error: string|null, models: Array}>}
 */
export async function checkStatus(client, model) {
  try {
    const list = await client.list();
    const models = list.models || [];
    const reachable = true;
    const modelExists = !model || models.some(m => m.name === model || m.name.startsWith(model + ':'));
    
    return {
      ready: reachable && (!model || modelExists),
      reachable,
      error: model && !modelExists ? `Model "${model}" not found` : null,
      models: models.map(m => m.name)
    };
  } catch (err) {
    const message = err?.message || err?.code || 'Ollama connection failed';
    return {
      ready: false,
      reachable: false,
      error: message,
      models: []
    };
  }
}

/**
 * Check if Ollama provider is ready (synchronous check)
 * @param {Object} config
 * @returns {boolean}
 */
export function isReady(config) {
  return !!config && !!config.model;
}
