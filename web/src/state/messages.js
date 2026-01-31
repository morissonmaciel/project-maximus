import { createStore } from '@bunnix/redux';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const messagesStore = createStore({
  messages: [],
  isTyping: false,
  currentAssistantContent: ''
}, {
  addMessage: (state, { message }) => ({
    ...state,
    messages: [...state.messages, { ...message, id: generateId() }]
  }),
  
  updateLastMessage: (state, { content }) => {
    if (state.messages.length === 0) return state;
    const msgs = [...state.messages];
    const last = { ...msgs[msgs.length - 1], content };
    msgs[msgs.length - 1] = last;
    return { ...state, messages: msgs };
  },
  
  appendToLastMessage: (state, { text }) => {
    if (state.messages.length === 0) return state;
    const msgs = [...state.messages];
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    msgs[lastIdx] = { ...last, content: last.content + text };
    return { ...state, messages: msgs, currentAssistantContent: msgs[lastIdx].content };
  },
  
  setTyping: (state, { isTyping }) => ({ ...state, isTyping }),
  
  loadHistory: (state, { messages }) => ({
    ...state,
    messages: messages.map((msg, idx) => ({
      ...msg,
      id: msg.id || `hist-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`
    }))
  }),
  
  updateMessageByToolCallId: (state, { toolCallId, metaUpdates }) => {
    const msgs = state.messages.map(msg => {
      if (msg.meta?.toolCallId === toolCallId) {
        return { 
          ...msg, 
          meta: { ...msg.meta, ...metaUpdates } 
        };
      }
      return msg;
    });
    return { ...state, messages: msgs };
  },
  
  clearMessages: (state) => ({ ...state, messages: [] })
});

// Export derived atoms using .map() for reactivity
export const messages = messagesStore.state.map(s => s.messages);
export const isTyping = messagesStore.state.map(s => s.isTyping);
export const currentAssistantContent = messagesStore.state.map(s => s.currentAssistantContent);

// Helper functions
export function addMessage(role, content, metadata = {}) {
  messagesStore.addMessage({ message: { role, content, timestamp: Date.now(), ...metadata } });
}

export function appendToLastMessage(text) {
  messagesStore.appendToLastMessage({ text });
}

export function setTyping(typing) {
  messagesStore.setTyping({ isTyping: typing });
}

export function loadHistory(msgs) {
  messagesStore.loadHistory({ messages: msgs });
}

export function updateToolMessageById(toolCallId, metaUpdates) {
  messagesStore.updateMessageByToolCallId({ toolCallId, metaUpdates });
}

export function clearMessages() {
  messagesStore.clearMessages();
}
