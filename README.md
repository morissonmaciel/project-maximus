# Maximus v0.5.0 (Open Beta)

A multi-provider LLM gateway with an optimized web interface, tool execution, and persistent memory.

> **Disclaimer**: This is an open beta release (v0.5.0). Features and APIs may change. Please report issues at https://github.com/anthropics/project-maximus/issues

![Architecture](https://img.shields.io/badge/architecture-gateway%2Bweb-blue)
![License](https://img.shields.io/badge/license-GPL--3.0-blue)

Chat with Claude, GPT, Kimi, or local models through a unified interface. The gateway handles streaming responses, tool execution, and memory management so you can focus on the conversation.

## Features

- **Multiple Providers** - Claude (Anthropic), GPT (OpenAI), Kimi, NVIDIA NIM, or local Ollama models
- **Tool Execution** - Run commands, search the web, read files, all with safety guards
- **Persistent Memory** - SQLite-backed storage with embeddings for contextual recall
- **Optimized Web Interface** - Clean, distraction-free chat interface
- **OAuth & API Keys** - Flexible authentication for different providers

## Quick Start

```bash
# Install all dependencies (root, gateway, and web)
npm run install:all

# Or install separately:
# npm install && npm run install:gateway && npm run install:web

# Start gateway and web UI
npm start

# Start gateway only
npm run gateway

# Start web UI only
npm run web

# Open browser
open http://localhost:8080
```

## Configuration

On first run, the gateway creates `~/.maximus/` with:

```
~/.maximus/
├── settings.json    # API keys and preferences
└── memory.db        # Chat history and embeddings
```

Set your provider API keys in the Settings panel (gear icon), or use environment variables:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export BRAVE_API_KEY="..."  # For web search
```

## Available Tools

The AI can use tools to interact with your system:

| Tool | What it does |
|------|--------------|
| `RunCommand` | Execute shell commands (with confirmation) |
| `WebSearch` | Search the web via Brave |
| `WebFetch` | Fetch and read webpage content |
| `ReadFile` / `Grep` | Read and search files |
| `ReplaceFile` | Create or modify files |

Additional system tools manage conversation compaction, cron jobs, and configuration.

## Architecture

```
┌─────────────┐      WebSocket      ┌──────────────┐      HTTPS      ┌──────────┐
│   Web UI    │ ◄─────────────────► │   Gateway    │ ◄─────────────► │  LLM API │
│  (Bunnix)   │                     │   (Node.js)  │                 │(Provider)│
└─────────────┘                     └──────────────┘                 └──────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  SQLite DB   │
                                    │  (memory)    │
                                    └──────────────┘
```

The **gateway** handles provider APIs, tool execution, and memory. The **web UI** is a thin client that displays messages and streams responses.

## Project Structure

```
├── gateway/          # WebSocket server, providers, tools, memory
├── web/              # Terminal-style chat UI
└── package.json      # Root dependencies and scripts
```

See individual READMEs for details:
- [`gateway/README.md`](gateway/README.md) - Backend development
- [`web/README.md`](web/README.md) - Frontend development

## Development

Each component has its own `package.json` and can be developed independently:

```bash
# Install dependencies for all components
npm run install:all

# Run just the gateway
cd gateway && npm run dev

# Run just the web UI (in another terminal)
cd web && npm run dev

# Or from root, use the shorthand commands:
npm run gateway   # Runs gateway dev server
npm run web       # Runs web UI dev server
```

## Provider Setup

| Provider | Setup |
|----------|-------|
| **Anthropic** | API key from [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI Codex** | OAuth via ChatGPT subscription |
| **Kimi** | API key from platform.moonshot.cn |
| **NVIDIA** | API key from [build.nvidia.com](https://build.nvidia.com) |
| **Ollama** | Install [ollama.com](https://ollama.com) and run a model locally |

## Documentation

- **For users** - This README
- **For AI agents** - [`gateway/AGENTS.md`](gateway/AGENTS.md) and [`web/AGENTS.md`](web/AGENTS.md)
- **For contributors** - [`gateway/README.md`](gateway/README.md) and [`web/README.md`](web/README.md)

## License

[GPL-3.0](LICENSE) - See [LICENSE](LICENSE) file for details.
