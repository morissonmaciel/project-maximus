/**
 * Prompt Subsystem - Public API
 * 
 * Single source of truth for prompt construction and assembly.
 * 
 * @module gateway/prompts
 */

import { SYSTEM_PROMPT } from './system.js';
import { 
  ONBOARDING_PROMPT, 
  ONE_TIME_USER_MESSAGE 
} from './onboarding.js';
import { 
  createMemoryContext, 
  createSkillsContext, 
  joinBlocks 
} from './templates.js';

export { SYSTEM_PROMPT } from './system.js';
export { 
  ONBOARDING_PROMPT, 
  ONE_TIME_USER_MESSAGE 
} from './onboarding.js';
export { 
  section, 
  bulletList, 
  joinBlocks,
  formatMemorySnippet,
  createMemoryContext,
  createSkillsContext
} from './templates.js';

/**
 * Get the base system prompt with optional extensions
 * 
 * @param {Object} options - Assembly options
 * @param {string} options.memoryText - Memory context to inject (optional)
 * @param {Array} options.skills - Skills to include (optional)
 * @param {boolean} options.includeOnboarding - Include onboarding (default: false)
 * @returns {string} Assembled system prompt
 */
export function getSystemPrompt({ 
  memoryText = null, 
  skills = null, 
  includeOnboarding = false 
} = {}) {
  const blocks = [SYSTEM_PROMPT];
  if (includeOnboarding) {
    blocks.push(ONBOARDING_PROMPT);
  }
  
  // Add memory context if provided
  if (memoryText) {
    blocks.push(memoryText);
  }
  
  // Add skills context if provided
  if (skills && skills.length > 0) {
    const skillsContext = createSkillsContext(skills);
    if (skillsContext) {
      blocks.push(skillsContext);
    }
  }
  
  return joinBlocks(blocks);
}

/**
 * Get the onboarding prompt only
 * @returns {string} Onboarding prompt
 */
export function getOnboardingPrompt() {
  return ONBOARDING_PROMPT;
}

/**
 * Get the one-time user message that triggers onboarding
 * @returns {string} One-time user message
 */
export function getOneTimeUserMessage() {
  return ONE_TIME_USER_MESSAGE;
}

/**
 * Check if a session needs onboarding
 * @param {Object} memoryStore - Memory store instance
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if onboarding is needed
 */
export function needsOnboarding(memoryStore) {
  if (!memoryStore) {
    return true;
  }
  
  try {
    const completed = memoryStore.getMeta?.('onboarding:complete');
    return !completed;
  } catch {
    // Default to onboarding if we can't check
    return true;
  }
}
