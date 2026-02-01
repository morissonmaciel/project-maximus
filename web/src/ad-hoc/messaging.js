/**
 * Push messaging handlers
 * Manages pushMessage events from the server
 */

import { on } from '../lib/websocket.js';
import { messagesStore } from '../state/messages.js';
import { authStore } from '../state/auth.js';
import { notificationStore } from '../state/notification.js';
import { connectionStore } from '../state/connection.js';
import { modelsStore, setAvailableModels } from '../state/models.js';
import { generateId } from '../utils/helpers.js';

/**
 * Show system notification if permission granted
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 */
function showSystemNotification(title, message) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/favicon.ico'
    });
  }
}

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

  on('notification', (data) => {
    const { title, message, notificationId } = data;

    // Show dialog
    notificationStore.addNotification({ notificationId, title, message });

    // Try to show system notification
    showSystemNotification(title, message);
  });

  // Model selection handlers
  on('models', (data) => {
    if (data?.models) {
      setAvailableModels(data.models);
    }
  });

  on('modelSet', (data) => {
    if (data?.success) {
      // Update connection store with new model
      connectionStore.setCurrentModel({ value: data.model });
      // Also update models store
      modelsStore.setSelectedModel({ model: data.model });
    }
  });
}
