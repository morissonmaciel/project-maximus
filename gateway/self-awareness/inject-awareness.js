export async function injectAwareness(memoryStore, items, onStateChange) {
  if (!memoryStore) return;

  if (onStateChange) {
    onStateChange('preparing', 'Preparing agent memory...');
  }

  for (const item of items) {
    await memoryStore.ingestText({
      sessionId: 'system',
      provider: 'system',
      role: 'system',
      text: `${item.title}\n${item.text}`,
      source: 'system',
      path: 'system:bootstrap',
      onState: (state) => {
        if (state && onStateChange) {
            onStateChange(state, 'Preparing agent memory...');
        }
      }
    });
  }
}
