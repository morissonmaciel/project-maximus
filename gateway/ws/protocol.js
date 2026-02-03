export function emit(ws, type, payload = {}) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type, ...payload }));
}

export function emitStreamStart(ws) {
  emit(ws, 'streamStart');
}

export function emitStreamChunk(ws, content) {
  emit(ws, 'streamChunk', { content });
}

export function emitStreamEnd(ws) {
  emit(ws, 'streamEnd');
}

export function emitSessionPatch(ws, patch) {
  emit(ws, 'sessionPatch', patch);
}

export function emitError(ws, message) {
  emit(ws, 'error', { message });
}
