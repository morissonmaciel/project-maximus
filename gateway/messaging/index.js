/**
 * Messaging Subsystem Public API
 * 
 * This module exports:
 * - Payload builders for each provider
 * - Stream orchestration functions
 * - Response parsing helpers
 * 
 * All provider-specific communication is delegated to providers/.
 */

export {
  buildAnthropicPayload,
  buildOpenAICodexPayload,
  buildOllamaPayload,
  buildOllamaMessages,
  buildMemoryPrompt
} from './payloads.js';

export {
  streamAnthropicResponse,
  streamOllamaResponse,
  streamCodexResponse
} from './stream.js';

export {
  extractAnthropicText,
  extractAnthropicToolUses,
  extractCodexText
} from './responses.js';
