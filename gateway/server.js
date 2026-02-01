import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as anthropicAuth from './oauth/anthropic.js';
import * as openaiCodexAuth from './oauth/openai-codex.js';
import crypto from 'node:crypto';
import { createMemoryStore } from './memory/index.js';
import { buildMemoryPrompt } from './memory/search.js';
import {
  ONE_TIME_USER_MESSAGE,
  getSystemPrompt,
  needsOnboarding
} from './prompts/index.js';

// Tools Subsystem
import { createToolRunner } from './tools/tools-executer.js';
import { runAnthropicLoop, runOpenAICodexLoop, runOllamaLoop, runKimiLoop, runNvidiaLoop } from './tools/loops.js';

// Provider adapters (new)
import * as providers from './providers/index.js';
import { detectCredentialType } from './providers/anthropic.js';

// Config subsystem
import * as config from './config/index.js';
import { applyAwareness } from './self-awareness/apply-awareness.js';
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_OPENAI_CODEX_MODEL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
  DEFAULT_KIMI_ENDPOINT,
  DEFAULT_KIMI_REASONING_EFFORT,
  DEFAULT_NVIDIA_MODEL,
  DEFAULT_NVIDIA_MAX_TOKENS,
  DEFAULT_NVIDIA_ENDPOINT,
  DEFAULT_NVIDIA_TEMPERATURE,
  DEFAULT_NVIDIA_TOP_P,
  DEFAULT_NVIDIA_STREAM,
  DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS
} from './config/constants.js';

// External Skills subsystem
import * as externalSkills from './external-skills/index.js';
import { initCron } from './cron/index.js';

// Ad-Hoc Communication Subsystem
import { ClientMessenger, BroadcastMessenger, MessageTypes } from './ad-hoc/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.GATEWAY_PORT) || 8081;

let pendingOAuth = null;

// Runtime usage tracking
let runtimeStats = {
  anthropic: { usage: null, model: DEFAULT_MODEL, limits: { maxTokens: DEFAULT_MAX_TOKENS }, rateLimits: null },
  openaiCodex: { usage: null, model: DEFAULT_OPENAI_CODEX_MODEL, limits: { maxTokens: DEFAULT_MAX_TOKENS } },
  kimi: { usage: null, model: DEFAULT_KIMI_MODEL, limits: { maxTokens: DEFAULT_KIMI_MAX_OUTPUT_TOKENS } },
  nvidia: { usage: null, model: DEFAULT_NVIDIA_MODEL, limits: { maxTokens: DEFAULT_NVIDIA_MAX_TOKENS } },
  ollama: { usage: null }
};

// Purge memory confirmation token storage
let pendingPurgeToken = null;
let pendingPurgeExpiry = null;
const PURGE_TOKEN_TTL_MS = 30000; // 30 seconds to confirm

let cronStore = null;
const sessionSockets = new Map();
const sessionStates = new Map();

function enqueueCronMessage(sessionId, message) {
  const state = sessionStates.get(sessionId) || { busy: false, queue: [] };
  state.queue = Array.isArray(state.queue) ? state.queue : [];
  state.queue.push(message);
  sessionStates.set(sessionId, state);
}

async function triggerCronMessage(sessionId, content, meta = {}) {
  const ws = sessionSockets.get(sessionId);
  if (!ws || ws.readyState !== 1 || !content) return;
  const messenger = new ClientMessenger(ws);
  messenger.pushMessage(content, { source: 'cron', ...meta });
  const configState = config.getConfigState();
  await handleChat(ws, { type: 'chat', messages: [{ role: 'user', content }] }, configState, messenger, meta);
}

/**
 * Summarize text using the active provider
 * @param {string} text - Text to summarize
 * @param {string} provider - Provider name
 * @returns {Promise<string>} Summary
 */
/**
 * Summarize text using OpenAI Codex
 * @param {string} text - Text to summarize
 * @param {Object} configState - Gateway config state with credentials
 * @param {string} model - Model to use (defaults to runtime active model)
 * @returns {Promise<string>} Summary
 */
async function summarizeWithCodex(text, configState, model) {
  const { accessToken, accountId } = configState.openaiCodexCredentials;
  const systemPrompt = 'You are a summarization assistant. Provide a concise summary of the conversation provided by the user. Format with: 1) Narrative summary, 2) Key points (bullets), 3) Things to remember.';
  
  console.log(`[Summarize] Using OpenAI Codex for summarization with model: ${model}`);
  
  const { content } = await providers.openaiCodex.streamChat({
    model: model || DEFAULT_OPENAI_CODEX_MODEL, // Use provided model or default
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    tools: [], // No tools for summarization
    credentials: { accessToken, accountId },
    onEvent: () => {} // No-op, we don't stream for summarization
  });
  
  // Extract text from content array
  let summary = '';
  for (const item of content) {
    if (item.type === 'text') {
      summary += item.text;
    }
  }
  
  return summary;
}

async function summarizeWithProvider(text, provider) {
  const configState = config.getConfigState();
  const systemPrompt = 'You are a summarization assistant. Provide a concise summary of the conversation provided by the user. Format with: 1) Narrative summary, 2) Key points (bullets), 3) Things to remember.';
  
  try {
    switch (provider) {
      case 'anthropic': {
        if (!configState.anthropicClient) throw new Error('Anthropic not configured');
        const response = await configState.anthropicClient.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }]
        });
        return response.content[0]?.text || '';
      }
      case 'ollama': {
        if (!configState.ollamaClient) throw new Error('Ollama not configured');
        const response = await configState.ollamaClient.chat({
          model: configState.ollamaConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ]
        });
        return response.message?.content || '';
      }
      case 'openai-codex': {
        if (!configState.openaiCodexCredentials) {
          throw new Error('OpenAI Codex not configured');
        }
        // Use active model from runtimeStats, fallback to default
        const activeModel = runtimeStats.openaiCodex.model || DEFAULT_OPENAI_CODEX_MODEL;
        const summary = await summarizeWithCodex(text, configState, activeModel);
        return summary;
      }
      case 'kimi': {
        if (!configState.kimiCredentials) {
          throw new Error('Kimi not configured');
        }
        const { content } = await providers.kimi.streamChat({
          endpoint: configState.kimiConfig?.endpoint || DEFAULT_KIMI_ENDPOINT,
          apiKey: configState.kimiCredentials.apiKey,
          model: configState.kimiConfig?.model || DEFAULT_KIMI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          tools: [],
          maxTokens: configState.kimiConfig?.maxOutputTokens || DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
          reasoningEffort: configState.kimiConfig?.reasoningEffort || DEFAULT_KIMI_REASONING_EFFORT,
          stream: false,
          onEvent: () => {}
        });
        let summary = '';
        for (const item of content || []) {
          if (item.type === 'text') summary += item.text;
        }
        return summary;
      }
      case 'nvidia': {
        if (!configState.nvidiaCredentials) {
          throw new Error('NVIDIA not configured');
        }
        const { content } = await providers.nvidia.streamChat({
          endpoint: configState.nvidiaConfig?.endpoint || DEFAULT_NVIDIA_ENDPOINT,
          apiKey: configState.nvidiaCredentials.apiKey,
          model: configState.nvidiaConfig?.model || DEFAULT_NVIDIA_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          tools: [],
          maxTokens: configState.nvidiaConfig?.maxTokens || DEFAULT_NVIDIA_MAX_TOKENS,
          temperature: configState.nvidiaConfig?.temperature ?? DEFAULT_NVIDIA_TEMPERATURE,
          topP: configState.nvidiaConfig?.topP ?? DEFAULT_NVIDIA_TOP_P,
          stream: false,
          toolChoice: 'none',
          chatTemplateKwargs: configState.nvidiaConfig?.chatTemplateKwargs || DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS,
          onEvent: () => {}
        });
        let summary = '';
        for (const item of content || []) {
          if (item.type === 'text') summary += item.text;
        }
        return summary;
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err) {
    console.error(`[Summarize] Error with ${provider}:`, err.message);
    throw err;
  }
}

/**
 * Create a tool runner for a specific request context
 * @param {Object} context - Request context
 * @param {Object} context.memoryStore - Memory store for ingestion
 * @param {string} context.sessionId - Current session ID
 * @param {string} context.provider - Current provider name
 * @param {WebSocket} context.ws - WebSocket connection for client notifications
 * @returns {Function} runToolCall function
 */
function createRequestToolRunner({ memoryStore, sessionId, provider, ws }) {
  const skillsStore = {
    getSkillsList: () => externalSkills.getSkillsList(),
    reingestSkill: (store, id) => externalSkills.reingestSkill(store, id),
    getSkillDoc: (id) => externalSkills.getSkillDoc(id),
    addSkill: (skill, content) => externalSkills.addSkill(skill, content),
    getSkillById: (id) => externalSkills.getSkillById(id),
    removeSkill: (id) => externalSkills.removeSkill(id)
  };

  // Create messenger for client communication
  const messenger = new ClientMessenger(ws);

  return createToolRunner({
    getConfigurationSnapshot: () => config.buildConfigurationSnapshot({
      lastAnthropicUsage: runtimeStats.anthropic.usage,
      lastAnthropicModel: runtimeStats.anthropic.model,
      lastAnthropicLimits: runtimeStats.anthropic.limits,
      lastAnthropicRateLimits: runtimeStats.anthropic.rateLimits,
      lastOpenAICodexUsage: runtimeStats.openaiCodex.usage,
      lastOpenAICodexModel: runtimeStats.openaiCodex.model,
      lastOpenAICodexLimits: runtimeStats.openaiCodex.limits,
      lastKimiUsage: runtimeStats.kimi.usage,
      lastKimiModel: runtimeStats.kimi.model,
      lastKimiLimits: runtimeStats.kimi.limits,
      lastNvidiaUsage: runtimeStats.nvidia.usage,
      lastNvidiaModel: runtimeStats.nvidia.model,
      lastNvidiaLimits: runtimeStats.nvidia.limits,
      lastOllamaUsage: runtimeStats.ollama.usage,
      lastOllamaStatus: config.getLastOllamaStatus()
    }, gatewayState),
    getSystemConfig: () => config.getConfigState().systemConfig,
    memoryStore,
    sessionId,
    provider,
    summarizeMessages: (text) => summarizeWithProvider(text, provider),
    cronStore,
    skillsStore,
    messenger
  });
}

/**
 * Ensure valid token for provider
 * Refreshes OAuth tokens if expired
 */
async function ensureValidToken(targetProvider = 'anthropic') {
  const configState = config.getConfigState();
  
  if (targetProvider === 'anthropic') {
    const creds = configState.anthropicCredentials;
    if (!creds) return false;

    if (creds.type === 'apiKey') {
      return true;
    }

    if (creds.type === 'oauth') {
      if (anthropicAuth.isTokenExpired(creds.expiresAt)) {
        console.log('[Gateway] Refreshing Anthropic OAuth token...');
        try {
          const newTokens = await anthropicAuth.refreshToken(creds.refreshToken);
          config.updateConfig({
            anthropicCredentials: {
              ...creds,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
              expiresAt: newTokens.expiresAt
            }
          });
          console.log('[Gateway] Anthropic OAuth token refreshed');
        } catch (err) {
          console.error('[Gateway] Refresh failed:', err.message);
          return false;
        }
      }
      return true;
    }
    return false;
  }

  if (targetProvider === 'openai-codex') {
    const creds = configState.openaiCodexCredentials;
    if (!creds) return false;
    
    if (openaiCodexAuth.isTokenExpired(creds.expiresAt)) {
      console.log('[Gateway] Refreshing OpenAI Codex OAuth token...');
      try {
        const newTokens = await openaiCodexAuth.refreshToken(creds.refreshToken);
        const newCreds = {
           ...creds,
           accessToken: newTokens.accessToken, 
           refreshToken: newTokens.refreshToken,
           expiresAt: newTokens.expiresAt
        };
        
        if (newTokens.accountId) {
             newCreds.accountId = newTokens.accountId;
        }
        config.updateConfig({ openaiCodexCredentials: newCreds });
        console.log('[Gateway] OpenAI Codex OAuth token refreshed');
      } catch (err) {
        console.error('[Gateway] OpenAI Codex Refresh failed:', err.message);
        return false;
      }
    }
    return true;
  }

  return false;
}

// Initialize memory store
let memoryStore = null;
let gatewayState = 'preparing';
try {
  const defaultDbPath = path.join(process.env.HOME || process.cwd(), '.maximus', 'memory.db');
  memoryStore = createMemoryStore({
    dbPath: process.env.MEMORY_DB_PATH || defaultDbPath
  });
  if (memoryStore.schemaInfo?.ftsAvailable) {
    console.log('[Gateway] Memory index ready (fts enabled)');
  } else if (memoryStore.schemaInfo?.ftsError) {
    console.warn(`[Gateway] Memory index ready (fts disabled): ${memoryStore.schemaInfo.ftsError}`);
  } else {
    console.log('[Gateway] Memory index ready');
  }

  cronStore = initCron({ 
    memoryStore, 
    getConfigState: config.getConfigState,
    onNotify: async ({ sessionId, text, jobName }) => {
      const ws = sessionSockets.get(sessionId);
      const state = sessionStates.get(sessionId);
      if (!ws || ws.readyState !== 1 || !text) {
        return;
      }
      if (state?.busy) {
        enqueueCronMessage(sessionId, { content: text, meta: { job: jobName || null, hidden: true } });
        return;
      }
      await triggerCronMessage(sessionId, text, { job: jobName || null, hidden: true });
    }
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[Gateway] Memory index unavailable: ${message}`);
}

// WebSocket Server
const wss = new WebSocketServer({ port: PORT });
console.log(`[Gateway] WebSocket server running on ws://localhost:${PORT}`);

// Create broadcast messenger for sending messages to all clients
const broadcastMessenger = new BroadcastMessenger(wss);

// Status helpers
function sendStatus(ws) {
  const messenger = new ClientMessenger(ws);
  messenger.status(config.buildStatusSnapshot({ lastOllamaStatus: config.getLastOllamaStatus() }));
}

function setGatewayState(state, message) {
  gatewayState = state;
  broadcastMessenger.gatewayState(state, message);
}

function sendReloadRequest(message) {
  broadcastMessenger.reloadRequest(message);
}

// External Skills helpers (legacy compatibility)
function buildSkillContext(skillIds) {
  if (!skillIds || skillIds.length === 0) return '';
  
  const sections = ['Relevant Skills:'];
  
  for (const skillId of skillIds) {
    const skill = externalSkills.getSkillById(skillId);
    if (!skill) continue;
    
    const docContent = externalSkills.getSkillDoc(skillId);
    if (!docContent) continue;
    
    // Extract overview section (first 500 chars or first paragraph)
    const overviewMatch = docContent.match(/## Overview\s*\n([^#]+)/);
    const overview = overviewMatch ? overviewMatch[1].trim().slice(0, 300) : '';
    
    sections.push(`\n--- ${skill.name} ---`);
    sections.push(`Description: ${skill.description}`);
    if (overview) sections.push(`Overview: ${overview}`);
    if (skill.entrypoints && skill.entrypoints[0]) {
      sections.push(`Example: ${skill.entrypoints[0].command}`);
    }
  }
  
  return sections.join('\n');
}

function getDocsList() {
  // Return external skills as docs list for UI
  try {
    const skills = externalSkills.getSkillsList();
    return skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      docPath: skill.docPath,
      keywords: skill.keywords || []
    }));
  } catch (err) {
    return [];
  }
}

async function reingestDocByName(name) {
  // Re-ingest by skill ID
  return externalSkills.reingestSkill(memoryStore, name);
}

async function bootstrapDocsIfNeeded() {
  // Use new external skills bootstrap
  const result = await externalSkills.bootstrapSkills(memoryStore);
  if (!result.success) {
    console.warn(`[Gateway] Skills bootstrap: ${result.error}`);
  }
}

/**
 * Purge memory database and restart
 * Destructive operation - requires confirmation token
 */
async function purgeMemory() {
  if (!memoryStore) {
    return { success: false, error: 'Memory store not initialized' };
  }

  try {
    const dbPath = process.env.MEMORY_DB_PATH || 
      path.join(process.env.HOME || process.cwd(), '.maximus', 'memory.db');
    
    console.log('[Memory] Starting purge...');
    
    // Close DB connection if possible
    try {
      memoryStore.db.close();
      console.log('[Memory] Database connection closed');
    } catch (err) {
      console.warn('[Memory] Could not close DB cleanly:', err.message);
    }

    // Delete DB files
    const filesToDelete = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
    for (const file of filesToDelete) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`[Memory] Deleted: ${path.basename(file)}`);
        }
      } catch (err) {
        console.warn(`[Memory] Could not delete ${file}:`, err.message);
      }
    }

    // Recreate memory store
    memoryStore = createMemoryStore({ dbPath });
    console.log('[Memory] New memory store created');

    // Re-apply awareness bootstrap
    await applyAwareness(memoryStore, setGatewayState);
    console.log('[Memory] Awareness bootstrap complete');

    // Re-bootstrap skills
    await externalSkills.bootstrapSkills(memoryStore);
    console.log('[Memory] Skills bootstrap complete');

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Memory] Purge failed:', message);
    return { success: false, error: message };
  }
}

// Apply self-awareness bootstrap
applyAwareness(memoryStore, setGatewayState).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[Gateway] Memory bootstrap failed: ${message}`);
  setGatewayState('ready', 'Gateway ready.');
});

bootstrapDocsIfNeeded().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[Gateway] Docs bootstrap failed: ${message}`);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('[Gateway] Client connected');
  config.ensureSessionId();
  ws.sessionId = config.getConfigState().lastSessionId;
  sessionSockets.set(ws.sessionId, ws);
  if (!sessionStates.has(ws.sessionId)) {
    sessionStates.set(ws.sessionId, { busy: false, queue: [] });
  }

  // Create messenger for this connection
  const messenger = new ClientMessenger(ws);

  (async () => {
    await config.refreshOllamaStatus();
    sendStatus(ws);
    messenger.gatewayState(gatewayState);

    if (memoryStore) {
      try {
        const history = memoryStore.listMessages(ws.sessionId) || [];
        if (history.length) {
          messenger.history(history.map((row) => ({
            role: row.role,
            content: row.content,
            meta: row.meta
          })));
        }
      } catch (err) {
        // ignore history load failures
      }
    }
  })();

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const loggableTypes = new Set([
        'setApiKey',
        'setKimiApiKey',
        'setNvidiaApiKey',
        'setProvider',
        'setOllamaModel',
        'setBraveApiKey',
        'startOAuthFlow',
        'completeOAuthFlow'
      ]);
      if (loggableTypes.has(message.type)) {
        console.log(`[Gateway] WS message: ${message.type}`);
      }
      const configState = config.getConfigState();

      switch (message.type) {
        case 'ping':
          messenger.pong(config.buildStatusSnapshot({ lastOllamaStatus: config.getLastOllamaStatus() }));
          break;

        case 'requestReload':
          sendReloadRequest(message.message || 'Please reload the UI to continue.');
          break;

        case 'setApiKey': {
          const key = message.apiKey;
          const keyType = detectCredentialType(key);

          if (keyType === 'apiKey') {
            config.updateConfig({
                anthropicCredentials: { type: 'apiKey', apiKey: key }
            });
            if (!configState.provider) {
                config.updateProvider('anthropic');
            }
            messenger.apiKeySet(true, 'anthropic');
            sendStatus(ws);
          } else if (keyType === 'oauth') {
            messenger.error('OAuth token detected. Use the OAuth tab to authenticate.');
          } else {
            messenger.error('Unknown key format. Expected sk-ant-api...');
          }
          break;
        }

        case 'setKimiApiKey': {
          const apiKey = typeof message.apiKey === 'string' ? message.apiKey.trim() : '';
          if (!apiKey) {
            messenger.error('API key is required');
            break;
          }

          console.log('[Gateway] Setting Kimi API key');
          config.updateConfig({
            kimiCredentials: { apiKey },
            kimiConfig: {
              ...config.getConfigState().kimiConfig,
              endpoint: DEFAULT_KIMI_ENDPOINT,
              model: DEFAULT_KIMI_MODEL,
              legacyOpenAI: true,
              streaming: true,
              includeMaxOutputTokens: true,
              reasoningEffort: DEFAULT_KIMI_REASONING_EFFORT,
              maxOutputTokens: DEFAULT_KIMI_MAX_OUTPUT_TOKENS
            }
          });
          if (!configState.provider) {
            config.updateProvider('kimi');
          }
          messenger.apiKeySet(true, 'kimi');
          sendStatus(ws);
          break;
        }

        case 'setNvidiaApiKey': {
          const apiKey = typeof message.apiKey === 'string' ? message.apiKey.trim() : '';
          if (!apiKey) {
            messenger.error('API key is required');
            break;
          }

          console.log('[Gateway] Setting NVIDIA API key');
          config.updateConfig({
            nvidiaCredentials: { apiKey }
          });
          if (!configState.provider) {
            config.updateProvider('nvidia');
          }
          messenger.apiKeySet(true, 'nvidia');
          sendStatus(ws);
          break;
        }

        case 'startOAuthFlow': {
          try {
            const providerToAuth = message.provider || 'anthropic';
            let url, verifier, state;
            
            if (providerToAuth === 'openai-codex') {
               const result = await openaiCodexAuth.getAuthorizationUrl();
               url = result.url;
               verifier = result.verifier;
               state = result.state;
            } else {
               const result = await anthropicAuth.getAuthorizationUrl();
               url = result.url;
               verifier = result.verifier;
            }
            
            pendingOAuth = { verifier, state, provider: providerToAuth };
            messenger.oauthUrl(url);
          } catch (err) {
            messenger.error(err.message);
          }
          break;
        }

        case 'completeOAuthFlow': {
          if (!pendingOAuth) {
            messenger.error('No pending OAuth flow');
            break;
          }

          try {
            const { code, state } = message;
            const providerToAuth = pendingOAuth.provider || 'anthropic';
            console.log(`[Gateway] Exchanging OAuth code for ${providerToAuth}...`);

            if (providerToAuth === 'openai-codex') {
                const tokens = await openaiCodexAuth.exchangeCodeForTokens(code, state, pendingOAuth.verifier);
                config.updateConfig({
                    openaiCodexCredentials: {
                        type: 'oauth',
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresAt: tokens.expiresAt,
                        accountId: tokens.accountId
                    }
                });
                if (!configState.provider) {
                    config.updateProvider('openai-codex');
                }
            } else {
                const tokens = await anthropicAuth.exchangeCodeForTokens(code, state, pendingOAuth.verifier);
                config.updateConfig({
                    anthropicCredentials: {
                        type: 'oauth',
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresAt: tokens.expiresAt
                    }
                });
                if (!configState.provider) {
                    config.updateProvider('anthropic');
                }
            }

            pendingOAuth = null;
            console.log('[Gateway] OAuth configured successfully');
            messenger.apiKeySet(true, providerToAuth);
            sendStatus(ws);
          } catch (err) {
            console.error('[Gateway] OAuth failed:', err.message);
            messenger.error(err.message);
          }
          break;
        }

        case 'clearOAuthCredentials': {
          const providerToClear = message.provider || 'anthropic';
          console.log(`[Gateway] Clearing OAuth credentials for ${providerToClear}...`);

          if (providerToClear === 'openai-codex') {
            config.updateConfig({ openaiCodexCredentials: null });
          } else if (providerToClear === 'anthropic') {
            config.updateConfig({ anthropicCredentials: null });
          }

          messenger.credentialsCleared(providerToClear);
          sendStatus(ws);
          break;
        }

        case 'checkApiKey':
          messenger.apiKeyStatus('anthropic', !!configState.anthropicClient);
          break;

        case 'chat':
          await handleChat(ws, message, configState, messenger);
          break;

        case 'authResponse': {
          const { requestId, authorized, reason } = message;

          const resolver = global.__pendingAuthResolvers?.get(requestId);
          if (resolver) {
            resolver.resolve({ authorized, reason });
            global.__pendingAuthResolvers.delete(requestId);
          }

          const pendingOp = global.__pendingAuthOperations?.get(requestId);
          if (pendingOp) {
            const {
              sessionId: pendingSessionId,
              toolName,
              targetDir,
              originalReason
            } = pendingOp;

            if (memoryStore && toolName && targetDir) {
              memoryStore.setPermission(toolName, targetDir, {
                authorized: !!authorized,
                reason: reason || originalReason || 'User response'
              });
            }

            if (authorized) {
              const authEventContent = `[AUTHORIZATION EVENT]\nAuthorization granted for ${toolName} on ${targetDir}.\nThe user has approved your request: \"${originalReason || reason || ''}\"\n\nPlease retry your previous file operation now.\n[/AUTHORIZATION EVENT]`;
              const targetSessionId = pendingSessionId || ws.sessionId;
              const targetWs = sessionSockets.get(targetSessionId) || ws;
              const targetMessenger = new ClientMessenger(targetWs);
              targetMessenger.pushMessage(authEventContent, { source: 'authorization', hidden: true });
              await handleChat(
                targetWs,
                { type: 'chat', messages: [{ role: 'user', content: authEventContent }], sessionId: targetSessionId },
                config.getConfigState(),
                targetMessenger,
                { hidden: true, source: 'authorization' }
              );
            }

            global.__pendingAuthOperations?.delete(requestId);
          }

          break;
        }

        case 'setProvider': {
          const nextProvider = message.provider;
          try {
            config.updateProvider(nextProvider);
            if (nextProvider === 'ollama') {
                await config.refreshOllamaStatus();
            }
            messenger.providerSet(nextProvider);
            sendStatus(ws);
          } catch (err) {
            messenger.error(err.message);
          }
          break;
        }

        case 'setBraveApiKey': {
          const apiKey = typeof message.apiKey === 'string' ? message.apiKey.trim() : '';
          if (!apiKey) {
            messenger.braveApiKeySet(false);
            break;
          }
          config.updateSystemConfig({ web: { search: { brave_api_key: apiKey } } });
          messenger.braveApiKeySet(true);
          break;
        }

        case 'getDocs': {
          messenger.docsList(getDocsList());
          break;
        }

        case 'reingestDoc': {
          const name = typeof message.name === 'string' ? message.name : '';
          const result = await reingestDocByName(name);
          messenger.reingestResult(name, result.success);
          break;
        }

        case 'reingestAllDocs': {
          const result = await externalSkills.bootstrapSkills(memoryStore, { force: true });
          messenger.reingestAllResult(result.success, result.results?.ingested?.length || 0);
          break;
        }

        case 'requestPurgeMemory': {
          // Generate confirmation token
          const token = crypto.randomUUID();
          pendingPurgeToken = token;
          pendingPurgeExpiry = Date.now() + PURGE_TOKEN_TTL_MS;
          messenger.purgeToken(token);
          break;
        }

        case 'purgeMemory': {
          const { token } = message;

          // Validate token
          if (!pendingPurgeToken || pendingPurgeToken !== token) {
            messenger.purgeResult(false, 0);
            break;
          }

          if (Date.now() > pendingPurgeExpiry) {
            pendingPurgeToken = null;
            pendingPurgeExpiry = null;
            messenger.purgeResult(false, 0);
            break;
          }

          // Clear token
          pendingPurgeToken = null;
          pendingPurgeExpiry = null;

          // Execute purge
          const purgeResult = await purgeMemory();
          messenger.purgeResult(purgeResult.success, purgeResult.deleted || 0);

          if (purgeResult.success) {
            // Request UI reload
            sendReloadRequest('Memory has been purged and gateway restarted. Please reload.');
          }
          break;
        }

        case 'getProviders': {
          await config.refreshOllamaStatus();
          const currentConfig = config.getConfigState();
          const providersConfig = config.getProvidersConfig();

          // Build provider list, filtering out disabled providers
          const allProviders = [
            {
              id: 'anthropic',
              label: 'Anthropic',
              configured: !!currentConfig.anthropicClient,
              authType: currentConfig.anthropicCredentials?.type || null,
              enabled: providersConfig.anthropic?.enabled !== false
            },
            {
              id: 'openai-codex',
              label: 'OpenAI Codex',
              configured: !!currentConfig.openaiCodexCredentials,
              enabled: providersConfig['openai-codex']?.enabled !== false
            },
            {
              id: 'kimi',
              label: 'Kimi',
              configured: !!currentConfig.kimiCredentials,
              enabled: providersConfig.kimi?.enabled !== false
            },
            {
              id: 'nvidia',
              label: 'NVIDIA',
              configured: !!currentConfig.nvidiaCredentials,
              enabled: providersConfig.nvidia?.enabled !== false
            },
            {
              id: 'ollama',
              label: 'Ollama',
              reachable: config.getLastOllamaStatus()?.reachable ?? null,
              error: config.getLastOllamaStatus()?.error || null,
              model: currentConfig.ollamaConfig.model,
              enabled: providersConfig.ollama?.enabled !== false
            }
          ];

          // Filter to only enabled providers
          const enabledProviders = allProviders.filter(p => p.enabled);
          messenger.providers(enabledProviders);
          break;
        }

        case 'setOllamaModel': {
          const model = message.model;
          if (!model) {
            messenger.error('Model is required');
            break;
          }
          config.updateConfig({
              ollamaConfig: {
                  ...config.getConfigState().ollamaConfig,
                  model
              }
          });
          messenger.ollamaModelSet(true, model);
          sendStatus(ws);
          break;
        }

        case 'getSettings': {
          await config.refreshOllamaStatus();
          const runtimeState = {
            lastAnthropicUsage: runtimeStats.anthropic.usage,
            lastAnthropicModel: runtimeStats.anthropic.model,
            lastAnthropicLimits: runtimeStats.anthropic.limits,
            lastAnthropicRateLimits: runtimeStats.anthropic.rateLimits,
            lastOpenAICodexUsage: runtimeStats.openaiCodex.usage,
            lastOpenAICodexModel: runtimeStats.openaiCodex.model,
            lastOpenAICodexLimits: runtimeStats.openaiCodex.limits,
            lastKimiUsage: runtimeStats.kimi.usage,
            lastKimiModel: runtimeStats.kimi.model,
            lastKimiLimits: runtimeStats.kimi.limits,
            lastNvidiaUsage: runtimeStats.nvidia.usage,
            lastNvidiaModel: runtimeStats.nvidia.model,
            lastNvidiaLimits: runtimeStats.nvidia.limits,
            lastOllamaUsage: runtimeStats.ollama.usage,
            lastOllamaStatus: config.getLastOllamaStatus()
          };
          const settingsPayload = config.buildSettingsSnapshot(runtimeState);
          messenger.settings(settingsPayload);
          break;
        }

        case 'getHistory': {
          if (memoryStore) {
            try {
              const history = memoryStore.listMessages(ws.sessionId) || [];
              messenger.history(history.map((row) => ({
                role: row.role,
                content: row.content,
                meta: row.meta
              })));
            } catch (err) {
              messenger.error('Failed to load history');
            }
          }
          break;
        }

        case 'getModels': {
          const { provider: targetProvider } = message;
          const providerId = targetProvider || configState.provider;
          if (!providerId) {
            messenger.error('No provider specified');
            break;
          }
          const models = config.getProviderModels(providerId);
          messenger.models(models, providerId);
          break;
        }

        case 'setModel': {
          const { model, provider: targetProvider } = message;
          if (!model) {
            messenger.error('Model is required');
            break;
          }
          const providerId = targetProvider || configState.provider;
          if (!providerId) {
            messenger.error('No provider selected');
            break;
          }

          // Validate provider and model
          const validation = config.validateProviderAndModel(providerId, model);
          if (!validation.valid) {
            messenger.notification(
              'Provider Unavailable',
              validation.error || 'The selected provider is currently disabled or the model is not supported. Please select a different provider.',
              'provider-disabled'
            );
            messenger.modelSet(false, model, providerId);
            break;
          }

          // Update config with selected model
          config.updateConfig({ currentModel: model });
          messenger.modelSet(true, model, providerId);
          sendStatus(ws);
          break;
        }

        default:
          console.warn(`[Gateway] Unknown message type: ${message.type}`);
          messenger.error(`Unknown: ${message.type}`);
      }
    } catch (err) {
      messenger.error('Invalid message');
    }
  });

  ws.on('close', () => {
    sessionSockets.delete(ws.sessionId);
    sessionStates.delete(ws.sessionId);
    console.log('[Gateway] Client disconnected');
  });
  ws.on('error', (err) => console.error('[Gateway] Error:', err.message));
});

/**
 * Handle chat message
 * Refactored to use providers and messaging subsystems
 */
async function handleChat(ws, message, configState, messenger, meta = null) {
  const provider = configState.provider;
  if (!provider) {
    messenger.error('No provider selected');
    return;
  }

  // Validate provider is enabled
  if (!config.isProviderEnabled(provider)) {
    messenger.notification(
      'Provider Unavailable',
      `The selected provider '${provider}' is currently disabled. Please select a different provider.`,
      'provider-disabled'
    );
    messenger.error(`Provider '${provider}' is disabled`);
    return;
  }

  // Validate model if one is selected
  const currentModel = configState.currentModel;
  if (currentModel) {
    const validation = config.validateProviderAndModel(provider, currentModel);
    if (!validation.valid) {
      messenger.notification(
        'Model Unavailable',
        validation.error || 'The selected model is not supported by this provider. Please select a different model.',
        'model-unavailable'
      );
      messenger.error(validation.error || 'Invalid model selection');
      return;
    }
  }

  const state = sessionStates.get(ws.sessionId) || { busy: false, queue: [] };
  state.busy = true;
  sessionStates.set(ws.sessionId, state);

  const incomingMessages = Array.isArray(message.messages) ? message.messages : [];
  const inboundUserMessage = [...incomingMessages].reverse().find((msg) => msg.role === 'user' && msg.content);
  const inboundUserContent = inboundUserMessage?.content || message.content;
  let baseMessages = incomingMessages.length
    ? incomingMessages
    : [{ role: 'user', content: message.content }];

  if (memoryStore) {
    const history = memoryStore.listMessages(ws.sessionId) || [];
    baseMessages = history
      .filter((row) => !row.meta?.hidden)
      .map((row) => ({ role: row.role, content: row.content }));
    if (inboundUserContent) {
      const last = baseMessages[baseMessages.length - 1];
      if (!last || last.role !== 'user' || last.content !== inboundUserContent) {
        baseMessages = [...baseMessages, { role: 'user', content: inboundUserContent }];
      }
    }
  }

  const lastUserMessage = [...baseMessages].reverse().find((msg) => msg.role === 'user');
  const userText = lastUserMessage?.content;
  let memoryText = '';
  let outboundMessages = baseMessages;

  // Onboarding handling (memory-based)
  const includeOnboarding = needsOnboarding(memoryStore);
  if (includeOnboarding) {
    outboundMessages = [{ role: 'user', content: ONE_TIME_USER_MESSAGE }, ...baseMessages];
  }

  const sendState = (state) => {
    if (!state) return;
    setGatewayState(state, state === 'ready' ? 'Gateway ready.' : 'Gateway preparing memory.');
  };

  // Memory ingestion and search
  if (memoryStore && typeof userText === 'string') {
    setImmediate(() => {
      memoryStore.ingestText({
        sessionId: ws.sessionId,
        provider,
        role: 'user',
        text: userText,
        meta,
        onState: sendState
      }).catch(() => {});
    });

    try {
      const chunks = await memoryStore.searchSimilar({
        query: userText,
        limit: 5,
        sources: ['chat', 'system'],
        maxCandidates: 500,
        onState: sendState
      });
      memoryText = buildMemoryPrompt(chunks);
    } catch (err) {
      memoryText = '';
    }

    // Keyword-based skill matching
    try {
      const matchedSkills = externalSkills.matchSkills(userText);
      if (matchedSkills.length > 0) {
        const skillContext = buildSkillContext(matchedSkills.slice(0, 3)); // Top 3 matches
        if (skillContext) {
          memoryText = memoryText ? `${skillContext}\n\n${memoryText}` : skillContext;
        }
      }
    } catch (err) {
      // Skill matching is optional
      console.warn(`[Skills] Matching failed: ${err.message}`);
    }
  }

  // Pending cron events injection (if any)
  let pendingCronEventIds = [];
  if (cronStore && typeof cronStore.listPendingEvents === 'function') {
    const pending = cronStore.listPendingEvents(5);
    if (pending.length) {
      pendingCronEventIds = pending.map((evt) => evt.id);
      const cronBlock = cronStore.formatPendingEvents(pending);
      if (cronBlock) {
        memoryText = memoryText ? `${cronBlock}\n\n${memoryText}` : cronBlock;
      }
    }
  }

  const systemPromptText = getSystemPrompt({ 
    memoryText: null,
    skills: null,
    includeOnboarding
  });

  // Route to appropriate provider
  try {
    let assistantText = '';

    switch (provider) {
      case 'anthropic':
        assistantText = await handleAnthropicChat(ws, outboundMessages, systemPromptText, memoryText, configState, messenger);
        break;
      case 'ollama':
        assistantText = await handleOllamaChat(ws, outboundMessages, systemPromptText, memoryText, configState, messenger);
        break;
      case 'openai-codex':
        assistantText = await handleOpenAICodexChat(ws, outboundMessages, systemPromptText, memoryText, configState, messenger);
        break;
      case 'kimi':
        assistantText = await handleKimiChat(ws, outboundMessages, systemPromptText, memoryText, configState, messenger);
        break;
      case 'nvidia':
        assistantText = await handleNvidiaChat(ws, outboundMessages, systemPromptText, memoryText, configState, messenger);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Ingest assistant response
    if (memoryStore && assistantText) {
      setImmediate(() => {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider,
          role: 'assistant',
          text: assistantText
        }).catch(() => {});
      });
    }

    if (cronStore && pendingCronEventIds.length) {
      cronStore.markEventsNotified(pendingCronEventIds);
    }
  } catch (err) {
    messenger.error(err.message);
  } finally {
    const updated = sessionStates.get(ws.sessionId) || { busy: false, queue: [] };
    updated.busy = false;
    sessionStates.set(ws.sessionId, updated);

    const pending = Array.isArray(updated.queue) ? updated.queue : [];
    if (pending.length && sessionSockets.get(ws.sessionId)?.readyState === 1) {
      const next = pending.shift();
      updated.queue = pending;
      sessionStates.set(ws.sessionId, updated);
      setImmediate(() => {
        triggerCronMessage(ws.sessionId, next.content, next.meta).catch(() => {});
      });
    }
  }
}

/**
 * Handle Anthropic chat
 */
async function handleAnthropicChat(ws, messages, systemPrompt, memoryText, configState, messenger) {
  if (!configState.anthropicClient) {
    messenger.error('Not configured');
    return '';
  }

  const isValid = await ensureValidToken();
  if (!isValid) {
    messenger.error('Token expired. Re-authenticate.');
    return '';
  }

  // Create tool runner with request context for file operations
  const runToolCall = createRequestToolRunner({
    memoryStore,
    sessionId: ws.sessionId,
    provider: 'anthropic',
    ws
  });

  return await runAnthropicLoop({
    ws,
    client: configState.anthropicClient,
    baseMessages: messages,
    systemPrompt,
    memoryText,
    model: configState.currentModel || DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    isOAuth: configState.anthropicCredentials.type === 'oauth',
    runToolCall,
    memoryStore,
    onStats: (updates) => {
      if (updates.usage) runtimeStats.anthropic.usage = updates.usage;
      if (updates.model) runtimeStats.anthropic.model = updates.model;
      if (updates.rateLimits) runtimeStats.anthropic.rateLimits = updates.rateLimits;
      if (updates.limits) runtimeStats.anthropic.limits = updates.limits;
    }
  });
}

/**
 * Handle Ollama chat
 */
async function handleOllamaChat(ws, messages, systemPrompt, memoryText, configState, messenger) {
  if (!configState.ollamaConfig.model) {
    messenger.error('No Ollama model selected');
    return '';
  }

  await config.refreshOllamaStatus();
  if (!config.getLastOllamaStatus()?.reachable) {
    messenger.error(config.getLastOllamaStatus()?.error || 'Ollama unreachable');
    return '';
  }

  // Create tool runner with request context for file operations
  const runToolCall = createRequestToolRunner({
    memoryStore,
    sessionId: ws.sessionId,
    provider: 'ollama',
    ws
  });

  return await runOllamaLoop({
    ws,
    client: configState.ollamaClient,
    baseMessages: messages,
    systemPrompt,
    memoryText,
    model: configState.ollamaConfig.model,
    runToolCall,
    memoryStore,
    onStats: (updates) => {
      if (updates.usage) runtimeStats.ollama.usage = updates.usage;
    }
  });
}

/**
 * Handle OpenAI Codex chat
 */
async function handleOpenAICodexChat(ws, messages, systemPrompt, memoryText, configState, messenger) {
  if (!configState.openaiCodexCredentials) {
    messenger.error('Not configured');
    return '';
  }

  const isValid = await ensureValidToken('openai-codex');
  if (!isValid) {
    messenger.error('Token expired. Re-authenticate.');
    return '';
  }
  
  // Create tool runner with request context for file operations
  const runToolCall = createRequestToolRunner({
    memoryStore,
    sessionId: ws.sessionId,
    provider: 'openai-codex',
    ws
  });

  return await runOpenAICodexLoop({
    ws,
    credentials: configState.openaiCodexCredentials,
    baseMessages: messages,
    systemPrompt,
    memoryText,
    model: configState.currentModel || DEFAULT_OPENAI_CODEX_MODEL,
    runToolCall,
    memoryStore,
    onStats: (updates) => {
      if (updates.usage) runtimeStats.openaiCodex.usage = updates.usage;
      if (updates.model) runtimeStats.openaiCodex.model = updates.model;
    }
  });
}

/**
 * Handle Kimi chat (OpenAI-compatible)
 */
async function handleKimiChat(ws, messages, systemPrompt, memoryText, configState, messenger) {
  if (!configState.kimiCredentials?.apiKey) {
    messenger.error('Not configured');
    return '';
  }

  const startedAt = Date.now();
  const runToolCall = createRequestToolRunner({
    memoryStore,
    sessionId: ws.sessionId,
    provider: 'kimi',
    ws
  });

  const kimiConfig = {
    endpoint: configState.kimiConfig?.endpoint || DEFAULT_KIMI_ENDPOINT,
    model: configState.currentModel || configState.kimiConfig?.model || DEFAULT_KIMI_MODEL,
    maxOutputTokens: configState.kimiConfig?.maxOutputTokens || DEFAULT_KIMI_MAX_OUTPUT_TOKENS,
    reasoningEffort: configState.kimiConfig?.reasoningEffort || DEFAULT_KIMI_REASONING_EFFORT,
    streaming: configState.kimiConfig?.streaming !== false,
    includeMaxOutputTokens: configState.kimiConfig?.includeMaxOutputTokens !== false,
    apiKey: configState.kimiCredentials.apiKey
  };

  console.log(`[Gateway] Kimi request start: model=${kimiConfig.model} endpoint=${kimiConfig.endpoint}`);
  try {
    const result = await runKimiLoop({
      ws,
      config: kimiConfig,
      baseMessages: messages,
      systemPrompt,
      memoryText,
      runToolCall,
      memoryStore,
      onStats: (updates) => {
        if (updates.usage) runtimeStats.kimi.usage = updates.usage;
        if (updates.model) runtimeStats.kimi.model = updates.model;
        if (updates.limits) runtimeStats.kimi.limits = updates.limits;
      }
    });
    const elapsed = Date.now() - startedAt;
    console.log(`[Gateway] Kimi request success (${elapsed}ms)`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    console.error(`[Gateway] Kimi request failed (${elapsed}ms): ${err.message}`);
    throw err;
  }
}

/**
 * Handle NVIDIA chat
 */
async function handleNvidiaChat(ws, messages, systemPrompt, memoryText, configState, messenger) {
  if (!configState.nvidiaCredentials?.apiKey) {
    messenger.error('Not configured');
    return '';
  }

  const startedAt = Date.now();
  const runToolCall = createRequestToolRunner({
    memoryStore,
    sessionId: ws.sessionId,
    provider: 'nvidia',
    ws
  });

  const nvidiaConfig = {
    endpoint: configState.nvidiaConfig?.endpoint || DEFAULT_NVIDIA_ENDPOINT,
    model: configState.currentModel || configState.nvidiaConfig?.model || DEFAULT_NVIDIA_MODEL,
    maxTokens: configState.nvidiaConfig?.maxTokens || DEFAULT_NVIDIA_MAX_TOKENS,
    temperature: configState.nvidiaConfig?.temperature ?? DEFAULT_NVIDIA_TEMPERATURE,
    topP: configState.nvidiaConfig?.topP ?? DEFAULT_NVIDIA_TOP_P,
    stream: configState.nvidiaConfig?.stream !== false ? DEFAULT_NVIDIA_STREAM : false,
    toolChoice: configState.nvidiaConfig?.toolChoice || 'auto',
    chatTemplateKwargs: configState.nvidiaConfig?.chatTemplateKwargs || DEFAULT_NVIDIA_CHAT_TEMPLATE_KWARGS,
    timeoutMs: configState.nvidiaConfig?.timeoutMs,
    apiKey: configState.nvidiaCredentials.apiKey
  };

  console.log(`[Gateway] NVIDIA request start: model=${nvidiaConfig.model} endpoint=${nvidiaConfig.endpoint}`);
  try {
    const result = await runNvidiaLoop({
      ws,
      config: nvidiaConfig,
      baseMessages: messages,
      systemPrompt,
      memoryText,
      runToolCall,
      memoryStore,
      onStats: (updates) => {
        if (updates.usage) runtimeStats.nvidia.usage = updates.usage;
        if (updates.model) runtimeStats.nvidia.model = updates.model;
        if (updates.limits) runtimeStats.nvidia.limits = updates.limits;
      }
    });
    const elapsed = Date.now() - startedAt;
    console.log(`[Gateway] NVIDIA request success (${elapsed}ms)`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    console.error(`[Gateway] NVIDIA request failed (${elapsed}ms): ${err.message}`);
    throw err;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Gateway] Shutting down...');
  wss.close(() => process.exit(0));
});
