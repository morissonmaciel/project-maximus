/**
 * Chat streaming handlers
 * Manages streamStart, streamChunk, streamEnd, and error events
 */

import { on } from '../lib/websocket.js';
import {
  messagesStore,
  addMessage,
  appendToLastMessage,
  setTyping
} from '../state/messages.js';

export function installChatHandlers() {
  on('streamStart', () => {
    setTyping(true);
    // Don't add empty assistant message - wait to see if it's a tool call
  });

  on('streamChunk', (data) => {
    if (data.content) {
      // Create assistant message on first chunk if needed
      const msgs = messagesStore.state.get().messages;
      const lastMsg = msgs[msgs.length - 1];
      if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.meta?.type === 'tool') {
        addMessage('assistant', data.content);
      } else {
        appendToLastMessage(data.content);
      }
    }
  });

  on('streamEnd', () => {
    setTyping(false);
  });

  on('error', () => {
    setTyping(false);
  });
}
