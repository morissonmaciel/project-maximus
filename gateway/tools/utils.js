import { normalizeToolName } from './names.js';

export function parseOllamaToolCall(toolCall) {
  const rawName = toolCall?.function?.name || toolCall?.name;
  const name = normalizeToolName(rawName);
  const id = toolCall?.id;
  let input = toolCall?.function?.arguments || toolCall?.arguments || toolCall?.input;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      input = { command: input };
    }
  }
  // Preserve original provider name for matching, normalized name for execution
  return { name, originalName: rawName, input, id };
}

export function normalizeToolFailure(reason, details) {
  return {
    success: false,
    error: reason,
    recommendation: 'Review the tool input parameters and strategy, then retry with corrected inputs.',
    details
  };
}

export function normalizeToolSuccess(result) {
  return {
    success: true,
    result
  };
}

export function getToolNames(definitions) {
    return definitions.map(d => d.name || d.function?.name);
}
