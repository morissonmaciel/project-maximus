# Web UI (v0.5.0 Open Beta)

Terminal-style chat interface for Maximus.

> **Disclaimer**: This is an open beta release (v0.5.0). Features and APIs may change.

## Overview

Built with [Bunnix](https://github.com/yourusername/bunnix), a lightweight reactive UI framework. The web UI connects to the gateway via WebSocket and provides:

- Real-time chat with streaming responses
- Tool execution visualization
- Settings management
- Provider switching

## Development

```bash
cd web

# Install dependencies
npm install

# Start dev server with hot reload
npm start
```

The dev server runs on port 8080 and proxies WebSocket connections to the gateway on port 8081.

## Architecture

The UI is organized into components, state stores, and WebSocket utilities:

```
src/
├── components/     # UI components (Header, MessageItem, etc)
├── state/          # @bunnix/redux stores
├── ws/             # WebSocket client + handlers
└── styles.css      # Global styles
```

**Message Handling**: The UI filters system messages (role: 'system') from display as they contain AI context not intended for users.

### Components

Components are pure functions that return Bunnix elements:

```javascript
import Bunnix from '@bunnix/core';

export function MyComponent({ title }) {
  return Bunnix.div({ class: 'my-component' },
    Bunnix.h2(title),
    Bunnix.span('Content')
  );
}
```

### State Management

Uses `@bunnix/redux` for reactive state:

```javascript
import { createStore } from '@bunnix/redux';

export const store = createStore({
  count: 0
}, {
  increment: (state) => ({ ...state, count: state.count + 1 })
});

// In components
const count = store.state.map(s => s.count);
```

Stores:
- `session.js` - Chat messages and processing state
- `config.js` - User config snapshot + settings UI state
- `catalog.js` - Providers/models catalog

### WebSocket

The WebSocket client in `ws/client.js` handles:
- Connection with auto-reconnect
- Message sending
- Event subscription

```javascript
import { connect, on, send } from './ws/client.js';

connect();
on('streamChunk', (data) => console.log(data.content));
send({ type: 'sendMessage', content: '...' });
```

## Adding a Settings Panel

To add settings for a new provider:

1. **Create the panel** in `components/settings/MyProviderPanel.js`:

```javascript
import Bunnix from '@bunnix/core';
import { send } from '../../ws/client.js';
import { configStore } from '../../state/config.js';

export function MyProviderPanel() {
  const apiKey = configStore.state.map(s => s.myApiKey);

  const save = () => {
    const key = configStore.state.get().myApiKey?.trim();
    if (key) send({ type: 'setMyApiKey', apiKey: key });
  };

  return Bunnix.div({ class: 'settings-panel' },
    Bunnix.input({
      type: 'password',
      value: apiKey,
      input: (e) => configStore.setMyApiKey({ value: e.target.value })
    }),
    Bunnix.button({ click: save }, 'Save')
  );
}
```

2. **Add state** in `state/config.js`:

```javascript
export const configStore = createStore({
  // ... existing
  myApiKey: ''
}, {
  // ... existing
  setMyApiKey: (state, { value }) => ({ ...state, myApiKey: value })
});
```

3. **Register** in `components/SettingsModal.js`

## Styling

CSS uses custom properties for theming:

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --text-primary: #c9d1d9;
  --accent: #58a6ff;
}
```

Components use kebab-case class names matching the component name.

## Build

```bash
# Development (with HMR)
npm start

# Production build
npm run build
```

## See Also

- [`AGENTS.md`](AGENTS.md) - Detailed coding patterns for AI agents
- [`../gateway/README.md`](../gateway/README.md) - Backend documentation

## License

[GPL-3.0](../LICENSE) - See project root for full license text.
