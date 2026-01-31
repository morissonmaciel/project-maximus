export function extractAnthropicText(message) {
  if (!message || !Array.isArray(message.content)) return '';
  const parts = message.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text);
  return parts.join('');
}

export function extractAnthropicToolUses(message) {
  if (!message || !Array.isArray(message.content)) return [];
  return message.content.filter((block) => block.type === 'tool_use');
}

export function extractCodexText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
}

export function extractKimiText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
}

export function extractNvidiaText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
}
