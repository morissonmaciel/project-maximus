# Prompt Subsystem

This directory contains the prompt assembly and management system for Maximus.

## Structure

```
gateway/prompts/
├── index.js       # Public API for prompt assembly
├── system.js      # Base system prompt (core persona + rules)
├── onboarding.js  # Onboarding prompt (one-time setup)
├── templates.js   # Shared formatting helpers
├── README.md      # This file
└── versions.md    # Prompt change log
```

## Prompt Injection Flow

### Regular Chat Flow

1. **System Prompt Selection**
   - Normal chats: Use `SYSTEM_PROMPT` from `system.js`
   - First-time chats: Use `ONE_TIME_SYSTEM_PROMPT` (includes onboarding)

2. **Context Injection** (via `getSystemPrompt()`)
   - Memory snippets are retrieved from the vector store
   - Skills context is added if skills match the query
   - Both are appended to the base system prompt

3. **Provider Differences**
   - **Anthropic**: System prompt goes in `params.system` array with `cache_control`
   - **OpenAI Codex**: System prompt goes in `params.system` (string)
   - **Ollama**: System prompt goes as first `system` role message

### One-Time Onboarding Flow

1. **First Message Detection**
   - Server checks if session has any existing messages
   - If no messages → use onboarding flow

2. **Onboarding Prompt Assembly**
   - Use `ONE_TIME_SYSTEM_PROMPT` (includes onboarding instructions)
   - Prepend `ONE_TIME_USER_MESSAGE` to outbound messages
   - Example: `[{ role: 'user', content: 'Start onboarding.' }, ...userMessages]`

3. **Onboarding Completion**
   - After first exchange, normal `SYSTEM_PROMPT` is used
   - User preferences stored in memory for future sessions

## API Reference

### `getSystemPrompt(options)`

Assemble the complete system prompt with optional extensions.

```javascript
import { getSystemPrompt } from './gateway/prompts/index.js';

const prompt = getSystemPrompt({
  memoryText: 'Memory snippets...',  // Optional
  skills: [{ id: 'git', description: '...' }],  // Optional
  includeOnboarding: false  // Default: false
});
```

### `getOnboardingPrompt()`

Get just the onboarding instructions.

### `getOneTimeUserMessage()`

Get the trigger message for onboarding (`'Start onboarding.'`).

### `needsOnboarding(memoryStore, sessionId)`

Check if a session needs onboarding (no prior messages).

## Templates

### `createMemoryContext(chunks)`

Format memory chunks for injection:

```javascript
import { createMemoryContext } from './gateway/prompts/index.js';

const memoryText = createMemoryContext([
  { path: 'file:chat', start_line: 1, end_line: 5, text: '...' }
]);
```

### `createSkillsContext(skills)`

Format skills for injection:

```javascript
import { createSkillsContext } from './gateway/prompts/index.js';

const skillsText = createSkillsContext([
  { id: 'git', description: 'Git operations' }
]);
```

## Adding New Prompts

1. Create the prompt content in the appropriate file (`system.js`, `onboarding.js`)
2. Export it from the file
3. Re-export from `index.js` if it should be public
4. Add usage to `getSystemPrompt()` if it's part of standard assembly
5. Document in this README
6. Log the change in `versions.md`
