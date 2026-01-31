# Prompt Versions

Change log for prompt updates and iterations.

## Format

```
## YYYY-MM-DD - Brief Title
Author: @username

### Summary
What changed and why.

### Prompts Affected
- `system.js` - Base system prompt
- `onboarding.js` - Onboarding flow

### Migration Notes
Any breaking changes or migration steps.
```

---

## 2026-01-29 - Prompt Subsystem Refactor
Author: @morissonmaciel

### Summary
Refactored prompts from `/prompts` root directory into `gateway/prompts/` as a proper subsystem.

### Changes
- Moved `system-prompt.js` → `gateway/prompts/system.js`
- Moved `one-time-prompt.js` → `gateway/prompts/onboarding.js`
- Created `gateway/prompts/index.js` as public API
- Created `gateway/prompts/templates.js` for formatting helpers
- Added `README.md` for documentation
- Added `versions.md` for change tracking

### Prompts Affected
- `system.js` - Base system prompt (moved, content unchanged)
- `onboarding.js` - Onboarding flow (moved, content unchanged)

### Migration Notes
- Import paths updated from `../prompts/...` to `./prompts/index.js`
- Old `/prompts` directory kept for backward compatibility (thin re-exports)
- `getSystemPrompt()` is the new canonical way to assemble prompts

---

## Initial Version

### system.js
Base system prompt defining:
- Personal assistant persona
- Gateway awareness
- Memory database access

### onboarding.js
Onboarding flow for first-time users:
- User name, location, timezone collection
- Tone and language preferences
- Communication style preferences
