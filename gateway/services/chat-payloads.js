import { TOOL_DEFINITIONS, OLLAMA_TOOL_DEFINITIONS } from '../tools/tools-executer.js';

export function buildOllamaMessages(baseMessages, memoryText, systemPromptText) {
  const systemMessages = [{ role: 'system', content: systemPromptText }];
  if (memoryText) {
    systemMessages.push({ role: 'system', content: memoryText });
  }
  return [...systemMessages, ...baseMessages];
}

export function buildAnthropicPayload(messages, systemPromptText, memoryText, isOAuth, model, maxTokens) {
  const params = {
    model,
    max_tokens: maxTokens,
    messages,
    tools: TOOL_DEFINITIONS
  };

  params.system = [
    {
      type: 'text',
      text: systemPromptText,
      cache_control: { type: 'ephemeral' }
    }
  ];

  if (isOAuth) {
    params.system.push({
      type: 'text',
      text: "You are Claude Code, Anthropic's official CLI for Claude.",
      cache_control: { type: 'ephemeral' }
    });
  }

  if (memoryText) {
    params.system.push({
      type: 'text',
      text: memoryText,
      cache_control: { type: 'ephemeral' }
    });
  }

  return params;
}

export function buildOpenAICodexPayload(messages, systemPromptText, memoryText, credentials, model) {
  let fullSystemPrompt = systemPromptText;
  if (memoryText) {
    fullSystemPrompt += `\n\n${memoryText}`;
  }

  return {
    model,
    messages,
    system: fullSystemPrompt,
    credentials,
    tools: TOOL_DEFINITIONS
  };
}

export function buildKimiMessages(baseMessages, systemPromptText, memoryText) {
  const messages = [];
  if (systemPromptText) {
    messages.push({ role: 'system', content: systemPromptText });
  }
  if (memoryText) {
    messages.push({ role: 'system', content: memoryText });
  }
  return [...messages, ...baseMessages];
}

export function buildKimiPayload(messages, systemPromptText, memoryText, config) {
  const kimiMessages = buildKimiMessages(messages, systemPromptText, memoryText);
  return {
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.includeMaxOutputTokens === false ? undefined : config.maxOutputTokens,
    reasoningEffort: config.reasoningEffort,
    stream: config.streaming,
    messages: kimiMessages,
    tools: TOOL_DEFINITIONS
  };
}

export function buildNvidiaPayload(messages, systemPromptText, memoryText, config) {
  const nvidiaMessages = buildKimiMessages(messages, systemPromptText, memoryText);
  return {
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    stream: config.stream,
    toolChoice: config.toolChoice,
    chatTemplateKwargs: config.chatTemplateKwargs,
    timeoutMs: config.timeoutMs,
    messages: nvidiaMessages,
    tools: TOOL_DEFINITIONS
  };
}

export function buildOllamaPayload(model, messages, toolDefinitions = OLLAMA_TOOL_DEFINITIONS) {
  return {
    model,
    messages,
    stream: true,
    tools: toolDefinitions,
    keep_alive: -1
  };
}
