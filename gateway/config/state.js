import {
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

export const configState = {
  provider: null,
  currentModel: null,
  anthropicCredentials: null,
  anthropicPreferredModel: null,
  claudeCodeCredentials: null,
  claudeCodePreferredModel: null,
  openaiCodexCredentials: null,
  openaiCodexPreferredModel: null,
  kimiCredentials: null,
  kimiPreferredModel: null,
  nvidiaCredentials: null,
  nvidiaPreferredModel: null,
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
  ollamaConfig: { host: null, model: null },
  lastSessionId: null,
  systemConfig: {},
  
  // Runtime clients
  anthropicClient: null,
  claudeCodeClient: null,
  ollamaClient: null
};
