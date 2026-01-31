export function buildStatusSnapshot(configState, runtimeState) {
  const { lastOllamaStatus } = runtimeState;
  const anthropicConfigured = !!configState.anthropicClient;
  const ollamaReachable = lastOllamaStatus?.reachable ?? null;
  const ollamaReady = !!configState.ollamaConfig.model && ollamaReachable === true;
  const openaiCodexConfigured = !!configState.openaiCodexCredentials;
  const kimiConfigured = !!configState.kimiCredentials;
  const nvidiaConfigured = !!configState.nvidiaCredentials;
  const provider = configState.provider;

  let providerReady = false;
  let providerError = null;

  if (provider === 'anthropic') {
    providerReady = anthropicConfigured;
  } else if (provider === 'ollama') {
    providerReady = ollamaReady;
    if (ollamaReachable === false) {
      providerError = lastOllamaStatus?.error || 'Ollama unreachable';
    }
  } else if (provider === 'openai-codex') {
    providerReady = openaiCodexConfigured;
  } else if (provider === 'kimi') {
    providerReady = kimiConfigured;
  } else if (provider === 'nvidia') {
    providerReady = nvidiaConfigured;
  }

  return {
    connected: true,
    provider,
    providerReady,
    providerError,
    anthropic: {
      configured: anthropicConfigured,
      authType: configState.anthropicCredentials?.type || null
    },
    ollama: {
      reachable: ollamaReachable,
      model: configState.ollamaConfig.model
    },
    'openai-codex': {
      configured: openaiCodexConfigured
    },
    kimi: {
      configured: kimiConfigured
    },
    nvidia: {
      configured: nvidiaConfigured
    }
  };
}

export function buildConfigurationSnapshot({ configState, runtimeState, gatewayState }) {
  const status = buildStatusSnapshot(configState, runtimeState);
  const {
    lastAnthropicUsage,
    lastAnthropicModel,
    lastAnthropicLimits,
    lastAnthropicRateLimits,
    lastOpenAICodexUsage,
    lastOpenAICodexModel,
    lastOpenAICodexLimits,
    lastKimiUsage,
    lastKimiModel,
    lastKimiLimits,
    lastNvidiaUsage,
    lastNvidiaModel,
    lastNvidiaLimits,
    lastOllamaUsage
  } = runtimeState;
  
  return {
    sessionId: configState.lastSessionId,
    gatewayState,
    provider: configState.provider,
    providerReady: status.providerReady,
    providers: {
      anthropic: {
        configured: !!configState.anthropicClient,
        authType: configState.anthropicCredentials?.type || null,
        model: lastAnthropicModel,
        limits: {
          maxTokens: lastAnthropicLimits.maxTokens,
          rate: lastAnthropicRateLimits
        },
        usage: lastAnthropicUsage
      },
      ollama: {
        configured: !!configState.ollamaConfig.model,
        reachable: runtimeState.lastOllamaStatus?.reachable ?? null,
        model: configState.ollamaConfig.model,
        usage: lastOllamaUsage
      },
      'openai-codex': {
        configured: !!configState.openaiCodexCredentials,
        model: lastOpenAICodexModel,
        limits: {
          maxTokens: lastOpenAICodexLimits.maxTokens
        },
        usage: lastOpenAICodexUsage
      },
      kimi: {
        configured: !!configState.kimiCredentials,
        model: lastKimiModel,
        limits: {
          maxTokens: lastKimiLimits.maxTokens
        },
        usage: lastKimiUsage
      },
      nvidia: {
        configured: !!configState.nvidiaCredentials,
        model: lastNvidiaModel,
        limits: {
          maxTokens: lastNvidiaLimits.maxTokens
        },
        usage: lastNvidiaUsage
      }
    },
    system: {
      web: {
        search: {
          brave_api_key_configured: !!configState.systemConfig?.web?.search?.brave_api_key
        }
      }
    }
  };
}

export function buildSettingsSnapshot(configState, runtimeState) {
    const { 
        lastAnthropicUsage, 
        lastAnthropicModel, 
        lastAnthropicLimits, 
        lastAnthropicRateLimits,
        lastOpenAICodexUsage,
        lastOpenAICodexModel,
        lastOpenAICodexLimits,
        lastKimiUsage,
        lastKimiModel,
        lastKimiLimits,
        lastNvidiaUsage,
        lastNvidiaModel,
        lastNvidiaLimits,
        lastOllamaUsage,
        lastOllamaStatus
    } = runtimeState;
    
    return {
        provider: configState.provider,
        providers: {
          anthropic: {
            configured: !!configState.anthropicClient,
            authType: configState.anthropicCredentials?.type || null,
            model: lastAnthropicModel,
            usage: lastAnthropicUsage,
            limits: {
              maxTokens: lastAnthropicLimits.maxTokens,
              rate: lastAnthropicRateLimits
            }
          },
          'openai-codex': {
             configured: !!configState.openaiCodexCredentials,
             model: lastOpenAICodexModel,
             usage: lastOpenAICodexUsage,
             limits: {
               maxTokens: lastOpenAICodexLimits.maxTokens
             }
          },
          kimi: {
             configured: !!configState.kimiCredentials,
             model: lastKimiModel,
             usage: lastKimiUsage,
             limits: {
               maxTokens: lastKimiLimits.maxTokens
             }
          },
          nvidia: {
             configured: !!configState.nvidiaCredentials,
             model: lastNvidiaModel,
             usage: lastNvidiaUsage,
             limits: {
               maxTokens: lastNvidiaLimits.maxTokens
             }
          },
          ollama: {
            host: configState.ollamaConfig.host,
            model: configState.ollamaConfig.model,
            reachable: lastOllamaStatus?.reachable ?? null,
            error: lastOllamaStatus?.error || null,
            models: lastOllamaStatus?.models || [],
            usage: lastOllamaUsage
          }
        },
        system: {
          web: {
            search: {
              brave_api_key_configured: !!configState.systemConfig?.web?.search?.brave_api_key
            }
          }
        }
    };
}
