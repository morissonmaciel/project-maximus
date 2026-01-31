import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/**
 * 🔧 CORE TOOL: list_configuration
 * Category: System (Self-Awareness)
 * Purpose: Gateway introspection - provider status, limits, session info
 */
export const CORE_TOOL_DEFINITIONS = [
  {
    name: 'ListConfiguration',
    description: 'Return current gateway configuration, provider status, and recent usage/limits.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'CompactConversation',
    description: 'Summarize and compress the last ~350 chat messages, capturing summary, key points, and reminders. The summary is stored in memory for future retrieval.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Human-readable explanation of why compaction is needed'
        },
        contextWindow: {
          type: 'integer',
          description: 'Number of recent messages to include in summary (default: 350)',
          default: 350
        }
      },
      required: ['reason'],
      additionalProperties: false
    }
  },
  {
    name: 'TrimChatHistory',
    description: 'Delete old chat entries, optionally keeping only the N most recent messages. Best used immediately after CompactConversation to purge old raw messages after summarization.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Human-readable explanation of why trimming is needed'
        },
        keepLast: {
          type: 'integer',
          minimum: 0,
          description: 'Number of most recent messages to keep (default: 0, delete all)'
        }
      },
      required: ['reason'],
      additionalProperties: false
    }
  },
  {
    name: 'SetOnboardingComplete',
    description: 'Mark onboarding as complete and store onboarding preferences into memory for future context.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Human-readable explanation of why onboarding is being completed'
        },
        summary: {
          type: 'string',
          description: 'Short summary of onboarding info collected (name, timezone, tone, language, etc.)'
        },
        preferences: {
          type: 'object',
          description: 'Optional structured preferences collected during onboarding'
        }
      },
      required: ['reason', 'summary'],
      additionalProperties: false
    }
  }
  ,
  {
    name: 'CreateCronJob',
    description: 'Create a scheduled cron job (one-time, interval, or cron expression).',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this job is being created' },
        name: { type: 'string', description: 'Job name' },
        schedule: { type: 'string', description: 'Schedule string: cron:<expr>, interval:<30m|1h>, at:<ISO timestamp>' },
        timezone: { type: 'string', description: 'IANA timezone (optional)' },
        payload: { type: 'object', description: 'Job payload (message, notify, sessionId, etc.)' },
        enabled: { type: 'boolean', description: 'Enable job immediately (default true)' },
        max_retries: { type: 'integer', description: 'Max retries (default 3)' },
        retry_backoff_ms: { type: 'integer', description: 'Retry backoff in ms (default 60000)' }
      },
      required: ['reason', 'schedule'],
      additionalProperties: false
    }
  },
  {
    name: 'ListCronJobs',
    description: 'List all cron jobs with schedule and status.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'DisableCronJob',
    description: 'Disable a cron job by ID.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Human-readable explanation of why this job is being disabled' },
        jobId: { type: 'string', description: 'Cron job ID to disable' }
      },
      required: ['reason', 'jobId'],
      additionalProperties: false
    }
  },
  {
    name: 'GetWorkingDir',
    description: 'Return the current working directory as a full expanded absolute path. Use this to construct valid file paths for other file tools.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'GetRootMaximusDir',
    description: 'Return the full path where the Maximus gateway subsystem is running from. Use this to locate gateway files, configs, and other Maximus resources.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'GetCurrentTime',
    description: 'Return the current UTC time and local server time as ISO strings.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'ListSkills',
    description: 'Return the list of available external skills from the registry.',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'ReadSkill',
    description: 'Read instructions from a given skill and update the self-aware memory.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this skill doc is needed now' },
        skillId: { type: 'string', description: 'Skill ID from the registry (e.g., "gog")' },
        returnContent: { type: 'boolean', description: 'Return the doc content in the tool response', default: true },
        maxChars: { type: 'integer', description: 'Max chars to return (default 4000)', default: 4000 }
      },
      required: ['reason', 'skillId'],
      additionalProperties: false
    }
  },
  {
    name: 'LearnSkill',
    description: 'Create a new skill from provided instructions and ingest it into memory.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this new skill should be created' },
        skillId: { type: 'string', description: 'New skill ID (lowercase, letters/numbers/underscore/dash)' },
        name: { type: 'string', description: 'Human-friendly name' },
        description: { type: 'string', description: 'Short description' },
        keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords for matching' },
        content: { type: 'string', description: 'SKILL.md content to store' },
        entrypoints: { type: 'array', items: { type: 'object' }, description: 'Optional entrypoints metadata' }
      },
      required: ['reason', 'skillId', 'content'],
      additionalProperties: false
    }
  },
  {
    name: 'UnlearnSkill',
    description: 'Delete a skill that was previously created. Use this when a skill is broken, invalid, or no longer needed. This removes the skill from the registry, deletes its files, and removes it from memory.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this skill should be deleted' },
        skillId: { type: 'string', description: 'Skill ID to delete (e.g., "my_custom_skill")' }
      },
      required: ['reason', 'skillId'],
      additionalProperties: false
    }
  }
];

export const CORE_OLLAMA_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'ListConfiguration',
      description: 'Return current gateway configuration, provider status, and recent usage/limits.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'CompactConversation',
      description: 'Summarize and compress the last ~350 chat messages, capturing summary, key points, and reminders. The summary is stored in memory for future retrieval.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Human-readable explanation of why compaction is needed'
          },
          contextWindow: {
            type: 'integer',
            description: 'Number of recent messages to include in summary (default: 350)',
            default: 350
          }
        },
        required: ['reason'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'TrimChatHistory',
      description: 'Delete old chat entries, optionally keeping only the N most recent messages. Best used immediately after CompactConversation to purge old raw messages after summarization.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Human-readable explanation of why trimming is needed'
          },
          keepLast: {
            type: 'integer',
            minimum: 0,
            description: 'Number of most recent messages to keep (default: 0, delete all)'
          }
        },
        required: ['reason'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'SetOnboardingComplete',
      description: 'Mark onboarding as complete and store onboarding preferences into memory for future context.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Human-readable explanation of why onboarding is being completed'
          },
          summary: {
            type: 'string',
            description: 'Short summary of onboarding info collected (name, timezone, tone, language, etc.)'
          },
          preferences: {
            type: 'object',
            description: 'Optional structured preferences collected during onboarding'
          }
        },
        required: ['reason', 'summary'],
        additionalProperties: false
      }
    }
  }
  ,
  {
    type: 'function',
    function: {
      name: 'CreateCronJob',
      description: 'Create a scheduled cron job (one-time, interval, or cron expression).',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this job is being created' },
          name: { type: 'string', description: 'Job name' },
          schedule: { type: 'string', description: 'Schedule string: cron:<expr>, interval:<30m|1h>, at:<ISO timestamp>' },
          timezone: { type: 'string', description: 'IANA timezone (optional)' },
          payload: { type: 'object', description: 'Job payload (message, notify, sessionId, etc.)' },
          enabled: { type: 'boolean', description: 'Enable job immediately (default true)' },
          max_retries: { type: 'integer', description: 'Max retries (default 3)' },
          retry_backoff_ms: { type: 'integer', description: 'Retry backoff in ms (default 60000)' }
        },
        required: ['reason', 'schedule'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ListCronJobs',
      description: 'List all cron jobs with schedule and status.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'DisableCronJob',
      description: 'Disable a cron job by ID.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Human-readable explanation of why this job is being disabled' },
          jobId: { type: 'string', description: 'Cron job ID to disable' }
        },
        required: ['reason', 'jobId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'GetWorkingDir',
      description: 'Return the current working directory as a full expanded absolute path. Use this to construct valid file paths for other file tools.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'GetRootMaximusDir',
      description: 'Return the full path where the Maximus gateway subsystem is running from. Use this to locate gateway files, configs, and other Maximus resources.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'GetCurrentTime',
      description: 'Return the current UTC time and local server time as ISO strings.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ListSkills',
      description: 'Return the list of available external skills from the registry.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ReadSkill',
      description: 'Read instructions from a given skill and update the self-aware memory.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this skill doc is needed now' },
          skillId: { type: 'string', description: 'Skill ID from the registry (e.g., "gog")' },
          returnContent: { type: 'boolean', description: 'Return the doc content in the tool response', default: true },
          maxChars: { type: 'integer', description: 'Max chars to return (default 4000)', default: 4000 }
        },
        required: ['reason', 'skillId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'LearnSkill',
      description: 'Create a new skill from provided instructions and ingest it into memory.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this new skill should be created' },
          skillId: { type: 'string', description: 'New skill ID (lowercase, letters/numbers/underscore/dash)' },
          name: { type: 'string', description: 'Human-friendly name' },
          description: { type: 'string', description: 'Short description' },
          keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords for matching' },
          content: { type: 'string', description: 'SKILL.md content to store' },
          entrypoints: { type: 'array', items: { type: 'object' }, description: 'Optional entrypoints metadata' }
        },
        required: ['reason', 'skillId', 'content'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'UnlearnSkill',
      description: 'Delete a skill that was previously created. Use this when a skill is broken, invalid, or no longer needed.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this skill should be deleted' },
          skillId: { type: 'string', description: 'Skill ID to delete' }
        },
        required: ['reason', 'skillId'],
        additionalProperties: false
      }
    }
  }
];

export async function listConfigurationTool(getConfigurationSnapshot) {
  if (typeof getConfigurationSnapshot !== 'function') {
      return { error: 'Configuration snapshot provider not available' };
  }
  return getConfigurationSnapshot();
}

/**
 * Compact conversation by summarizing recent messages
 * @param {Object} input - Tool input
 * @param {string} input.reason - Explanation for compaction
 * @param {number} input.contextWindow - Number of messages to summarize (default: 350)
 * @param {Object} context - Tool context
 * @param {Object} context.memoryStore - Memory store for ingestion
 * @param {string} context.sessionId - Current session ID
 * @param {string} context.provider - Current provider name
 * @param {Function} context.summarizeMessages - Function to call provider for summarization
 * @param {Object} context.messenger - ClientMessenger instance for WebSocket communication
 * @returns {Promise<Object>} Tool result
 */
export async function compactConversationTool(input, context) {
  const { reason, contextWindow = 350 } = input || {};
  const { memoryStore, sessionId, provider, summarizeMessages, messenger } = context || {};

  if (!reason) {
    return { error: 'reason is required', success: false };
  }

  if (!memoryStore || !sessionId) {
    return { error: 'Memory store or session not available', success: false };
  }

  try {
    // Get recent messages from memory
    const allMessages = memoryStore.listMessages(sessionId) || [];
    const recentMessages = allMessages.slice(-contextWindow);

    if (recentMessages.length === 0) {
      return { error: 'No messages to compact', success: false };
    }

    console.log(`[CompactConversation] Summarizing ${recentMessages.length} messages for session ${sessionId}`);

    // Build summarization prompt
    const summaryPrompt = buildSummaryPrompt(recentMessages);

    // Call provider for summarization (no tools, no streaming)
    const summary = await summarizeMessages(summaryPrompt);

    if (!summary || summary.trim().length === 0) {
      return { error: 'Failed to generate summary', success: false };
    }

    // Store summary in memory
    const timestamp = Date.now();
    const path = `docs:compact-conversation/${timestamp}`;
    
    await memoryStore.ingestText({
      sessionId,
      provider,
      role: 'system',
      text: summary,
      metadata: {
        source: 'summary',
        tool: 'CompactConversation',
        reason,
        messageCount: recentMessages.length,
        timestamp,
        path
      }
    });

    console.log(`[CompactConversation] Summary stored at ${path}`);

    // Also store as visible assistant message for the user
    await memoryStore.ingestText({
      sessionId,
      provider,
      role: 'assistant',
      text: `**Conversation Compacted**\n\n${summary}`,
      metadata: {
        source: 'summary',
        tool: 'CompactConversation',
        reason,
        messageCount: recentMessages.length,
        timestamp,
        path,
        visible: true
      }
    });

    // Notify client to reload history
    if (messenger) {
      messenger.reloadHistory();
    }

    return {
      success: true,
      summary: summary.substring(0, 500) + (summary.length > 500 ? '...' : ''),
      messageCount: recentMessages.length,
      storedPath: path
    };

  } catch (err) {
    console.error('[CompactConversation] Error:', err);
    return { error: err.message, success: false };
  }
}

/**
 * Build a prompt for the summarizer
 * @param {Array} messages - Recent messages
 * @returns {string} Formatted prompt
 */
function buildSummaryPrompt(messages) {
  const conversationText = messages
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n\n');

  return `Please provide a comprehensive summary of the following conversation. Format your response with:

1. **Narrative Summary** - A paragraph describing the main discussion points
2. **Key Points** - Bullet list of important decisions, facts, or conclusions
3. **Things to Remember** - Critical context or hooks for future prompts

Conversation:
${conversationText}

Summary:`;
}

/**
 * Trim chat history by deleting old messages
 * @param {Object} input - Tool input
 * @param {string} input.reason - Explanation for trimming
 * @param {number} input.keepLast - Number of recent messages to keep (optional)
 * @param {Object} context - Tool context
 * @param {Object} context.memoryStore - Memory store
 * @param {string} context.sessionId - Current session ID
 * @param {string} context.provider - Current provider name
 * @param {Object} context.messenger - ClientMessenger instance for WebSocket communication
 * @returns {Promise<Object>} Tool result
 */
export async function trimChatHistoryTool(input, context) {
  const { reason, keepLast } = input || {};
  const { memoryStore, sessionId, provider, messenger } = context || {};

  if (!reason) {
    return { error: 'reason is required', success: false };
  }

  if (!memoryStore || !sessionId) {
    return { error: 'Memory store or session not available', success: false };
  }

  try {
    // Count messages before trim
    const beforeCount = (memoryStore.listMessages(sessionId) || []).length;

    // Trim messages
    const result = memoryStore.trimMessages(sessionId, keepLast || 0);

    console.log(`[TrimChatHistory] ${result.deleted} messages deleted, ${result.kept} kept for session ${sessionId}`);

    // Check if onboarding is complete and restore the summary
    const onboardingComplete = memoryStore.getMeta('onboarding:complete');
    if (onboardingComplete) {
      const onboardingSummary = memoryStore.getOnboardingSummary?.();
      if (onboardingSummary) {
        // Re-insert onboarding summary as system message
        await memoryStore.ingestText({
          sessionId,
          provider,
          role: 'system',
          text: onboardingSummary,
          source: 'system',
          path: 'docs:onboarding/summary'
        });
        console.log('[TrimChatHistory] Restored onboarding summary after trim');
      }
    }

    // Notify client to reload history
    if (messenger) {
      messenger.reloadHistory();
    }

    return {
      success: true,
      deleted: result.deleted,
      kept: result.kept,
      beforeCount,
      onboardingRestored: !!onboardingComplete
    };

  } catch (err) {
    console.error('[TrimChatHistory] Error:', err);
    return { error: err.message, success: false };
  }
}

/**
 * Mark onboarding complete and store summary in memory
 * @param {Object} input - Tool input
 * @param {string} input.reason - Explanation for completion
 * @param {string} input.summary - Summary of collected onboarding info
 * @param {Object} input.preferences - Optional structured preferences
 * @param {Object} context - Tool context
 * @param {Object} context.memoryStore - Memory store
 * @param {string} context.sessionId - Current session ID
 * @param {string} context.provider - Current provider name
 * @returns {Promise<Object>} Tool result
 */
export async function setOnboardingCompleteTool(input, context) {
  const { reason, summary, preferences } = input || {};
  const { memoryStore, sessionId, provider } = context || {};

  if (!reason) {
    return { error: 'reason is required', success: false };
  }

  if (!summary) {
    return { error: 'summary is required', success: false };
  }

  if (!memoryStore || !sessionId) {
    return { error: 'Memory store or session not available', success: false };
  }

  try {
    const timestamp = Date.now();
    const contentLines = [
      `Onboarding completed at ${new Date(timestamp).toISOString()}.`,
      `Reason: ${reason}`,
      '',
      'Summary:',
      summary.trim()
    ];

    if (preferences && typeof preferences === 'object') {
      contentLines.push('', 'Preferences:', JSON.stringify(preferences, null, 2));
    }

    const content = contentLines.join('\n');

    await memoryStore.ingestText({
      sessionId,
      provider,
      role: 'system',
      text: content,
      source: 'system',
      path: 'docs:onboarding/summary'
    });

    if (typeof memoryStore.setMeta === 'function') {
      memoryStore.setMeta('onboarding:complete', new Date(timestamp).toISOString());
    }

    console.log('[Onboarding] Completed and stored in memory.');

    return { success: true };
  } catch (err) {
    console.error('[Onboarding] Error:', err);
    return { error: err.message, success: false };
  }
}

export async function createCronJobTool(input, context) {
  const { reason, schedule, name, timezone, payload, enabled = true, max_retries, retry_backoff_ms } = input || {};
  const { cronStore } = context || {};

  if (!reason) return { error: 'reason is required', success: false };
  if (!schedule) return { error: 'schedule is required', success: false };
  if (!cronStore) return { error: 'Cron subsystem not available', success: false };

  const jobId = cronStore.createJob({
    name,
    schedule,
    timezone,
    payload,
    enabled,
    max_retries,
    retry_backoff_ms
  });

  return { success: true, jobId };
}

export async function listCronJobsTool(_input, context) {
  const { cronStore } = context || {};
  if (!cronStore) return { error: 'Cron subsystem not available', success: false };
  const jobs = (cronStore.listJobs() || []).map((job) => {
    let payload = job.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { /* ignore */ }
    }
    return { ...job, payload };
  });
  return { success: true, jobs };
}

export async function disableCronJobTool(input, context) {
  const { reason, jobId } = input || {};
  const { cronStore } = context || {};
  if (!reason) return { error: 'reason is required', success: false };
  if (!jobId) return { error: 'jobId is required', success: false };
  if (!cronStore) return { error: 'Cron subsystem not available', success: false };

  const updated = cronStore.disableJob(jobId);
  if (!updated) return { error: 'Job not found', success: false };
  return { success: true, jobId };
}

export async function getWorkingDirTool() {
  const cwd = process.cwd();
  return {
    success: true,
    workingDir: cwd,
    expandedPath: resolve(cwd)
  };
}

export async function getRootMaximusDirTool() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const toolsDir = dirname(currentFilePath);
  const gatewayDir = dirname(toolsDir);

  return {
    success: true,
    rootMaximusDir: resolve(gatewayDir),
    toolsDir: resolve(toolsDir)
  };
}

export async function getCurrentTimeTool() {
  const now = new Date();
  return {
    success: true,
    utc: now.toISOString(),
    local: now.toString()
  };
}

export async function listSkillsTool(_input, context) {
  const { skillsStore } = context || {};
  if (!skillsStore) return { success: false, error: 'Skills subsystem not available' };
  return { success: true, skills: skillsStore.getSkillsList() };
}

export async function readSkillTool(input, context) {
  const { reason, skillId, returnContent = true, maxChars = 4000 } = input || {};
  const { memoryStore, skillsStore } = context || {};
  if (!reason) return { success: false, error: 'reason is required' };
  if (!skillId) return { success: false, error: 'skillId is required' };
  if (!skillsStore) return { success: false, error: 'Skills subsystem not available' };

  const ingestResult = await skillsStore.reingestSkill(memoryStore, skillId);
  if (!ingestResult?.success) {
    return { success: false, error: ingestResult?.error || 'Failed to ingest skill' };
  }

  let content = null;
  if (returnContent) {
    const doc = skillsStore.getSkillDoc(skillId);
    if (doc) {
      content = doc.length > maxChars ? `${doc.slice(0, maxChars)}...` : doc;
    }
  }

  return { success: true, skillId, content };
}

export async function learnSkillTool(input, context) {
  const { reason, skillId, name, description, keywords, content, entrypoints } = input || {};
  const { memoryStore, skillsStore } = context || {};
  if (!reason) return { success: false, error: 'reason is required' };
  if (!skillId) return { success: false, error: 'skillId is required' };
  if (!content) return { success: false, error: 'content is required' };
  if (!skillsStore) return { success: false, error: 'Skills subsystem not available' };

  const createResult = skillsStore.addSkill(
    { id: skillId, name, description, keywords, entrypoints },
    content
  );
  if (!createResult?.success) {
    return { success: false, error: createResult?.error || 'Failed to create skill' };
  }

  const ingestResult = await skillsStore.reingestSkill(memoryStore, skillId);
  if (!ingestResult?.success) {
    return { success: false, error: ingestResult?.error || 'Failed to ingest skill' };
  }

  return { success: true, skillId };
}

/**
 * Delete/unlearn a previously created skill
 * @param {Object} input - Tool input
 * @param {string} input.reason - Explanation for deletion
 * @param {string} input.skillId - Skill ID to delete
 * @param {Object} context - Tool context
 * @param {Object} context.memoryStore - Memory store
 * @param {Object} context.skillsStore - Skills store with removeSkill function
 * @returns {Promise<Object>} Tool result
 */
export async function unlearnSkillTool(input, context) {
  const { reason, skillId } = input || {};
  const { memoryStore, skillsStore } = context || {};

  if (!reason) {
    return { success: false, error: 'reason is required' };
  }
  if (!skillId) {
    return { success: false, error: 'skillId is required' };
  }
  if (!skillsStore) {
    return { success: false, error: 'Skills subsystem not available' };
  }

  // Check if skill exists before trying to remove
  const existingSkill = skillsStore.getSkillById?.(skillId);
  if (!existingSkill) {
    return { success: false, error: `Skill "${skillId}" not found` };
  }

  // Remove from registry and filesystem
  const removeResult = skillsStore.removeSkill(skillId);
  if (!removeResult?.success) {
    return { success: false, error: removeResult?.error || 'Failed to remove skill from registry' };
  }

  console.log(`[UnlearnSkill] Removed skill "${skillId}" from registry: ${reason}`);

  // Remove from memory if memoryStore is available
  if (memoryStore) {
    try {
      const docPath = `docs:external-skills/${skillId}`;
      memoryStore.removeByPath(docPath);
      // Also clear the ingestion marker
      if (typeof memoryStore.setMeta === 'function') {
        memoryStore.setMeta(`external-skill:ingested/${skillId}`, null);
      }
      console.log(`[UnlearnSkill] Removed skill "${skillId}" from memory`);
    } catch (err) {
      console.warn(`[UnlearnSkill] Failed to remove from memory: ${err.message}`);
      // Don't fail the operation if memory removal fails
    }
  }

  return {
    success: true,
    skillId,
    message: `Skill "${skillId}" has been unlearned and removed.`
  };
}
