/**
 * NVIDIA Provider Adapter (HTTP)
 *
 * Responsibilities:
 * - NVIDIA NIM Chat Completions API calls
 * - Streaming response handling (SSE)
 * - Tool call extraction
 */

import { ProviderCapabilities } from './types.js';

export const name = ProviderCapabilities.NVIDIA.name;
export const supportsTools = ProviderCapabilities.NVIDIA.supportsTools;

const DEFAULT_TIMEOUT_MS = 10000;

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

async function* parseSSE(response) {
  if (!response.body) return;
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = block.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            yield JSON.parse(data);
          } catch {
            // ignore parse errors
          }
        }
      }
      idx = buffer.indexOf('\n\n');
    }
  }
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

function extractUsage(payload) {
  const usage = payload?.usage || payload?.response?.usage;
  if (!usage) return null;
  return {
    input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? null,
    output_tokens: usage.completion_tokens ?? usage.output_tokens ?? null
  };
}

export async function streamChat({
  endpoint,
  apiKey,
  model,
  messages,
  tools,
  maxTokens,
  temperature,
  topP,
  stream = true,
  toolChoice,
  chatTemplateKwargs,
  timeoutMs,
  onEvent
}) {
  if (!apiKey) {
    throw new Error('NVIDIA API key missing');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: stream ? 'text/event-stream' : 'application/json',
    'Content-Type': 'application/json'
  };

  const payload = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: !!stream,
    tools: convertTools(tools),
    tool_choice: toolChoice || 'auto',
    chat_template_kwargs: chatTemplateKwargs || { thinking: true }
  };

  const controller = new AbortController();
  const timeoutValue = typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const timeout = timeoutValue > 0 ? setTimeout(() => controller.abort(), timeoutValue) : null;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('NVIDIA request timed out');
    }
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`NVIDIA API Error: ${response.status} ${errorText}`);
  }

  if (!stream) {
    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const text = message.content || '';
    const content = text ? [{ type: 'text', text }] : [];
    const { toolCalls, content: toolContent } = buildToolCalls(message);
    return {
      content: content.concat(toolContent),
      toolCalls,
      usage: extractUsage(data)
    };
  }

  let assistantText = '';
  const toolCallsMap = new Map();
  let usage = null;

  for await (const event of parseSSE(response)) {
    const choice = event?.choices?.[0];
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

    if (event?.usage) {
      usage = extractUsage(event);
    }

    if (onEvent) {
      onEvent({ type: 'raw', event });
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
