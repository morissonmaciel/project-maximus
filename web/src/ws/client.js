import { GATEWAY_URL } from '../config.js';

let ws = null;
let pingInterval = null;
let lastPingTime = null;
let listeners = {};

export function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

function emit(event, data) {
  (listeners[event] || []).forEach(cb => cb(data));
  (listeners['*'] || []).forEach(cb => cb(event, data));
}

export function connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    return;
  }

  try {
    ws = new WebSocket(GATEWAY_URL);

    ws.onopen = () => {
      emit('open');
      startPing();
    };

    ws.onclose = (event) => {
      emit('close', event);
      stopPing();
      // Auto-reconnect after 3 seconds
      setTimeout(() => connect(), 3000);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      emit('error', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        emit(data.type, data);
        emit('*', data);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };
  } catch (err) {
    console.error('[WebSocket] Failed to connect:', err);
    emit('error', err);
  }
}

export function disconnect() {
  stopPing();
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function send(message) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

function startPing() {
  pingInterval = setInterval(() => {
    lastPingTime = Date.now();
    send({ type: 'ping' });
  }, 10000);
}

function stopPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

export function getLatency() {
  return lastPingTime ? Date.now() - lastPingTime : null;
}

export function getLastPingTime() {
  return lastPingTime;
}
