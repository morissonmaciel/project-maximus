import { on, send, getLastPingTime } from './client.js';
import {
  addMessage,
  appendToLastAssistant,
  setProcessingState,
  setSession,
  updateToolMessageById,
  sessionStore
} from '../state/session.js';
import { configStore } from '../state/config.js';
import { setCatalog } from '../state/catalog.js';
import { generateId } from '../utils/helpers.js';

export function installWsHandlers() {
  on('open', () => {
    configStore.setConnected({ value: true });
    send({ type: 'getConfig' });
    send({ type: 'getCatalog' });
    send({ type: 'getSession' });
  });

  on('close', () => {
    configStore.setConnected({ value: false });
    configStore.setLatency({ value: 0 });
    setProcessingState('idle');
  });

  on('pong', () => {
    const lastPing = getLastPingTime();
    if (lastPing) {
      const latency = Date.now() - lastPing;
      configStore.setLatency({ value: latency });
    }
  });

  on('config', (data) => {
    configStore.setConfig({ config: data });
  });

  on('catalog', (data) => {
    setCatalog(data);
  });

  on('session', (data) => {
    setSession({
      sessionId: data.sessionId,
      messages: (data.messages || [])
        .filter(msg => msg.role !== 'system')
        .filter(msg => !msg.meta?.hidden)
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
        .filter(Boolean)
    });
  });

  on('reloadHistory', () => {
    send({ type: 'getSession' });
  });

  on('sessionPatch', (data) => {
    if (!data || !data.op) return;

    switch (data.op) {
      case 'addMessage': {
        const message = data.message;
        if (!message) return;
        if (message.role === 'system' || message.meta?.hidden) return;
        sessionStore.addMessage({ message });
        break;
      }
      case 'toolStart': {
        const toolMsgId = generateId();
        sessionStore.addMessage({
          message: {
            id: toolMsgId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            meta: {
              type: 'tool',
              toolCallId: data.toolCallId,
              toolName: data.toolName,
              reason: data.reason,
              status: 'running'
            }
          }
        });
        break;
      }
      case 'toolEnd': {
        updateToolMessageById(data.toolCallId, {
          status: data.success ? 'success' : 'error',
          result: data.result
        });
        break;
      }
      default:
        break;
    }
  });

  on('streamStart', () => {
    setProcessingState('processing');
  });

  on('streamChunk', (data) => {
    if (data.content) {
      const msgs = sessionStore.state.get().messages;
      const lastMsg = msgs[msgs.length - 1];
      if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.meta?.type === 'tool') {
        addMessage('assistant', data.content);
      } else {
        appendToLastAssistant(data.content);
      }
    }
  });

  on('streamEnd', () => {
    setProcessingState('idle');
  });

  on('error', () => {
    setProcessingState('idle');
  });
}
