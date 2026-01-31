/**
 * Messaging Stream Orchestration
 * 
 * Responsibilities:
 * - Orchestrate streaming between providers and WebSocket
 * - Send WebSocket events (streamStart, streamChunk, streamEnd)
 * - Normalize provider responses to consistent format
 * 
 * NOT Responsibilities:
 * - Direct SDK calls (now in providers/)
 * - Payload construction (payloads.js)
 * - Tool execution (tools/loops.js)
 */

import * as providers from '../providers/index.js';
import { parseRateLimitHeaders } from '../providers/types.js';

/**
 * Stream Anthropic response
 * @param {Object} client - Anthropic SDK client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} params - Pre-built payload
 * @returns {Promise<{finalMessage: Object, rateLimits: Object|null}>}
 */
export async function streamAnthropicResponse(client, ws, params) {
  // Use the anthropic provider adapter
  return providers.anthropic.streamChat({ client, payload: params, ws });
}

/**
 * Stream Ollama response
 * @param {Object} client - Ollama SDK client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} params - Pre-built payload
 * @returns {Promise<{toolCalls: Array, assistantText: string, usage: Object}>}
 */
export async function streamOllamaResponse(client, ws, params) {
  // Use the ollama provider adapter
  return providers.ollama.streamChat({ client, payload: params, ws });
}

/**
 * Stream OpenAI Codex response
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} params - Payload with model, messages, system, credentials
 * @returns {Promise<{content: Array, toolCalls: Array, usage: Object}>}
 */
export async function streamCodexResponse(ws, params) {
  const { model, messages, system, credentials } = params;
  
  ws.send(JSON.stringify({ type: 'streamStart' }));

  try {
    const { content, toolCalls, usage } = await providers.openaiCodex.streamChat({
      model,
      messages,
      systemPrompt: system,
      tools: params.tools || [],
      credentials,
      onEvent: (event) => {
        // Send text deltas as stream chunks
        if (event.type === 'text' && event.delta) {
          ws.send(JSON.stringify({ type: 'streamChunk', content: event.delta }));
        }
      }
    });

    ws.send(JSON.stringify({ type: 'streamEnd' }));

    // Return normalized format matching other providers
    return { content, toolCalls, usage };
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    throw err;
  }
}

/**
 * Stream NVIDIA response
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} params - NVIDIA payload
 * @returns {Promise<{content: Array, toolCalls: Array, usage: Object}>}
 */
export async function streamNvidiaResponse(ws, params) {
  ws.send(JSON.stringify({ type: 'streamStart' }));

  try {
    const { content, toolCalls, usage } = await providers.nvidia.streamChat({
      endpoint: params.endpoint,
      apiKey: params.apiKey,
      model: params.model,
      messages: params.messages,
      tools: params.tools || [],
      maxTokens: params.maxTokens,
      temperature: params.temperature,
      topP: params.topP,
      stream: params.stream,
      toolChoice: params.toolChoice,
      chatTemplateKwargs: params.chatTemplateKwargs,
      timeoutMs: params.timeoutMs,
      onEvent: (event) => {
        if (event.type === 'text' && event.delta) {
          ws.send(JSON.stringify({ type: 'streamChunk', content: event.delta }));
        }
      }
    });

    ws.send(JSON.stringify({ type: 'streamEnd' }));
    return { content, toolCalls, usage };
  } catch (err) {
    console.error(`[Gateway] NVIDIA stream error: ${err.message}`);
    ws.send(JSON.stringify({ type: 'streamEnd' }));
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    throw err;
  }
}

/**
 * Stream Kimi response (OpenAI-compatible chat completions)
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} params - Payload with endpoint, apiKey, model, messages, tools
 * @returns {Promise<{content: Array, toolCalls: Array, usage: Object}>}
 */
export async function streamKimiResponse(ws, params) {
  const { endpoint, apiKey, model, messages, tools, maxTokens, reasoningEffort, stream } = params;

  ws.send(JSON.stringify({ type: 'streamStart' }));

  try {
    const { content, toolCalls, usage } = await providers.kimi.streamChat({
      endpoint,
      apiKey,
      model,
      messages,
      tools: tools || [],
      maxTokens,
      reasoningEffort,
      stream,
      onEvent: (event) => {
        if (event.type === 'text' && event.delta) {
          ws.send(JSON.stringify({ type: 'streamChunk', content: event.delta }));
        }
      }
    });

    ws.send(JSON.stringify({ type: 'streamEnd' }));

    return { content, toolCalls, usage };
  } catch (err) {
    console.error(`[Gateway] Kimi stream error: ${err.message}`);
    ws.send(JSON.stringify({ type: 'streamEnd' }));
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    throw err;
  }
}

// Re-export for backward compatibility
export { parseRateLimitHeaders } from '../providers/types.js';
