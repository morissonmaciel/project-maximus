/**
 * Push messaging handlers
 * Manages pushMessage events from the server
 */

import { on } from '../lib/websocket.js';
import { messagesStore } from '../state/messages.js';
import { generateId } from '../utils/helpers.js';

export function installMessagingHandlers() {
  on('pushMessage', (data) => {
    if (!data?.role || !data?.content) return;

    messagesStore.addMessage({
      message: {
        id: generateId(),
        role: data.role,
        content: data.content,
        timestamp: Date.now(),
        meta: data.meta || undefined
      }
    });
  });
}
