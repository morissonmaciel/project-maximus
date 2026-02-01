/**
 * WebSocket Message Types
 * Centralized constants for gateway -> client communication
 */

export const MessageTypes = {
  // Lifecycle
  PING: 'ping',
  PONG: 'pong',
  STATUS: 'status',
  GATEWAY_STATE: 'gatewayState',
  RELOAD_REQUEST: 'reloadRequest',

  // Authentication
  API_KEY_SET: 'apiKeySet',
  OAUTH_URL: 'oauthUrl',
  API_KEY_STATUS: 'apiKeyStatus',
  CREDENTIALS_CLEARED: 'credentialsCleared',

  // Chat & Streaming
  CHAT: 'chat',
  PUSH_MESSAGE: 'pushMessage',
  HISTORY: 'history',
  RELOAD_HISTORY: 'reloadHistory',
  STREAM_START: 'streamStart',
  STREAM_CHUNK: 'streamChunk',
  STREAM_END: 'streamEnd',
  TOOL_CALL: 'toolCall',
  TOOL_RESULT: 'toolResult',

  // Authorization
  AUTH_REQUEST: 'authRequest',
  AUTH_RESPONSE: 'authResponse',

  // Notifications
  NOTIFICATION: 'notification',
  NOTIFICATION_DISMISSED: 'notificationDismissed',

  // Configuration
  SETTINGS: 'settings',
  PROVIDERS: 'providers',
  PROVIDER_SET: 'providerSet',
  OLLAMA_MODEL_SET: 'ollamaModelSet',
  BRAVE_API_KEY_SET: 'braveApiKeySet',

  // Memory & Docs
  DOCS_LIST: 'docsList',
  REINGEST_RESULT: 'reingestDocResult',
  REINGEST_ALL_RESULT: 'reingestAllDocsResult',
  PURGE_TOKEN: 'purgeMemoryToken',
  PURGE_RESULT: 'purgeMemoryResult',

  // Errors
  ERROR: 'error'
};
