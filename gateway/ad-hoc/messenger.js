/**
 * Messenger Classes for WebSocket Communication
 * Encapsulates message sending logic with type safety
 */

import { MessageTypes } from './types.js';

function buildMessage(type, payload) {
  return { type, ...payload };
}

/**
 * ClientMessenger - Send messages to a single WebSocket client
 */
export class ClientMessenger {
  constructor(ws) {
    this.ws = ws;
  }

  send(type, payload = {}) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(buildMessage(type, payload)));
    }
  }

  // Lifecycle
  pong(statusSnapshot) {
    this.send(MessageTypes.PONG, statusSnapshot);
  }

  status(config) {
    this.send(MessageTypes.STATUS, config);
  }

  gatewayState(state, message) {
    this.send(MessageTypes.GATEWAY_STATE, { state, message });
  }

  reloadRequest(message) {
    this.send(MessageTypes.RELOAD_REQUEST, { message });
  }

  // Chat & History
  chat(message) {
    this.send(MessageTypes.CHAT, { message });
  }

  pushMessage(content, meta = {}) {
    this.send(MessageTypes.PUSH_MESSAGE, { role: 'user', content, meta });
  }

  history(messages) {
    this.send(MessageTypes.HISTORY, { messages });
  }

  reloadHistory() {
    this.send(MessageTypes.RELOAD_HISTORY);
  }

  // Streaming
  streamStart() {
    this.send(MessageTypes.STREAM_START);
  }

  streamChunk(content) {
    this.send(MessageTypes.STREAM_CHUNK, { content });
  }

  streamEnd() {
    this.send(MessageTypes.STREAM_END);
  }

  // Tools
  toolCall(toolCallId, toolName, input) {
    this.send(MessageTypes.TOOL_CALL, { toolCallId, toolName, input });
  }

  toolResult(toolCallId, result, success) {
    this.send(MessageTypes.TOOL_RESULT, { toolCallId, result, success });
  }

  // Authorization
  authRequest(requestId, tool, targetDir, reason) {
    console.log('[Messenger] Sending authRequest:', { requestId, tool, targetDir, reason });
    this.send(MessageTypes.AUTH_REQUEST, { requestId, tool, targetDir, reason });
  }

  authResponse(requestId, authorized, reason) {
    this.send(MessageTypes.AUTH_RESPONSE, { requestId, authorized, reason });
  }

  notification(title, message, notificationId) {
    this.send(MessageTypes.NOTIFICATION, { title, message, notificationId });
  }

  // Auth
  apiKeySet(success, provider) {
    this.send(MessageTypes.API_KEY_SET, { success, provider });
  }

  oauthUrl(url) {
    this.send(MessageTypes.OAUTH_URL, { url });
  }

  apiKeyStatus(provider, configured) {
    this.send(MessageTypes.API_KEY_STATUS, { provider, configured });
  }

  credentialsCleared(provider) {
    this.send(MessageTypes.CREDENTIALS_CLEARED, { provider });
  }

  // Config
  settings(settings) {
    this.send(MessageTypes.SETTINGS, settings);
  }

  providers(providersList) {
    this.send(MessageTypes.PROVIDERS, { providers: providersList });
  }

  providerSet(provider) {
    this.send(MessageTypes.PROVIDER_SET, { provider });
  }

  ollamaModelSet(success, model) {
    this.send(MessageTypes.OLLAMA_MODEL_SET, { success, model });
  }

  braveApiKeySet(success) {
    this.send(MessageTypes.BRAVE_API_KEY_SET, { success });
  }

  // Memory
  docsList(docs) {
    this.send(MessageTypes.DOCS_LIST, { docs });
  }

  reingestResult(docId, success) {
    this.send(MessageTypes.REINGEST_RESULT, { docId, success });
  }

  reingestAllResult(success, count) {
    this.send(MessageTypes.REINGEST_ALL_RESULT, { success, count });
  }

  purgeToken(token) {
    this.send(MessageTypes.PURGE_TOKEN, { token });
  }

  purgeResult(success, deleted) {
    this.send(MessageTypes.PURGE_RESULT, { success, deleted });
  }

  // Errors
  error(message) {
    this.send(MessageTypes.ERROR, { message });
  }
}

/**
 * BroadcastMessenger - Send messages to all connected clients
 */
export class BroadcastMessenger {
  constructor(wss) {
    this.wss = wss;
  }

  broadcast(type, payload = {}) {
    const message = JSON.stringify(buildMessage(type, payload));
    this.wss.clients.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  }

  gatewayState(state, message) {
    this.broadcast(MessageTypes.GATEWAY_STATE, { state, message });
  }

  reloadRequest(message) {
    this.broadcast(MessageTypes.RELOAD_REQUEST, { message });
  }
}
