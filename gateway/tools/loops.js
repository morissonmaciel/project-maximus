/**
 * Tool Execution Loops
 * 
 * Responsibilities:
 * - Manage conversation loops with tool calling
 * - Execute tools and feed results back to providers
 * - Handle tool guard checks
 * 
 * NOT Responsibilities:
 * - Provider API communication (providers/)
 * - Payload construction (messaging/payloads.js)
 * - Direct SDK calls (providers/)
 */

import { ToolGuard } from './tools-guard.js';
import { normalizeToolFailure, parseOllamaToolCall, normalizeToolSuccess } from './utils.js';
import { normalizeToolName } from './names.js';
import { OLLAMA_TOOL_DEFINITIONS } from './tools-executer.js';
import {
  buildAnthropicPayload,
  buildOpenAICodexPayload,
  buildKimiPayload,
  buildNvidiaPayload,
  buildOllamaPayload,
  buildOllamaMessages
} from '../messaging/payloads.js';
import {
  streamAnthropicResponse,
  streamOllamaResponse,
  streamCodexResponse,
  streamKimiResponse,
  streamNvidiaResponse
} from '../messaging/stream.js';
import {
  extractAnthropicText,
  extractAnthropicToolUses,
  extractCodexText,
  extractKimiText,
  extractNvidiaText
} from '../messaging/responses.js';

export async function runAnthropicLoop({
  ws,
  client,
  baseMessages,
  systemPrompt,
  memoryText,
  model,
  maxTokens,
  isOAuth,
  runToolCall,
  memoryStore,
  onStats
}) {
  let messages = baseMessages;
  let finalText = '';
  const toolGuard = new ToolGuard();

  while (true) {
    const params = buildAnthropicPayload(
      messages,
      systemPrompt,
      memoryText,
      isOAuth,
      model,
      maxTokens
    );

    if (onStats) {
      onStats({ model: params.model, limits: { maxTokens: params.max_tokens } });
    }

    const { finalMessage, rateLimits } = await streamAnthropicResponse(
      client,
      ws,
      params
    );

    if (onStats) {
      const updates = {};
      if (rateLimits) updates.rateLimits = rateLimits;
      if (finalMessage) {
        updates.usage = finalMessage.usage || null;
        updates.model = finalMessage.model || model;
      }
      onStats(updates);
    }

    if (!finalMessage) {
      return finalText;
    }

    finalText = extractAnthropicText(finalMessage);
    const toolUses = extractAnthropicToolUses(finalMessage);

    if (!toolUses.length) {
      return finalText;
    }

    const toolResults = [];
    for (const toolUse of toolUses) {
      const toolCallId = toolUse.id;
      // Preserve original provider tool name for matching; normalize only for execution
      const providerToolName = toolUse.name;
      const execToolName = normalizeToolName(toolUse.name);

      const guard = toolGuard.check(execToolName);
      if (!guard.allowed) {
        const failure = normalizeToolFailure(guard.error, { tool: providerToolName, input: toolUse.input });
        ws.send(JSON.stringify({
          type: 'error',
          message: `${failure.error} ${failure.recommendation}`
        }));
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCallId,
          content: JSON.stringify(failure)
        });
        ws.send(JSON.stringify({
          type: 'toolResult',
          name: providerToolName,
          toolCallId,
          success: false
        }));
        continue;
      }

      const reason = toolUse.input?.reason || null;

      ws.send(JSON.stringify({
        type: 'toolCall',
        name: providerToolName,
        toolCallId,
        reason
      }));

      let result;
      try {
        result = await runToolCall({ name: execToolName, input: toolUse.input });
      } catch (err) {
        result = normalizeToolFailure(
          'Tool execution threw an error.',
          { tool: providerToolName, message: err instanceof Error ? err.message : String(err) }
        );
      }

      let normalized = result;
      let success = true;
      if (result?.error || result?.success === false || (typeof result?.exit_code === 'number' && result.exit_code !== 0)) {
        const reasonText = result?.error || result?.stderr || 'Tool execution failed.';
        normalized = normalizeToolFailure(reasonText, result);
        success = false;
      } else if (result?.success !== true) {
        normalized = normalizeToolSuccess(result);
      }

      ws.send(JSON.stringify({
        type: 'toolResult',
        name: providerToolName,
        toolCallId,
        success
      }));

      if (memoryStore) {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider: 'anthropic',
          role: 'tool',
          text: JSON.stringify({ name: providerToolName, reason, success, toolCallId }),
          source: 'chat'
        });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(normalized)
      });
    }

    messages = [
      ...messages,
      { role: 'assistant', content: finalMessage.content },
      { role: 'user', content: toolResults }
    ];
  }
}

export async function runOpenAICodexLoop({
  ws,
  credentials,
  baseMessages,
  systemPrompt,
  memoryText,
  model,
  runToolCall,
  memoryStore,
  onStats
}) {
  let messages = baseMessages;
  const toolGuard = new ToolGuard();
  let finalText = '';

  while (true) {
    const params = buildOpenAICodexPayload(
      messages,
      systemPrompt,
      memoryText,
      credentials,
      model
    );

    if (onStats) {
      onStats({ model: params.model });
    }

    const result = await streamCodexResponse(ws, params);
    const { content, toolCalls, usage } = result;

    if (onStats) {
      onStats({ usage });
    }

    const textParts = extractCodexText(content);
    finalText = textParts;

    if (!toolCalls || toolCalls.length === 0) {
      return finalText;
    }

    const toolResults = [];

    messages.push({ role: 'assistant', content: content });

    for (const call of toolCalls) {
      const toolCallId = call.id;
      // Preserve original provider tool name for matching; normalize only for execution
      const providerToolName = call.name;
      const execToolName = normalizeToolName(call.name);

      const guard = toolGuard.check(execToolName);
      if (!guard.allowed) {
        const failure = normalizeToolFailure(guard.error, { tool: providerToolName, input: call.input });
        ws.send(JSON.stringify({
          type: 'error',
          message: `${failure.error} ${failure.recommendation}`
        }));
        ws.send(JSON.stringify({
          type: 'toolResult',
          name: providerToolName,
          toolCallId,
          success: false
        }));

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCallId,
          content: JSON.stringify(failure)
        });
        continue;
      }

      const reason = call.input?.reason || null;

      ws.send(JSON.stringify({
        type: 'toolCall',
        name: providerToolName,
        toolCallId,
        reason
      }));

      let execResult;
      try {
        execResult = await runToolCall({ name: execToolName, input: call.input });
      } catch (err) {
        execResult = normalizeToolFailure(
          'Tool execution threw an error.',
          { tool: providerToolName, message: err instanceof Error ? err.message : String(err) }
        );
      }

      let normalized = execResult;
      let success = true;
      if (execResult?.error || execResult?.success === false || (typeof execResult?.exit_code === 'number' && execResult.exit_code !== 0)) {
        const reasonText = execResult?.error || execResult?.stderr || 'Tool execution failed.';
        normalized = normalizeToolFailure(reasonText, execResult);
        success = false;
      } else if (execResult?.success !== true) {
        normalized = normalizeToolSuccess(execResult);
      }

      ws.send(JSON.stringify({
        type: 'toolResult',
        name: providerToolName,
        toolCallId,
        success
      }));

      if (memoryStore) {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider: 'openai-codex',
          role: 'tool',
          text: JSON.stringify({ name: providerToolName, reason, success, toolCallId }),
          source: 'chat'
        });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCallId,
        content: JSON.stringify(normalized)
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }
}

export async function runKimiLoop({
  ws,
  config,
  baseMessages,
  systemPrompt,
  memoryText,
  runToolCall,
  memoryStore,
  onStats
}) {
  let messages = baseMessages;
  const toolGuard = new ToolGuard();
  let finalText = '';

  while (true) {
    const params = buildKimiPayload(
      messages,
      systemPrompt,
      memoryText,
      config
    );

    if (onStats) {
      onStats({
        model: params.model,
        limits: { maxTokens: params.maxTokens }
      });
    }

    const result = await streamKimiResponse(ws, params);
    const { content, toolCalls, usage } = result;

    if (onStats && usage) {
      onStats({ usage });
    }

    finalText = extractKimiText(content);

    if (!toolCalls || toolCalls.length === 0) {
      return finalText;
    }

    const toolResults = [];

    messages.push({
      role: 'assistant',
      content: finalText || '',
      tool_calls: toolCalls.map(call => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.input || {})
        }
      }))
    });

    for (const call of toolCalls) {
      const toolCallId = call.id;
      const providerToolName = call.name;
      const execToolName = normalizeToolName(call.name);

      const guard = toolGuard.check(execToolName);
      if (!guard.allowed) {
        const failure = normalizeToolFailure(guard.error, { tool: providerToolName, input: call.input });
        ws.send(JSON.stringify({
          type: 'error',
          message: `${failure.error} ${failure.recommendation}`
        }));
        ws.send(JSON.stringify({
          type: 'toolResult',
          name: providerToolName,
          toolCallId,
          success: false
        }));

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(failure)
        });
        continue;
      }

      const reason = call.input?.reason || null;

      ws.send(JSON.stringify({
        type: 'toolCall',
        name: providerToolName,
        toolCallId,
        reason
      }));

      let execResult;
      try {
        execResult = await runToolCall({ name: execToolName, input: call.input });
      } catch (err) {
        execResult = normalizeToolFailure(
          'Tool execution threw an error.',
          { tool: providerToolName, message: err instanceof Error ? err.message : String(err) }
        );
      }

      let normalized = execResult;
      let success = true;
      if (execResult?.error || execResult?.success === false || (typeof execResult?.exit_code === 'number' && execResult.exit_code !== 0)) {
        const reasonText = execResult?.error || execResult?.stderr || 'Tool execution failed.';
        normalized = normalizeToolFailure(reasonText, execResult);
        success = false;
      } else if (execResult?.success !== true) {
        normalized = normalizeToolSuccess(execResult);
      }

      ws.send(JSON.stringify({
        type: 'toolResult',
        name: providerToolName,
        toolCallId,
        success
      }));

      if (memoryStore) {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider: 'kimi',
          role: 'tool',
          text: JSON.stringify({ name: providerToolName, reason, success, toolCallId }),
          source: 'chat'
        });
      }

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(normalized)
      });
    }

    messages = [...messages, ...toolResults];
  }
}

export async function runNvidiaLoop({
  ws,
  config,
  baseMessages,
  systemPrompt,
  memoryText,
  runToolCall,
  memoryStore,
  onStats
}) {
  let messages = baseMessages;
  const toolGuard = new ToolGuard();
  let finalText = '';

  while (true) {
    const params = buildNvidiaPayload(
      messages,
      systemPrompt,
      memoryText,
      config
    );

    if (onStats) {
      onStats({ model: params.model, limits: { maxTokens: params.maxTokens } });
    }

    const result = await streamNvidiaResponse(ws, params);
    const { content, toolCalls, usage } = result;

    if (onStats && usage) {
      onStats({ usage });
    }

    finalText = extractNvidiaText(content);

    if (!toolCalls || toolCalls.length === 0) {
      return finalText;
    }

    const toolResults = [];

    messages.push({
      role: 'assistant',
      content: finalText || '',
      tool_calls: toolCalls.map(call => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.input || {})
        }
      }))
    });

    for (const call of toolCalls) {
      const toolCallId = call.id;
      const providerToolName = call.name;
      const execToolName = normalizeToolName(call.name);

      const guard = toolGuard.check(execToolName);
      if (!guard.allowed) {
        const failure = normalizeToolFailure(guard.error, { tool: providerToolName, input: call.input });
        ws.send(JSON.stringify({
          type: 'error',
          message: `${failure.error} ${failure.recommendation}`
        }));
        ws.send(JSON.stringify({
          type: 'toolResult',
          name: providerToolName,
          toolCallId,
          success: false
        }));

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(failure)
        });
        continue;
      }

      const reason = call.input?.reason || null;

      ws.send(JSON.stringify({
        type: 'toolCall',
        name: providerToolName,
        toolCallId,
        reason
      }));

      let execResult;
      try {
        execResult = await runToolCall({ name: execToolName, input: call.input });
      } catch (err) {
        execResult = normalizeToolFailure(
          'Tool execution threw an error.',
          { tool: providerToolName, message: err instanceof Error ? err.message : String(err) }
        );
      }

      let normalized = execResult;
      let success = true;
      if (execResult?.error || execResult?.success === false || (typeof execResult?.exit_code === 'number' && execResult.exit_code !== 0)) {
        const reasonText = execResult?.error || execResult?.stderr || 'Tool execution failed.';
        normalized = normalizeToolFailure(reasonText, execResult);
        success = false;
      } else if (execResult?.success !== true) {
        normalized = normalizeToolSuccess(execResult);
      }

      ws.send(JSON.stringify({
        type: 'toolResult',
        name: providerToolName,
        toolCallId,
        success
      }));

      if (memoryStore) {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider: 'nvidia',
          role: 'tool',
          text: JSON.stringify({ name: providerToolName, reason, success, toolCallId }),
          source: 'chat'
        });
      }

      toolResults.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(normalized)
      });
    }

    messages = [...messages, ...toolResults];
  }
}

export async function runOllamaLoop({
  ws,
  client,
  baseMessages,
  systemPrompt,
  memoryText,
  model,
  runToolCall,
  memoryStore,
  onStats
}) {
  let messages = buildOllamaMessages(baseMessages, memoryText, systemPrompt);
  let finalText = '';
  const toolGuard = new ToolGuard();

  while (true) {
    const params = buildOllamaPayload(
      model,
      messages,
      OLLAMA_TOOL_DEFINITIONS
    );

    const { toolCalls, assistantText, usage } = await streamOllamaResponse(client, ws, params);

    if (onStats && usage) {
      onStats({ usage });
    }

    if (!toolCalls.length) {
      finalText = assistantText;
      return finalText;
    }

    const normalizedToolCalls = toolCalls.map(parseOllamaToolCall);
    const toolMessages = [];
    const makeToolCallId = (name) => `${name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    for (const call of normalizedToolCalls) {
      const toolCallId = call.id || makeToolCallId(call.name);
      // Use normalized name for execution, original name for provider-facing operations
      const execToolName = call.name;
      const providerToolName = call.originalName || call.name;

      const guard = toolGuard.check(execToolName);
      if (!guard.allowed) {
        const failure = normalizeToolFailure(guard.error, { tool: providerToolName, input: call.input });
        ws.send(JSON.stringify({
          type: 'error',
          message: `${failure.error} ${failure.recommendation}`
        }));
        ws.send(JSON.stringify({
          type: 'toolResult',
          name: providerToolName,
          toolCallId,
          success: false
        }));
        toolMessages.push({
          role: 'tool',
          name: providerToolName,
          content: JSON.stringify(failure)
        });
        continue;
      }

      const reason = call.input?.reason || null;

      ws.send(JSON.stringify({
        type: 'toolCall',
        name: providerToolName,
        toolCallId,
        reason
      }));

      let result;
      try {
        result = await runToolCall({ name: execToolName, input: call.input });
      } catch (err) {
        result = normalizeToolFailure(
          'Tool execution threw an error.',
          { tool: providerToolName, message: err instanceof Error ? err.message : String(err) }
        );
      }

      let normalized = result;
      let success = true;
      if (result?.error || result?.success === false || (typeof result?.exit_code === 'number' && result.exit_code !== 0)) {
        const reasonText = result?.error || result?.stderr || 'Tool execution failed.';
        normalized = normalizeToolFailure(reasonText, result);
        success = false;
      } else if (result?.success !== true) {
        normalized = normalizeToolSuccess(result);
      }

      ws.send(JSON.stringify({
        type: 'toolResult',
        name: providerToolName,
        toolCallId,
        success
      }));

      if (memoryStore) {
        memoryStore.ingestText({
          sessionId: ws.sessionId,
          provider: 'ollama',
          role: 'tool',
          text: JSON.stringify({ name: providerToolName, reason, success, toolCallId }),
          source: 'chat'
        });
      }

      toolMessages.push({
        role: 'tool',
        name: providerToolName,
        content: JSON.stringify(normalized)
      });
    }

    messages = [
      ...messages,
      { role: 'assistant', content: '', tool_calls: toolCalls },
      ...toolMessages
    ];
  }
}
