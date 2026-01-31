/**
 * Kimi Provider Adapter (OpenAI SDK)
 *
 * Responsibilities:
 * - Kimi API operations via OpenAI-compatible SDK
 * - Streaming response handling
 * - Tool call extraction from responses
 */

import OpenAI from 'openai';
import { ProviderCapabilities } from './types.js';

export const name = ProviderCapabilities.KIMI.name;
export const supportsTools = ProviderCapabilities.KIMI.supportsTools;

const DEFAULT_TIMEOUT_MS = 60000;

function createClient(apiKey, baseURL, timeout) {
  return new OpenAI({
    apiKey,
    baseURL,
    timeout: timeout || DEFAULT_TIMEOUT_MS
  });
}

function convertTools(toolDefinitions) {
  if (!Array.isArray(toolDefinitions)) return [];
  return toolDefinitions.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }));
}

function parseToolArguments(toolCall) {
  const func = toolCall?.function || {};
  const raw = func.arguments ?? func.parameters ?? '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildToolCalls(message) {
  const toolCalls = [];
  const content = [];

  const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  for (const call of calls) {
    const input = parseToolArguments(call);
    const toolUse = {
      id: call.id,
      name: call.function?.name,
      input,
      type: 'tool_use'
    };
    toolCalls.push(toolUse);
    content.push(toolUse);
  }

  return { toolCalls, content };
}

/**
 * Stream chat with Kimi (OpenAI-compatible)
 *
 * @param {Object} params
 * @param {string} params.endpoint
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {Array} params.messages
 * @param {Array} params.tools
 * @param {number} params.maxTokens
 * @param {string} params.reasoningEffort
 * @param {boolean} params.stream
 * @param {function(Object): void} params.onEvent
 * @returns {Promise<{content: Array, toolCalls: Array, usage: Object|null}>}
 */
export async function streamChat({
  endpoint,
  apiKey,
  model,
  messages,
  tools,
  maxTokens,
  reasoningEffort,
  stream = true,
  onEvent
}) {
  if (!apiKey) {
    throw new Error('Kimi API key missing');
  }

  const client = createClient(apiKey, endpoint);
  const payload = {
    model,
    messages,
    tools: convertTools(tools),
    tool_choice: 'auto',
    max_tokens: maxTokens,
    reasoning_effort: reasoningEffort,
    stream,
    stream_options: stream ? { include_usage: true } : undefined
  };

  if (!stream) {
    const completion = await client.chat.completions.create(payload);
    const message = completion.choices?.[0]?.message || {};
    const text = message.content || '';
    const content = text ? [{ type: 'text', text }] : [];
    const { toolCalls, content: toolContent } = buildToolCalls(message);
    const usage = completion.usage
      ? {
          input_tokens: completion.usage.prompt_tokens ?? completion.usage.input_tokens ?? null,
          output_tokens: completion.usage.completion_tokens ?? completion.usage.output_tokens ?? null
        }
      : null;

    return {
      content: content.concat(toolContent),
      toolCalls,
      usage
    };
  }

  let assistantText = '';
  const toolCallsMap = new Map();
  let usage = null;

  const streamResult = await client.chat.completions.create(payload);
  for await (const chunk of streamResult) {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta || {};

    if (delta.content) {
      assistantText += delta.content;
      if (onEvent) {
        onEvent({ type: 'text', delta: delta.content, fullText: assistantText });
      }
    }

    if (Array.isArray(delta.tool_calls)) {
      for (const call of delta.tool_calls) {
        const key = call.id || `${call.index}`;
        const existing = toolCallsMap.get(key) || {
          id: call.id || key,
          name: call.function?.name || null,
          arguments: ''
        };

        if (call.function?.name) {
          existing.name = call.function.name;
        }
        if (call.function?.arguments) {
          existing.arguments += call.function.arguments;
        }
        if (call.function?.parameters) {
          existing.arguments += call.function.parameters;
        }
        toolCallsMap.set(key, existing);
      }
    }

    if (chunk.usage) {
      usage = {
        input_tokens: chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? null,
        output_tokens: chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? null
      };
    }

    if (onEvent) {
      onEvent({ type: 'raw', event: chunk });
    }
  }

  const content = assistantText ? [{ type: 'text', text: assistantText }] : [];
  const toolCalls = [];
  const toolContent = [];

  for (const tool of toolCallsMap.values()) {
    let input = {};
    try {
      input = JSON.parse(tool.arguments || '{}');
    } catch {
      input = {};
    }
    const toolUse = {
      id: tool.id,
      name: tool.name,
      input,
      type: 'tool_use'
    };
    toolCalls.push(toolUse);
    toolContent.push(toolUse);
  }

  return {
    content: content.concat(toolContent),
    toolCalls,
    usage
  };
}

export function isReady(credentials) {
  return !!credentials && !!credentials.apiKey;
}
