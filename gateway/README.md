# Gateway (v0.5.0 Open Beta)

WebSocket gateway server that manages LLM providers, tool execution, and persistent memory.

> **Disclaimer**: This is an open beta release (v0.5.0). Features and APIs may change.

## Overview

The gateway sits between the web UI and LLM providers. It:

- Routes chat requests to the selected provider
- Executes tools (commands, file ops, web search)
- Manages conversation memory with SQLite + embeddings
- Handles OAuth flows for authentication

## Development

```bash
# Install dependencies
npm install

# Start the gateway (development mode with hot reload)
npm run dev

# Or production mode
npm start

# Or with debug logging
DEBUG=* npm run dev
```

The gateway runs on port 8081 by default (configure with `GATEWAY_PORT`).

## Adding a Provider

To add support for a new LLM provider:

1. Create `providers/<name>.js` implementing the adapter interface
2. Add configuration defaults in `config/constants.js`
3. Register in `providers/index.js` and `server.js`
4. Add a settings panel in `web/src/components/settings/`

See existing providers (`anthropic.js`, `kimi.js`) for examples.

## Adding a Tool

Tools are defined in `tools/` and registered in `tools-executer.js`:

1. Define the tool schema and function in `core-tools.js` (system) or `accessory-tools.js` (user-facing)
2. Export from `tools/index.js`
3. Register in `tools/tools-executer.js`

Tools receive input from the LLM and return results that are sent back to the conversation.

If the tool operates on files or directories, enforce full expanded absolute paths using `tools/accessory/path-validator.js`.

## File and Directory Tools

All file operations require **full expanded absolute paths**. Relative paths are rejected.

### Path Discovery

Before performing file operations, use these tools to get valid base paths:

| Tool | Purpose |
|------|---------|
| `GetWorkingDir` | Returns the current working directory |
| `GetRootMaximusDir` | Returns the gateway installation directory |

### File Operations

| Tool | Purpose |
|------|---------|
| `ReadFile` | Read file contents |
| `ReplaceFile` | Create or replace entire file |
| `StrReplaceFile` | Replace text/patterns in file |
| `Grep` | Search file contents |
| `CopyFile` | Copy a file |
| `MoveFile` | Move/rename a file |
| `RemoveFile` | Delete a file (permanent or trash) |

### Directory Operations

| Tool | Purpose |
|------|---------|
| `CreateDir` | Create a directory |
| `CopyDir` | Copy directory recursively |
| `MoveDir` | Move/rename a directory |
| `RemoveDir` | Delete a directory (permanent or trash) |

### Deletion Methods

Both `RemoveFile` and `RemoveDir` support a `deletionKind` parameter:
- `"system_trash"` (default) - Moves to system trash/recycle bin
- `"permanently"` - Permanently deletes

## Key Subsystems

| Directory | Purpose |
|-----------|---------|
| `providers/` | LLM API adapters |
| `tools/` | Tool definitions and execution |
| `memory/` | SQLite storage, embeddings, search |
| `config/` | Settings, state management |
| `messaging/` | Payload builders, streaming |

## Configuration

The gateway stores settings in `~/.maximus/settings.json`:

```json
{
  "provider": "anthropic",
  "anthropic": {
    "credentials": { "apiKey": "..." }
  }
}
```

Only credentials are persisted. Provider endpoints and defaults are hardcoded.

## WebSocket Protocol

The gateway communicates with the web UI via WebSocket:

**Client → Gateway:**
- `chat` - Send a message
- `setProvider` - Switch active provider
- `set*ApiKey` - Configure provider credentials
- `ping` - Keep-alive

**Gateway → Client:**
- `streamStart` / `streamChunk` / `streamEnd` - Streaming response
- `toolCall` / `toolResult` - Tool execution status
- `status` - Provider connection status

See `server.js` for all message handlers.

## Memory System

Conversations are stored in SQLite with:

- **messages** - Chat history (trimmed by `TrimChatHistory`)
- **chunks** - Text chunks with vector embeddings (survives trimming)
- **files** - Ingested file tracking
- **meta** - Key-value store including `onboarding:complete` flag

The memory subsystem retrieves relevant context from previous conversations to enrich prompts. Special documents like onboarding summaries and compaction summaries are stored in chunks and survive message trimming.

## External Skills

CLI capabilities are documented in `external-skills/`:

- Registry in `index.json`
- Documentation in `skills/<name>/SKILL.md`
- Auto-ingested into memory at startup

Skills are matched by keywords and injected into prompts when relevant.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_PORT` | WebSocket port | 8081 |
| `MEMORY_DB_PATH` | SQLite database path | `~/.maximus/memory.db` |
| `BRAVE_API_KEY` | Brave Search API key | - |
| `OLLAMA_HOST` | Ollama server URL | `http://127.0.0.1:11434` |

## See Also

- [`AGENTS.md`](AGENTS.md) - AI agent instructions
- [`../web/README.md`](../web/README.md) - Frontend documentation

## License

[GPL-3.0](../LICENSE) - See project root for full license text.
