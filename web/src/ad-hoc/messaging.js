/**
 * Push messaging handlers
 * Manages pushMessage events from the server
 */

import { on } from '../lib/websocket.js';
import { messagesStore } from '../state/messages.js';
import { authStore } from '../state/auth.js';
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

  on('authRequest', (data) => {
    console.log('[Messaging] Received authRequest:', data);

    // Validate required fields with logging
    if (!data?.requestId) {
      console.warn('[Messaging] authRequest missing requestId');
      return;
    }
    if (!data?.tool) {
      console.warn('[Messaging] authRequest missing tool');
      return;
    }
    if (!data?.targetDir) {
      console.warn('[Messaging] authRequest missing targetDir');
      return;
    }
    if (!data?.reason) {
      console.warn('[Messaging] authRequest missing reason');
      return;
    }

    console.log('[Messaging] Setting pending auth request:', {
      requestId: data.requestId,
      tool: data.tool,
      targetDir: data.targetDir,
      reason: data.reason
    });

    authStore.setPendingRequest({
      requestId: data.requestId,
      tool: data.tool,
      targetDir: data.targetDir,
      reason: data.reason
    });

    console.log('[Messaging] Auth dialog should now be visible');
  });
}
