/**
 * WebSocket message type constants
 * Mirrors the gateway's message types for consistency
 */

export const MessageTypes = {
  // Lifecycle
  PING: 'ping',
  PONG: 'pong',
  STATUS: 'status',

  // Chat
  STREAM_START: 'streamStart',
  STREAM_CHUNK: 'streamChunk',
  STREAM_END: 'streamEnd',
  ERROR: 'error',

  // History
  GET_HISTORY: 'getHistory',
  HISTORY: 'history',
  RELOAD_HISTORY: 'reloadHistory',

  // Tools
  TOOL_CALL: 'toolCall',
  TOOL_RESULT: 'toolResult',

  // Messaging
  PUSH_MESSAGE: 'pushMessage',

  // Authorization
  AUTH_REQUEST: 'authRequest',
  AUTH_RESPONSE: 'authResponse',

  // Notifications
  NOTIFICATION: 'notification',
  NOTIFICATION_DISMISSED: 'notificationDismissed',

  // Settings
  GET_SETTINGS: 'getSettings',
  SETTINGS: 'settings',
  GET_PROVIDERS: 'getProviders',
  PROVIDERS: 'providers',
  GET_DOCS: 'getDocs',
  DOCS_LIST: 'docsList',
  SET_PROVIDER: 'setProvider',
  PROVIDER_SET: 'providerSet',
  SET_OLLAMA_MODEL: 'setOllamaModel',
  OLLAMA_MODEL_SET: 'ollamaModelSet',

  // OAuth / API Keys
  START_OAUTH: 'startOAuth',
  OAUTH_URL: 'oauthUrl',
  COMPLETE_OAUTH: 'completeOAuth',
  SET_API_KEY: 'setApiKey',
  API_KEY_SET: 'apiKeySet',
  SET_BRAVE_API_KEY: 'setBraveApiKey',
  BRAVE_API_KEY_SET: 'braveApiKeySet'
};
