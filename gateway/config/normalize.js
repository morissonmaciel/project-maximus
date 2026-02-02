import {
  DEFAULT_OLLAMA_HOST,
  DEFAULT_KIMI_ENDPOINT,
  DEFAULT_KIMI_MODEL,
  DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
  DEFAULT_KIMI_CONTEXT_WINDOW,
  DEFAULT_KIMI_REASONING_EFFORT,
  DEFAULT_NVIDIA_ENDPOINT,
  DEFAULT_NVIDIA_MODEL,
  DEFAULT_NVIDIA_MAX_TOKENS,
  DEFAULT_NVIDIA_TEMPERATURE,
  DEFAULT_NVIDIA_TOP_P,
  DEFAULT_NVIDIA_STREAM,
  DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS,
  DEFAULT_NVIDIA_TIMEOUT_MS
} from './constants.js';

export function normalizeConfig(config = {}) {
  const legacyKimiEndpoint = 'https://api.kimi.com/coding/v1';
  const result = {
    provider: null,
    anthropicCredentials: null,
    claudeCodeCredentials: null,
    openaiCodexCredentials: null,
    kimiCredentials: null,
    nvidiaCredentials: null,
    kimiConfig: {
      endpoint: DEFAULT_KIMI_ENDPOINT,
      model: DEFAULT_KIMI_MODEL,
      legacyOpenAI: true,
      streaming: true,
      includeMaxOutputTokens: true,
      reasoningEffort: DEFAULT_KIMI_REASONING_EFFORT,
      maxOutputTokens: DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
      contextWindow: DEFAULT_KIMI_CONTEXT_WINDOW
    },
    nvidiaConfig: {
      endpoint: DEFAULT_NVIDIA_ENDPOINT,
      model: DEFAULT_NVIDIA_MODEL,
      maxTokens: DEFAULT_NVIDIA_MAX_TOKENS,
      temperature: DEFAULT_NVIDIA_TEMPERATURE,
      topP: DEFAULT_NVIDIA_TOP_P,
      stream: DEFAULT_NVIDIA_STREAM,
      chatTemplateKwargs: DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS,
      toolChoice: 'auto',
      timeoutMs: DEFAULT_NVIDIA_TIMEOUT_MS
    },
    ollamaConfig: {
      host: DEFAULT_OLLAMA_HOST,
      model: null
    },
    lastSessionId: null,
    systemConfig: {}
  };

  if (config.credentials) {
    // Legacy config migration
    result.anthropicCredentials = config.credentials;
    result.provider = config.provider || null;
  } else {
    result.anthropicCredentials = config.anthropic?.credentials || null;
    result.provider = config.provider || null;
  }

  result.anthropicPreferredModel = config.anthropic?.preferredModel || null;
  result.claudeCodeCredentials = config.claudeCode?.credentials || null;
  result.claudeCodePreferredModel = config.claudeCode?.preferredModel || null;
  result.openaiCodexCredentials = config.openaiCodex?.credentials || null;
  result.openaiCodexPreferredModel = config.openaiCodex?.preferredModel || null;
  result.kimiCredentials = config.kimi?.credentials || null;
  result.kimiPreferredModel = config.kimi?.preferredModel || null;
  result.nvidiaCredentials = config.nvidia?.credentials || null;
  result.nvidiaPreferredModel = config.nvidia?.preferredModel || null;

  const rawKimiEndpoint = config.kimi?.endpoint;
  const normalizedKimiEndpoint = rawKimiEndpoint === legacyKimiEndpoint
    ? DEFAULT_KIMI_ENDPOINT
    : (rawKimiEndpoint || DEFAULT_KIMI_ENDPOINT);

  result.kimiConfig = {
    endpoint: normalizedKimiEndpoint,
    model: config.kimi?.model || DEFAULT_KIMI_MODEL,
    legacyOpenAI: config.kimi?.legacyOpenAI !== undefined ? !!config.kimi.legacyOpenAI : true,
    streaming: config.kimi?.streaming !== undefined ? !!config.kimi.streaming : true,
    includeMaxOutputTokens: config.kimi?.includeMaxOutputTokens !== undefined ? !!config.kimi.includeMaxOutputTokens : true,
    reasoningEffort: config.kimi?.reasoningEffort || DEFAULT_KIMI_REASONING_EFFORT,
    maxOutputTokens: config.kimi?.maxOutputTokens || DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
    contextWindow: config.kimi?.contextWindow || DEFAULT_KIMI_CONTEXT_WINDOW
  };

  result.nvidiaConfig = {
    endpoint: config.nvidia?.endpoint || DEFAULT_NVIDIA_ENDPOINT,
    model: config.nvidia?.model || DEFAULT_NVIDIA_MODEL,
    maxTokens: config.nvidia?.maxTokens || DEFAULT_NVIDIA_MAX_TOKENS,
    temperature: config.nvidia?.temperature ?? DEFAULT_NVIDIA_TEMPERATURE,
    topP: config.nvidia?.topP ?? DEFAULT_NVIDIA_TOP_P,
    stream: config.nvidia?.stream !== undefined ? !!config.nvidia.stream : DEFAULT_NVIDIA_STREAM,
    chatTemplateKwargs: config.nvidia?.chatTemplateKwargs || DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS,
    toolChoice: config.nvidia?.toolChoice || 'auto',
    timeoutMs: config.nvidia?.timeoutMs ?? DEFAULT_NVIDIA_TIMEOUT_MS
  };

  result.ollamaConfig = {
    host: config.ollama?.host || DEFAULT_OLLAMA_HOST,
    model: config.ollama?.model || null
  };

  result.lastSessionId = config.lastSessionId || null;
  result.systemConfig = config.system || {};
  result.currentModel = config.currentModel || null;

  return result;
}
