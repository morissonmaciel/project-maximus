/**
 * Tool execution handlers
 * Manages toolCall and toolResult events
 */

import { on } from '../lib/websocket.js';
import {
  setTyping,
  messagesStore,
  updateToolMessageById
} from '../state/messages.js';
import { generateId } from '../utils/helpers.js';

// Track tool call message IDs for updating results
const toolCallMessageIds = new Map();

export function installToolHandlers() {
  on('toolCall', (data) => {
    setTyping(false);

    // Remove any empty assistant message that may have been created
    const msgs = messagesStore.state.get().messages;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.meta && lastMsg.content === '') {
      messagesStore.loadHistory({ messages: msgs.slice(0, -1) });
    }

    // Create new tool message
    const toolMsgId = generateId();
    toolCallMessageIds.set(data.toolCallId, toolMsgId);

    messagesStore.addMessage({
      message: {
        id: toolMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        meta: {
          type: 'tool',
          toolCallId: data.toolCallId,
          toolName: data.name,
          reason: data.reason || data.input?.reason,
          status: 'running'
        }
      }
    });
  });

  on('toolResult', (data) => {
    updateToolMessageById(data.toolCallId, {
      status: data.success ? 'success' : 'error',
      result: data.result
    });
  });
}
