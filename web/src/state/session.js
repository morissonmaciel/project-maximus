import { createStore } from '@bunnix/redux';
import { generateId } from '../utils/helpers.js';

export const sessionStore = createStore({
  sessionId: null,
  messages: [],
  processingState: 'idle'
}, {
  setSession: (state, { sessionId, messages }) => ({
    ...state,
    sessionId: sessionId ?? state.sessionId,
    messages: (messages || []).map((msg, idx) => ({
      ...msg,
      id: msg.id || `hist-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`
    }))
  }),

  addMessage: (state, { message }) => ({
    ...state,
    messages: [...state.messages, { ...message, id: message.id || generateId() }]
  }),

  appendToLastAssistant: (state, { text }) => {
    if (state.messages.length === 0) return state;
    const msgs = [...state.messages];
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    if (last.role !== 'assistant' || last.meta?.type === 'tool') return state;
    msgs[lastIdx] = { ...last, content: (last.content || '') + text };
    return { ...state, messages: msgs };
  },

  updateMessageByToolCallId: (state, { toolCallId, metaUpdates }) => {
    const msgs = state.messages.map(msg => {
      if (msg.meta?.toolCallId === toolCallId) {
        return { ...msg, meta: { ...msg.meta, ...metaUpdates } };
      }
      return msg;
    });
    return { ...state, messages: msgs };
  },

  setProcessingState: (state, { value }) => ({ ...state, processingState: value }),

  clearMessages: (state) => ({ ...state, messages: [] })
});

// Reactive selectors
export const messages = sessionStore.state.map(s => s.messages);
export const processingState = sessionStore.state.map(s => s.processingState);

// Helper functions
export function setSession(session) {
  sessionStore.setSession(session);
}

export function addMessage(role, content, meta = {}) {
  sessionStore.addMessage({
    message: {
      role,
      content,
      timestamp: Date.now(),
      meta
    }
  });
}

export function appendToLastAssistant(text) {
  sessionStore.appendToLastAssistant({ text });
}

export function updateToolMessageById(toolCallId, metaUpdates) {
  sessionStore.updateMessageByToolCallId({ toolCallId, metaUpdates });
}

export function setProcessingState(value) {
  sessionStore.setProcessingState({ value });
}

export function clearMessages() {
  sessionStore.clearMessages();
}
