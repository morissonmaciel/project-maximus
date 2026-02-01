/**
 * WebSocket handlers public API
 * Centralizes all WebSocket event handlers for the web client
 */

import { setWsSend as setConnectionWsSend } from '../state/connection.js';
import { setWsSend as setSettingsWsSend } from '../state/settings.js';
import { setWsSend as setModelsWsSend } from '../state/models.js';
import { send } from '../lib/websocket.js';

import { installLifecycleHandlers } from './lifecycle.js';
import { installChatHandlers } from './chat.js';
import { installHistoryHandlers } from './history.js';
import { installToolHandlers } from './tools.js';
import { installSettingsHandlers } from './settings.js';
import { installMessagingHandlers } from './messaging.js';

export { MessageTypes } from './types.js';
export { installLifecycleHandlers } from './lifecycle.js';
export { installChatHandlers } from './chat.js';
export { installHistoryHandlers } from './history.js';
export { installToolHandlers } from './tools.js';
export { installSettingsHandlers } from './settings.js';
export { installMessagingHandlers } from './messaging.js';

/**
 * Install all WebSocket handlers at once
 * This is the main entry point for initializing the handler system
 */
export function installAllHandlers() {
  // Pass send function to stores that need it
  setConnectionWsSend(send);
  setSettingsWsSend(send);
  setModelsWsSend(send);

  // Install all handler modules
  installLifecycleHandlers();
  installChatHandlers();
  installHistoryHandlers();
  installToolHandlers();
  installSettingsHandlers();
  installMessagingHandlers();
}
