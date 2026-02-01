/**
 * History loading handlers
 * Manages history and reloadHistory events
 */

import { on, send } from '../lib/websocket.js';
import {
  loadHistory,
  clearMessages,
  messagesStore
} from '../state/messages.js';
import { generateId } from '../utils/helpers.js';

export function installHistoryHandlers() {
  on('history', (data) => {
    if (!data.messages) return;

    // Clear existing messages before loading history
    clearMessages();

    const normalizedMessages = data.messages
      .filter(msg => msg.role !== 'system')  // Hide system messages from UI
      .filter(msg => !msg.meta?.hidden)  // Hide messages marked as hidden
      .map(msg => {
        if (msg.role === 'tool') {
          try {
            const toolData = JSON.parse(msg.content || '{}');
            return {
              id: msg.id || generateId(),
              role: 'assistant',
              content: '',
              timestamp: msg.timestamp || Date.now(),
              meta: {
                type: 'tool',
                toolCallId: toolData.toolCallId,
                toolName: toolData.name,
                reason: toolData.input?.reason || toolData.reason,
                status: toolData.success !== undefined
                  ? (toolData.success ? 'success' : 'error')
                  : 'running',
                result: toolData.result
              }
            };
          } catch (e) {
            return null;
          }
        }
        return msg;
      })
      .filter(Boolean);

    loadHistory(normalizedMessages);
  });

  on('reloadHistory', () => {
    // Request fresh history from server
    send({ type: 'getHistory' });
  });
}
