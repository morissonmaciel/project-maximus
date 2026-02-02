export function buildStatusSnapshot(configState, runtimeState, providersConfig = {}) {
  const { lastOllamaStatus } = runtimeState;
  const anthropicConfigured = !!configState.anthropicCredentials;
  const claudeCodeConfigured = !!configState.claudeCodeCredentials;
  const ollamaReachable = lastOllamaStatus?.reachable ?? null;
  const ollamaReady = !!configState.ollamaConfig.model && ollamaReachable === true;
  const openaiCodexConfigured = !!configState.openaiCodexCredentials;
  const kimiConfigured = !!configState.kimiCredentials;
  const nvidiaConfigured = !!configState.nvidiaCredentials;
  const provider = configState.provider;

  // Check provider enabled status from config
  const isProviderEnabled = (id) => {
    const providerCfg = providersConfig[id];
    return providerCfg ? providerCfg.enabled !== false : true;
  };

  let providerReady = false;
  let providerError = null;

  if (provider === 'anthropic') {
    providerReady = anthropicConfigured && isProviderEnabled('anthropic');
  } else if (provider === 'claude-code') {
    providerReady = claudeCodeConfigured && isProviderEnabled('claude-code');
  } else if (provider === 'ollama') {
    providerReady = ollamaReady && isProviderEnabled('ollama');
    if (ollamaReachable === false) {
      providerError = lastOllamaStatus?.error || 'Ollama unreachable';
    }
  } else if (provider === 'openai-codex') {
    providerReady = openaiCodexConfigured && isProviderEnabled('openai-codex');
  } else if (provider === 'kimi') {
    providerReady = kimiConfigured && isProviderEnabled('kimi');
  } else if (provider === 'nvidia') {
    providerReady = nvidiaConfigured && isProviderEnabled('nvidia');
  }

  return {
    connected: true,
    provider,
    providerReady,
    providerError,
    currentModel: configState.currentModel || null,
    anthropic: {
      configured: anthropicConfigured,
      authType: configState.anthropicCredentials?.type || null,
      enabled: isProviderEnabled('anthropic')
    },
    'claude-code': {
      configured: claudeCodeConfigured,
      authType: configState.claudeCodeCredentials?.type || null,
      enabled: isProviderEnabled('claude-code')
    },
    ollama: {
      reachable: ollamaReachable,
      model: configState.ollamaConfig.model,
      enabled: isProviderEnabled('ollama')
    },
    'openai-codex': {
      configured: openaiCodexConfigured,
      enabled: isProviderEnabled('openai-codex')
    },
    kimi: {
      configured: kimiConfigured,
      enabled: isProviderEnabled('kimi')
    },
    nvidia: {
      configured: nvidiaConfigured,
      enabled: isProviderEnabled('nvidia')
    }
  };
}

export function buildConfigurationSnapshot({ configState, runtimeState, gatewayState }, providersConfig = {}) {
  const status = buildStatusSnapshot(configState, runtimeState, providersConfig);
  const {
    lastAnthropicUsage,
    lastAnthropicModel,
    lastAnthropicLimits,
    lastAnthropicRateLimits,
    lastClaudeCodeUsage,
    lastClaudeCodeModel,
    lastClaudeCodeLimits,
    lastClaudeCodeRateLimits,
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

  // Get provider models from config
  const getProviderModels = (id) => {
    const cfg = providersConfig[id];
    return cfg?.models || [];
  };

  const isProviderEnabled = (id) => {
    const cfg = providersConfig[id];
    return cfg ? cfg.enabled !== false : true;
  };

  return {
    sessionId: configState.lastSessionId,
    gatewayState,
    provider: configState.provider,
    currentModel: configState.currentModel || null,
    providerReady: status.providerReady,
    providers: {
      anthropic: {
        configured: !!configState.anthropicClient,
        authType: configState.anthropicCredentials?.type || null,
        model: lastAnthropicModel,
        enabled: isProviderEnabled('anthropic'),
        models: getProviderModels('anthropic'),
        limits: {
          maxTokens: lastAnthropicLimits.maxTokens,
          rate: lastAnthropicRateLimits
        },
        usage: lastAnthropicUsage
      },
      'claude-code': {
        configured: !!configState.claudeCodeClient,
        authType: configState.claudeCodeCredentials?.type || null,
        model: lastClaudeCodeModel,
        enabled: isProviderEnabled('claude-code'),
        models: getProviderModels('claude-code'),
        limits: {
          maxTokens: lastClaudeCodeLimits.maxTokens,
          rate: lastClaudeCodeRateLimits
        },
        usage: lastClaudeCodeUsage
      },
      ollama: {
        configured: !!configState.ollamaConfig.model,
        reachable: runtimeState.lastOllamaStatus?.reachable ?? null,
        model: configState.ollamaConfig.model,
        enabled: isProviderEnabled('ollama'),
        models: runtimeState.lastOllamaStatus?.models || [],
        usage: lastOllamaUsage
      },
      'openai-codex': {
        configured: !!configState.openaiCodexCredentials,
        model: lastOpenAICodexModel,
        enabled: isProviderEnabled('openai-codex'),
        models: getProviderModels('openai-codex'),
        limits: lastOpenAICodexLimits || null,
        usage: lastOpenAICodexUsage
      },
      kimi: {
        configured: !!configState.kimiCredentials,
        model: lastKimiModel,
        enabled: isProviderEnabled('kimi'),
        models: getProviderModels('kimi'),
        limits: {
          maxTokens: lastKimiLimits.maxTokens
        },
        usage: lastKimiUsage
      },
      nvidia: {
        configured: !!configState.nvidiaCredentials,
        model: lastNvidiaModel,
        enabled: isProviderEnabled('nvidia'),
        models: getProviderModels('nvidia'),
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

export function buildSettingsSnapshot(configState, runtimeState, providersConfig = {}) {
    const {
        lastAnthropicUsage,
        lastAnthropicModel,
        lastAnthropicLimits,
        lastAnthropicRateLimits,
        lastAnthropicAccumulatedUsage,
        lastClaudeCodeUsage,
        lastClaudeCodeModel,
        lastClaudeCodeLimits,
        lastClaudeCodeRateLimits,
        lastClaudeCodeAccumulatedUsage,
        lastOpenAICodexUsage,
        lastOpenAICodexModel,
        lastOpenAICodexLimits,
        lastOpenAICodexAccumulatedUsage,
        lastKimiUsage,
        lastKimiModel,
        lastKimiLimits,
        lastKimiAccumulatedUsage,
        lastNvidiaUsage,
        lastNvidiaModel,
        lastNvidiaLimits,
        lastNvidiaAccumulatedUsage,
        lastOllamaUsage,
        lastOllamaAccumulatedUsage,
        lastOllamaStatus
    } = runtimeState;

    // Get provider models from config
    const getProviderModels = (id) => {
        const cfg = providersConfig[id];
        return cfg?.models || [];
    };

    const isProviderEnabled = (id) => {
        const cfg = providersConfig[id];
        return cfg ? cfg.enabled !== false : true;
    };

    return {
        provider: configState.provider,
        currentModel: configState.currentModel || null,
        providers: {
          anthropic: {
            configured: !!configState.anthropicCredentials,
            authType: configState.anthropicCredentials?.type || null,
            model: lastAnthropicModel,
            preferredModel: configState.anthropicPreferredModel,
            enabled: isProviderEnabled('anthropic'),
            models: getProviderModels('anthropic'),
            usage: lastAnthropicUsage,
            accumulatedUsage: lastAnthropicAccumulatedUsage || null,
            limits: {
              maxTokens: lastAnthropicLimits.maxTokens,
              rate: lastAnthropicRateLimits
            }
          },
          'claude-code': {
            configured: !!configState.claudeCodeCredentials,
            authType: configState.claudeCodeCredentials?.type || null,
            model: lastClaudeCodeModel,
            preferredModel: configState.claudeCodePreferredModel,
            enabled: isProviderEnabled('claude-code'),
            models: getProviderModels('claude-code'),
            usage: lastClaudeCodeUsage,
            accumulatedUsage: lastClaudeCodeAccumulatedUsage || null,
            limits: {
              maxTokens: lastClaudeCodeLimits.maxTokens,
              rate: lastClaudeCodeRateLimits
            }
          },
      'openai-codex': {
             configured: !!configState.openaiCodexCredentials,
             model: lastOpenAICodexModel,
             preferredModel: configState.openaiCodexPreferredModel,
             enabled: isProviderEnabled('openai-codex'),
             models: getProviderModels('openai-codex'),
             usage: lastOpenAICodexUsage,
             accumulatedUsage: lastOpenAICodexAccumulatedUsage || null,
             limits: lastOpenAICodexLimits || null
          },
          kimi: {
             configured: !!configState.kimiCredentials,
             model: lastKimiModel,
             preferredModel: configState.kimiPreferredModel,
             enabled: isProviderEnabled('kimi'),
             models: getProviderModels('kimi'),
             usage: lastKimiUsage,
             accumulatedUsage: lastKimiAccumulatedUsage || null,
             limits: {
               maxTokens: lastKimiLimits.maxTokens
             }
          },
          nvidia: {
             configured: !!configState.nvidiaCredentials,
             model: lastNvidiaModel,
             preferredModel: configState.nvidiaPreferredModel,
             enabled: isProviderEnabled('nvidia'),
             models: getProviderModels('nvidia'),
             usage: lastNvidiaUsage,
             accumulatedUsage: lastNvidiaAccumulatedUsage || null,
             limits: {
               maxTokens: lastNvidiaLimits.maxTokens
             }
          },
          ollama: {
            host: configState.ollamaConfig.host,
            model: configState.ollamaConfig.model,
            preferredModel: configState.ollamaConfig.model,
            reachable: lastOllamaStatus?.reachable ?? null,
            error: lastOllamaStatus?.error || null,
            models: lastOllamaStatus?.models || [],
            enabled: isProviderEnabled('ollama'),
            usage: lastOllamaUsage,
            accumulatedUsage: lastOllamaAccumulatedUsage || null
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
