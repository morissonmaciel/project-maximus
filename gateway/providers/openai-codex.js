/**
 * OpenAI Codex Provider Adapter
 * 
 * Responsibilities:
 * - OpenAI Codex API operations
 * - SSE stream parsing
 * - Tool call extraction from stream
 * 
 * Note: Payload construction lives in services/chat-payloads.js
 * Note: WS streaming events are handled by services/chat-stream.js
 * Note: Tool loop execution lives in tools/loops.js
 */

import { ProviderCapabilities } from './types.js';

export const name = ProviderCapabilities.OPENAI_CODEX.name;
export const supportsTools = ProviderCapabilities.OPENAI_CODEX.supportsTools;

const CODEX_URL = "https://chatgpt.com/backend-api/codex/responses";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId() {
  return 'msg_' + Math.random().toString(36).substring(2, 15);
}

function normalizeToolId(id) {
  if (!id) return id;
  if (id.startsWith('fc_')) return id;
  if (id.startsWith('call_')) return 'fc_' + id.slice(5);
  return 'fc_' + id;
}

/**
 * Parse SSE stream
 * @param {Response} response
 * @returns {AsyncGenerator<Object>}
 */
async function* parseSSE(response) {
  if (!response.body) return;
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = block.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data && data !== "[DONE]") {
            try {
              yield JSON.parse(data);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      idx = buffer.indexOf("\n\n");
    }
  }
}

/**
 * Convert tools to Codex format
 * @param {Array} toolDefinitions
 * @returns {Array}
 */
function convertTools(toolDefinitions) {
  if (!Array.isArray(toolDefinitions)) {
    return [];
  }
  return toolDefinitions.map(tool => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema,
    strict: false
  }));
}

/**
 * Convert messages to Codex format
 * @param {Array} messages
 * @param {string} [systemPrompt]
 * @returns {Array}
 */
function convertMessages(messages, systemPrompt) {
  const output = [];

  if (systemPrompt) {
    output.push({
      role: "developer",
      content: [{ type: "input_text", text: systemPrompt }]
    });
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (Array.isArray(msg.content) && msg.content[0]?.type === 'tool_result') {
        for (const part of msg.content) {
          if (part.type === 'tool_result') {
            output.push({
              type: "function_call_output",
              call_id: normalizeToolId(part.tool_use_id),
              output: part.content
            });
          }
        }
      } else {
        const text = typeof msg.content === 'string' ? msg.content :
          Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : '';
        output.push({
          role: "user",
          content: [{ type: "input_text", text }]
        });
      }
    } else if (msg.role === 'assistant') {
      const content = msg.content;
      if (typeof content === 'string') {
        output.push({
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: content }],
          status: "completed",
          id: generateId()
        });
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            output.push({
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: block.text }],
              status: "completed",
              id: generateId()
            });
          } else if (block.type === 'tool_use') {
            output.push({
              type: "function_call",
              id: normalizeToolId(block.id),
              call_id: normalizeToolId(block.id),
              name: block.name,
              arguments: JSON.stringify(block.input)
            });
          }
        }
      }
    }
  }

  return output;
}

/**
 * Build Codex request body
 * @param {Object} params
 * @param {string} params.model
 * @param {Array} params.messages
 * @param {string} [params.systemPrompt]
 * @param {Array} params.tools
 * @returns {Object}
 */
export function buildRequestBody({ model, messages, systemPrompt, tools }) {
  return {
    model: model,
    store: false,
    stream: true,
    instructions: systemPrompt || "You are a helpful assistant.",
    input: convertMessages(messages, systemPrompt),
    tools: convertTools(tools),
    tool_choice: "auto",
    parallel_tool_calls: true,
    text: { verbosity: "medium" }
  };
}

/**
 * Build request headers
 * @param {Object} credentials
 * @returns {Object}
 */
export function buildHeaders(credentials) {
  return {
    "Authorization": `Bearer ${credentials.accessToken}`,
    "chatgpt-account-id": credentials.accountId,
    "OpenAI-Beta": "responses=experimental",
    "originator": "pi",
    "User-Agent": "maximus-gateway",
    "accept": "text/event-stream",
    "content-type": "application/json"
  };
}

/**
 * Stream chat with OpenAI Codex
 * 
 * Note: This function does NOT send WebSocket events directly.
 * It returns the raw stream events via callbacks for services/chat-stream.js to handle.
 * 
 * @param {Object} params
 * @param {string} params.model
 * @param {Array} params.messages
 * @param {string} [params.systemPrompt]
 * @param {Array} params.tools - Tool definitions
 * @param {Object} params.credentials - { accessToken, accountId }
 * @param {function(Object): void} params.onEvent - Callback for each SSE event
 * @returns {Promise<{content: Array, toolCalls: Array, usage: Object}>}
 */
export async function streamChat({
  model,
  messages,
  systemPrompt,
  tools,
  credentials,
  onEvent
}) {
  const { accessToken, accountId } = credentials;

  if (!accessToken || !accountId) {
    throw new Error('OpenAI Codex credentials missing accessToken or accountId');
  }

  console.log(`[Codex] Streaming response for model: ${model}`);

  const requestBody = buildRequestBody({ model, messages, systemPrompt, tools });
  const headers = buildHeaders({ accessToken, accountId });
  const parseNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const buildLimitsFromHeaders = (headersObj) => {
    const primary = {
      used_percent: parseNumber(headersObj['x-codex-primary-used-percent']),
      window_minutes: parseNumber(headersObj['x-codex-primary-window-minutes']),
      reset_at: parseNumber(headersObj['x-codex-primary-reset-at']),
      reset_after_seconds: parseNumber(headersObj['x-codex-primary-reset-after-seconds'])
    };
    const secondary = {
      used_percent: parseNumber(headersObj['x-codex-secondary-used-percent']),
      window_minutes: parseNumber(headersObj['x-codex-secondary-window-minutes']),
      reset_at: parseNumber(headersObj['x-codex-secondary-reset-at']),
      reset_after_seconds: parseNumber(headersObj['x-codex-secondary-reset-after-seconds'])
    };

    const hasPrimary = Object.values(primary).some(v => v !== null);
    const hasSecondary = Object.values(secondary).some(v => v !== null);
    if (!hasPrimary && !hasSecondary) return null;

    return {
      daily: hasPrimary ? primary : null,
      weekly: hasSecondary ? secondary : null
    };
  };

  // Make request with retries
  let response;
  let limits = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Codex] Sending request (attempt ${attempt + 1})...`);
      response = await fetch(CODEX_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });

      const responseHeaders = Object.fromEntries(response.headers.entries());
      limits = buildLimitsFromHeaders(responseHeaders);

      if (response.ok) {
        console.log('[Codex] Request successful');
        break;
      }

      if (attempt < MAX_RETRIES && (response.status === 429 || response.status >= 500)) {
        console.log(`[Codex] Request failed with ${response.status}, retrying...`);
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      const errorText = await response.text();
      console.error(`[Codex] Request failed: ${response.status} ${errorText}`);
      throw new Error(`Codex API Error: ${response.status} ${errorText}`);
    } catch (err) {
      console.error(`[Codex] Request error: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }

  // Process stream
  let assistantText = "";
  let toolCallsMap = new Map();
  let currentToolId = null;
  let usageData = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

  for await (const event of parseSSE(response)) {
    const type = event.type;

    if (type === 'response.output_text.delta') {
      const delta = event.delta;
      assistantText += delta;
      if (onEvent) {
        onEvent({ type: 'text', delta, fullText: assistantText });
      }
    } else if (type === 'response.output_item.added') {
      const item = event.item;
      if (item.type === 'function_call') {
        currentToolId = item.call_id;
        toolCallsMap.set(currentToolId, {
          id: currentToolId,
          name: item.name,
          arguments: item.arguments || ""
        });
      }
    } else if (type === 'response.function_call_arguments.delta') {
      if (currentToolId) {
        const tool = toolCallsMap.get(currentToolId);
        tool.arguments += event.delta;
      }
    } else if (type === 'response.output_item.done') {
      const item = event.item;
      if (item.type === 'function_call') {
        toolCallsMap.set(item.call_id, {
          id: item.call_id,
          name: item.name,
          arguments: item.arguments
        });
        currentToolId = null;
      }
    } else if (type === 'response.completed') {
      if (event.response?.usage) {
        usageData.input_tokens = event.response.usage.input_tokens || 0;
        usageData.output_tokens = event.response.usage.output_tokens || 0;
        usageData.total_tokens = event.response.usage.total_tokens || (usageData.input_tokens + usageData.output_tokens);
      }
    } else if (type === 'error') {
      throw new Error(`Stream Error: ${event.message || event.code}`);
    }

    // Pass raw event to callback
    if (onEvent) {
      onEvent({ type: 'raw', event });
    }
  }

  // Build final content array
  const content = [];
  if (assistantText) {
    content.push({ type: 'text', text: assistantText });
  }

  // Parse tool calls
  const toolCalls = [];
  for (const tool of toolCallsMap.values()) {
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(tool.arguments);
    } catch (e) {
      // Keep empty object on parse error
    }
    const toolUse = {
      id: tool.id,
      name: tool.name,
      input: parsedArgs,
      type: 'tool_use'
    };
    toolCalls.push(toolUse);
    content.push(toolUse);
  }

  const usage = (usageData.input_tokens || usageData.output_tokens) ? usageData : null;
  return { content, toolCalls, usage, limits };
}

/**
 * Check if OpenAI Codex provider is ready
 * @param {Object} credentials
 * @returns {boolean}
 */
export function isReady(credentials) {
  return !!credentials && !!credentials.accessToken && !!credentials.accountId;
}
