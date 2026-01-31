import { CORE_TOOL_DEFINITIONS, CORE_OLLAMA_TOOL_DEFINITIONS, listConfigurationTool, compactConversationTool, trimChatHistoryTool, setOnboardingCompleteTool, createCronJobTool, listCronJobsTool, disableCronJobTool, getCurrentTimeTool, listSkillsTool, readSkillTool, learnSkillTool, unlearnSkillTool } from './core-tools.js';
import { ACCESSORY_TOOL_DEFINITIONS, ACCESSORY_OLLAMA_TOOL_DEFINITIONS, runCommandTool, webFetchTool, webSearchTool, readFileTool, grepTool, replaceFileTool, strReplaceFileTool } from './accessory-tools.js';
import { normalizeToolName } from './names.js';

export const TOOL_DEFINITIONS = [...ACCESSORY_TOOL_DEFINITIONS, ...CORE_TOOL_DEFINITIONS];
export const OLLAMA_TOOL_DEFINITIONS = [...ACCESSORY_OLLAMA_TOOL_DEFINITIONS, ...CORE_OLLAMA_TOOL_DEFINITIONS];

/**
 * Create a tool runner with access to gateway state
 *
 * @param {Object} options
 * @param {Function} options.getConfigurationSnapshot - Function that returns current gateway config
 * @param {Function} options.getSystemConfig - Function that returns system config
 * @param {Object} options.memoryStore - Memory store for ingestion
 * @param {string} options.sessionId - Current session ID
 * @param {string} options.provider - Current provider name
 * @param {Function} options.summarizeMessages - Function to summarize messages via provider
 * @param {Object} options.messenger - ClientMessenger instance for WebSocket communication
 * @returns {Function} runToolCall function
 */
export function createToolRunner({ getConfigurationSnapshot, getSystemConfig, memoryStore, sessionId, provider, summarizeMessages, cronStore, skillsStore, messenger }) {
  /**
   * Execute a tool call
   *
   * @param {Object} toolCall - The tool call to execute
   * @param {string} toolCall.name - Tool name
   * @param {Object} toolCall.input - Tool input parameters
   * @returns {Promise<Object>} Tool result
   */
  return async function runToolCall(toolCall) {
    if (!toolCall) {
      return { stdout: '', stderr: 'Missing tool call', exit_code: 1 };
    }

    // Normalize tool name to PascalCase (backward compatibility)
    const toolName = normalizeToolName(toolCall.name);

    const inputPreview = (() => {
      try {
        return JSON.stringify(toolCall.input || {});
      } catch {
        return '[unserializable input]';
      }
    })();
    console.log(`[Tool:${toolName}] Input: ${inputPreview}`);

    // Build context for tools that support memory ingestion
    const context = { memoryStore, sessionId, provider, summarizeMessages, cronStore, skillsStore, messenger };

    switch (toolName) {
      // 🛠️ ACCESSORY TOOLS
      case 'RunCommand':
        return runCommandTool(toolCall.input || {});

      case 'WebFetch':
        return webFetchTool(toolCall.input || {});

      case 'WebSearch':
        return webSearchTool(toolCall.input || {}, typeof getSystemConfig === 'function' ? getSystemConfig() : {});

      case 'ReadFile':
        return readFileTool(toolCall.input || {}, context);

      case 'Grep':
        return grepTool(toolCall.input || {}, context);

      case 'ReplaceFile':
        return replaceFileTool(toolCall.input || {}, context);

      case 'StrReplaceFile':
        return strReplaceFileTool(toolCall.input || {}, context);

      // 🔧 CORE TOOLS
      case 'ListConfiguration':
        return listConfigurationTool(getConfigurationSnapshot);

      case 'CompactConversation':
        return compactConversationTool(toolCall.input || {}, context);

      case 'TrimChatHistory':
        return trimChatHistoryTool(toolCall.input || {}, context);

      case 'SetOnboardingComplete':
        return setOnboardingCompleteTool(toolCall.input || {}, context);

      case 'CreateCronJob':
        return createCronJobTool(toolCall.input || {}, context);

      case 'ListCronJobs':
        return listCronJobsTool(toolCall.input || {}, context);

      case 'DisableCronJob':
        return disableCronJobTool(toolCall.input || {}, context);

      case 'GetCurrentTime':
        return getCurrentTimeTool();

      case 'ListSkills':
        return listSkillsTool(toolCall.input || {}, context);

      case 'ReadSkill':
        return readSkillTool(toolCall.input || {}, context);

      case 'LearnSkill':
        return learnSkillTool(toolCall.input || {}, context);

      case 'UnlearnSkill':
        return unlearnSkillTool(toolCall.input || {}, context);

      default:
        return { stdout: '', stderr: `Unknown tool: ${toolCall.name}`, exit_code: 1 };
    }
  };
}
