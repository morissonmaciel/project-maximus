export function loadAwareness() {
  return [
    {
      title: 'How this agent works',
      text:
        'This gateway routes chat requests to a selected provider and streams responses back to the UI. ' +
        'It can execute tools (RunCommand) locally and enriches prompts with memory snippets retrieved ' +
        'from the local SQLite memory store.'
    },
    {
      title: 'Available providers',
      text:
        'Providers supported by this gateway: Anthropic, Ollama, OpenAI Codex, Kimi, and NVIDIA. The active provider is selected in the UI Settings. ' +
        'OpenAI Codex defaults to model gpt-5.1-codex-max. Kimi defaults to model kimi-k2.5. NVIDIA defaults to model moonshotai/kimi-k2.5.'
    },
    {
      title: 'Configuration locations',
      text:
        'User settings are stored in $HOME/.maximus/settings.json and persistent memory in ' +
        '$HOME/.maximus/memory.db. The internal configuration logic is modularized in gateway/config/. ' +
        'Only the ".maximus" folder is used by this project. ' +
        'Folders with similar names are not part of this project unless explicitly configured.'
    },
    {
      title: 'Provider Authentication',
      text:
        'Anthropic supports API key and OAuth. OpenAI Codex uses OAuth (ChatGPT subscription required). Kimi uses an API key. NVIDIA uses an API key. ' +
        'Authentication is configured via the Settings panel in the Web UI.'
    },
    {
      title: 'Web search configuration',
      text:
        'Web search uses the Brave Search API. The API key is stored in system settings as ' +
        'system.web.search.brave_api_key in $HOME/.maximus/settings.json, or via the BRAVE_API_KEY ' +
        'environment variable. The WebSearch tool requires a reason and a query. ' +
        'Key setup (compact): open brave.com/search/api → Get Started → sign in → API Keys → Create New Key → ' +
        'copy key → store in Settings → Web → Brave Web Search.'
    },
    {
      title: 'Tools available',
      text:
        'Tools are executed by the gateway with PascalCase names. Available tools: ' +
        'RunCommand (bash command in $HOME, input: { reason, command, timeout_ms? }), ' +
        'WebFetch (input: { reason, url, extractMode?, maxChars? }), ' +
        'WebSearch (input: { reason, query, count?, country?, search_lang? }), ' +
        'ListConfiguration (returns provider status, current model, limits, and recent usage), ' +
        'CreateCronJob (input: { reason, schedule, name?, timezone?, payload?, enabled?, max_retries?, retry_backoff_ms? } - creates a scheduled job), ' +
        'ListCronJobs (returns all cron jobs), ' +
        'DisableCronJob (input: { reason, jobId } - disables a scheduled job), ' +
        'GetCurrentTime (returns current UTC and local server time), ' +
        'ListSkills (returns available external skills from registry), ' +
        'ReadSkill (input: { reason, skillId, returnContent?, maxChars? } - reads a skill and updates memory), ' +
        'LearnSkill (input: { reason, skillId, name?, description?, keywords?, content, entrypoints? } - creates a new skill and ingests it), ' +
        'UnlearnSkill (input: { reason, skillId } - deletes a previously created skill from registry and memory), ' +
        'ReadFile (input: { reason, path, maxBytes?, encoding? } - reads file under $HOME and ingests to memory, supports ~/ prefix), ' +
        'Grep (input: { reason, pattern, path?, glob?, maxResults?, caseSensitive? } - searches files under $HOME and ingests results), ' +
        'ReplaceFile (input: { reason, path, content, encoding?, backup? } - creates or replaces entire file under $HOME and ingests, file is created if it does not exist), ' +
        'StrReplaceFile (input: { reason, path, find, replace, flags?, maxReplacements?, backup? } - replaces blocks in file under $HOME and ingests), ' +
        'SetOnboardingComplete (input: { reason, summary, preferences? } - marks onboarding complete and stores summary in memory). ' +
        'All file tools operate within $HOME (supports ~/ paths and absolute paths under $HOME) and automatically ingest content/results into memory with source: "file". ' +
        'Tool names are normalized to PascalCase for execution while preserving provider-specific naming in conversation context.'
    },
    {
      title: 'Conversation Compaction',
      text:
        'The CompactConversation tool (core tool) summarizes and compresses the last ~350 chat messages. ' +
        'Input: { reason: string, contextWindow?: number (default: 350) }. ' +
        'The tool pulls recent messages, sends them to the provider for summarization (narrative summary + key points + things to remember), ' +
        'and stores the result in memory with source: "summary" and path: docs:compact-conversation/<timestamp>. ' +
        'This allows future prompts to retrieve the compact summary instead of replaying all raw messages. ' +
        'The compaction is read-only (does not modify chat history) and should be used when conversations become lengthy. ' +
        'Works with all providers: Anthropic, Ollama, OpenAI Codex, Kimi, and NVIDIA. ' +
        'For OpenAI Codex, Kimi, and NVIDIA, the summarizer uses the same model as the active conversation when available. ' +
        'IMMEDIATELY AFTER calling CompactConversation, call TrimChatHistory with keepLast=20 to purge the old raw messages while keeping the summary. ' +
        'The system prompt instructs you to AUTOMATICALLY compact and trim when history exceeds 350 messages.'
    },
    {
      title: 'TrimChatHistory Tool',
      text:
        'The TrimChatHistory tool (core tool) deletes old chat entries, keeping only the N most recent messages. ' +
        'Input: { reason: string, keepLast?: number }. ' +
        'If keepLast is omitted, all user/assistant messages are deleted. ' +
        'System messages and summaries are preserved. ' +
        'Best practice: Use immediately after CompactConversation to drop raw messages after they have been summarized. ' +
        'Example workflow: 1) CompactConversation(reason: "Thread is too long", contextWindow: 350) → 2) TrimChatHistory(reason: "Clean up after compaction", keepLast: 20). ' +
        'You are instructed to run this automatically when history exceeds 350 messages, and explain to the user what you did.'
    },
    {
      title: 'Self-Awareness Subsystem',
      text:
        'The agent\'s self-awareness instructions are modularized in the `gateway/self-awareness/` directory. ' +
        '`load-awareness.js` defines the static knowledge items, `inject-awareness.js` handles ingestion into ' +
        'the persistent memory store, and `apply-awareness.js` orchestrates the bootstrap process during gateway startup.'
    },
    {
      title: 'Messaging and Tooling Subsystems',
      text:
        'The messaging logic (payloads, streaming, response parsing) is modularized in `gateway/messaging/`. ' +
        'The tooling logic (definitions, execution, guards) is modularized in `gateway/tools/`. ' +
        'This separation ensures clean boundaries between communication with providers and local tool execution capabilities.'
    },
    {
      title: 'Ad-Hoc Communication Subsystem',
      text:
        'The ad-hoc communication subsystem (`gateway/ad-hoc/`) centralizes WebSocket message protocol ' +
        'definitions and messenger classes for gateway -> client communication. ' +
        '`types.js` defines MessageType constants for all message types. ' +
        '`messenger.js` exports ClientMessenger (single client) and BroadcastMessenger (all clients) classes. ' +
        'Use ClientMessenger to send typed messages like messenger.status(), messenger.reloadHistory(), ' +
        'messenger.streamChunk(), messenger.toolCall(), messenger.toolResult(). ' +
        'Use BroadcastMessenger for gatewayState and reloadRequest broadcasts. ' +
        'This replaces the previous ad-hoc ws.send(JSON.stringify(...)) pattern.'
    },
    {
      title: 'Memory Subsystem',
      text:
        'The memory subsystem is modularized in `gateway/memory/`. ' +
        'It handles database management (db.js), embeddings (embeddings.js), chunking (chunking.js), ' +
        'ingestion (ingestion.js), and search (search.js).'
    },
    {
      title: 'Prompt Subsystem',
      text:
        'The prompt subsystem is modularized in `gateway/prompts/`. ' +
        '`index.js` is the public API for prompt assembly. ' +
        '`system.js` contains the base system prompt. ' +
        '`onboarding.js` contains the onboarding prompt and trigger message. ' +
        'Onboarding is memory-driven: the gateway checks memory meta `onboarding:complete` to decide whether to append the onboarding prompt. ' +
        'Once onboarding is done, the model should call SetOnboardingComplete to store a summary and set the meta flag. ' +
        '`templates.js` provides formatting helpers for memory and skills injection. ' +
        'Prompts are assembled dynamically with optional memory snippets and skill context.'
    },
    {
      title: 'Advanced Configuration Subsystem',
      text:
        'The configuration subsystem (`gateway/config/`) is a runtime service. ' +
        '`index.js` is the public API. `state.js` holds mutable state. `io.js` handles file I/O. ' +
        '`normalize.js` handles parsing and migration. `apply.js` creates runtime clients. ' +
        '`providers.js` builds status payloads. `runtime.js` manages runtime operations.'
    },
    {
      title: 'Provider Adapter Subsystem',
      text:
        'The provider subsystem (`gateway/providers/`) contains normalized adapters for each LLM provider. ' +
        '`index.js` exports all providers. `anthropic.js`, `ollama.js`, `openai-codex.js`, `kimi.js`, and `nvidia.js` each implement ' +
        'a consistent interface: `streamChat(params)` returns `{content, toolCalls, usage}`, ' +
        '`supportsTools` boolean flag, and `isReady(credentials)` check. ' +
        'Providers handle only API communication; payload construction is in `messaging/`, ' +
        'tool execution is in `tools/`, and orchestration is in `server.js`.'
    },
    {
      title: 'Web UI and Development Server',
      text:
        'The web UI is served by webpack dev server (`web/webpack.config.js`) running on port 8080 (default). ' +
        'The UI connects to the gateway WebSocket on port 8081 via proxy configuration. ' +
        'Hot Module Replacement (HMR) is enabled for instant updates during development. ' +
        'To start the web UI: `npm run web` (or `npm run web:container` for containerized environments). ' +
        'The UI code is in `web/public/index.html` as a monolithic file with inline CSS and JavaScript. ' +
        'No production build or framework (React/Vue) is used; this is a development-only environment.'
    },
    {
      title: 'Messaging Subsystem',
      text:
        'The messaging subsystem (`gateway/messaging/`) handles provider-agnostic message processing. ' +
        '`payloads.js` builds request payloads for each provider format. ' +
        '`stream.js` orchestrates streaming between providers and WebSocket, sending `streamStart`, ' +
        '`streamChunk`, `streamEnd` events. `responses.js` parses provider responses to extract ' +
        'text and tool calls. The messaging layer delegates provider API calls to `gateway/providers/`.'
    },
    {
      title: 'External Skills Subsystem',
      text:
        'External skills are CLI tools and capabilities documented in `gateway/external-skills/`. ' +
        'The registry (`index.json`) lists all skills with metadata: id, name, description, keywords, install instructions, and examples. ' +
        'Each skill has a SKILL.md at `skills/<skill-id>/SKILL.md` with overview, install, usage, arguments, examples, and troubleshooting. ' +
        'Skills are ingested into memory at bootstrap and matched via keywords when user queries relate to them. ' +
        'Available skills: gog (Google Workspace CLI), whisper (audio transcription). ' +
        'To use a skill: check if installed, use the injected skill context or ReadFile to confirm exact command syntax, then execute via RunCommand with a clear reason.'
    },
    {
      title: 'External Skills Troubleshooting',
      text:
        'If skills are not loading or matching: ' +
        '1) Verify `gateway/external-skills/index.json` exists and is valid JSON. ' +
        '2) Verify SKILL.md files exist at the paths referenced in index.json. ' +
        '3) Check gateway logs for "[Skills]" messages during bootstrap. ' +
        '4) Verify memory meta keys `external-skill:ingested/<skill-id>` were written. ' +
        '5) To re-ingest a skill, use the UI or restart the gateway. ' +
        'If skill docs fail to ingest, the gateway continues without crashing; check logs for specific errors.'
    }
  ];
}
