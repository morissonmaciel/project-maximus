# Agentic Instructions - Web UI

Guidance for AI agents working on the Maximus Web UI.

## Architecture Overview

The Web UI is built with **Bunnix**, a lightweight reactive UI framework similar to React but with explicit state management.

```
web/
├── src/
│   ├── app.js              # Main app, UI composition only
│   ├── components/         # UI components (pure functions)
│   ├── state/              # @bunnix/redux stores
│   ├── ws/                 # WebSocket client + handlers
│   └── styles.css          # Global styles
```

## Key Technologies

- **Bunnix** - Reactive UI framework (components, effects, mounting)
- **@bunnix/redux** - State management (stores, actions, reactive selectors)
- **WebSocket** - Real-time communication with gateway (REST-like request/response + streaming)
- **Webpack** - Build tool with dev server and HMR

## Component Patterns

### Component Structure

Components are pure functions returning Bunnix elements:

```javascript
import Bunnix from '@bunnix/core';

export function ComponentName({ prop1, prop2 }) {
  // Read from store
  const reactiveValue = store.state.map(s => s.field);

  // Event handlers
  const handleClick = () => {
    store.doSomething({ value: 'new value' });
  };

  return Bunnix.div({ class: 'component-class' },
    Bunnix.h3('Title'),
    Bunnix.span(reactiveValue),  // Auto-updates on state change
    Bunnix.button({
      class: 'btn',
      click: handleClick
    }, 'Click me')
  );
}
```

### Component Rules

1. **Pure functions** - No side effects in component body
2. **Use `Bunnix.useEffect()`** only in components that need it (WS handlers are in `src/ws/handlers.js`)
3. **Derive values** from stores using `.map()` for reactivity
4. **Pass callbacks** as props for child-to-parent communication
5. **Class names** use kebab-case: `settings-panel`, `modal-actions`

## State Management

### Store Pattern

```javascript
import { createStore } from '@bunnix/redux';

export const myStore = createStore({
  field1: 'initial',
  field2: false
}, {
  // Actions return new state
  setField1: (state, { value }) => ({ ...state, field1: value }),
  setField2: (state, { value }) => ({ ...state, field2: value }),
  toggle: (state) => ({ ...state, field2: !state.field2 })
});

// Reactive selectors
export const field1Value = myStore.state.map(s => s.field1);
export const isReady = myStore.state.map(s => s.field1 && s.field2);
```

### State Rules

1. **Never mutate state directly** - Always use actions
2. **Spread previous state** - `({ ...state, field: value })`
3. **Use `.map()` for derived values** - Creates reactive subscription
4. **One store per domain** - `session`, `config`, `catalog`

### Existing Stores

| Store | File | Purpose |
|-------|------|---------|
| `sessionStore` | `state/session.js` | Chat messages, processing state |
| `configStore` | `state/config.js` | User config snapshot + settings UI state |
| `catalogStore` | `state/catalog.js` | Providers/models catalog |

## WebSocket Integration

### Handlers

Handlers live in `web/src/ws/handlers.js` and are installed in `web/src/index.js`.

### Sending Messages

```javascript
import { send } from './ws/client.js';

send({ type: 'getConfig' });
```

### Common Message Types

Gateway → Client: `config`, `catalog`, `session`, `sessionPatch`, `streamStart`, `streamChunk`, `streamEnd`

Client → Gateway: `getConfig`, `getCatalog`, `getSession`, `sendMessage`, `setProvider`, `setModel`, `set*ApiKey`

## Styling

### CSS Conventions

- **Classes use kebab-case**: `chat-window`, `settings-panel`
- **Component root class** matches component name: `.provider-selector`
- **State variants**: `.is-active`, `.is-disabled`, `.is-loading`

### Adding Styles

1. Prefer existing utility classes in `styles.css`
2. Add component-specific styles with clear naming
3. Use CSS variables for theming:
   ```css
   :root {
     --bg-primary: #0d1117;
     --text-primary: #c9d1d9;
     --accent: #58a6ff;
   }
   ```

## Adding a Settings Panel

### Step-by-step

1. **Create panel file** `src/components/settings/MyProviderPanel.js`:

```javascript
import Bunnix from '@bunnix/core';
import { send } from '../../ws/client.js';
import { configStore } from '../../state/config.js';
import { formatValue } from '../../utils/helpers.js';

export function MyProviderPanel({ settings }) {
  const providerData = settings?.providers?.myProvider || {};
  const apiKey = configStore.state.map(s => s.myApiKey);
  const isSaving = configStore.state.map(s => s.isSaving);

  const saveKey = () => {
    const key = configStore.state.get().myApiKey?.trim();
    if (!key) return;
    configStore.setSaving({ value: true });
    send({ type: 'setMyApiKey', apiKey: key });
  };

  return Bunnix.div({ class: 'settings-panel' },
    Bunnix.div({ class: 'settings-section' },
      Bunnix.h4('Authentication'),
      Bunnix.p('Enter your API key.'),
      Bunnix.input({
        type: 'password',
        placeholder: 'key-...',
        value: apiKey,
        input: (e) => configStore.setMyApiKey({ value: e.target.value }),
        keydown: (e) => { if (e.key === 'Enter') saveKey(); }
      }),
      Bunnix.div({ class: 'modal-actions auth-actions' },
        Bunnix.button({
          class: 'modal-btn save',
          click: saveKey
        }, isSaving.map(v => v ? 'SAVING...' : 'SAVE KEY'))
      )
    ),

    // Usage section (if provider reports usage)
    Bunnix.div({ class: 'settings-section' },
      Bunnix.h4('Usage'),
      Bunnix.div({ class: 'settings-row' },
        Bunnix.span({ class: 'settings-label' }, 'Model'),
        Bunnix.span({ class: 'settings-value' }, formatValue(providerData.model, 'Unknown'))
      )
    )
  );
}
```

## Settings Pages

- All settings pages must live in `web/src/pages`.
- File and default export name must be prefixed with `Settings` (e.g., `SettingsGeneralPage` in `web/src/pages/SettingsGeneralPage.js`).
- `SettingsDialog` is responsible for routing sidebar selections to these pages.

2. **Add state** in `src/state/config.js`:

```javascript
export const configStore = createStore({
  // ... existing state
  myApiKey: ''
}, {
  // ... existing reducers
  setMyApiKey: (state, { value }) => ({ ...state, myApiKey: value })
});
```

3. **Register panel** in `src/components/SettingsModal.js`:

```javascript
import { MyProviderPanel } from './settings/MyProviderPanel.js';

// In panels array
const panels = [
  // ... existing panels
  { id: 'my-provider', label: 'My Provider', component: MyProviderPanel }
];
```

4. **Handle response** in `src/ws/handlers.js`:

```javascript
on('apiKeySet', (data) => {
  configStore.setSaving({ value: false });
  if (data.success) {
    configStore.resetAuth();
    configStore.setMyApiKey({ value: '' });
  }
});
```

## Adding a Component

### Basic Component Template

```javascript
import Bunnix from '@bunnix/core';
import { someStore } from '../state/somestore.js';

export function MyComponent({ title, onAction }) {
  const isActive = someStore.state.map(s => s.active);

  return Bunnix.div({ class: 'my-component' },
    Bunnix.h4(title),
    Bunnix.div({
      class: isActive.map(active => active ? 'content is-active' : 'content'),
      click: onAction
    }, 'Content here')
  );
}
```

### Component Guidelines

- Keep components small and focused
- Lift state up to stores, not parent components
- Use props for configuration, stores for shared state
- Handle events at component level, delegate to stores

## Common Tasks

### Adding a New WebSocket Message Handler

1. Add handler in `src/ws/handlers.js`
2. Document in `gateway/README.md` WebSocket protocol section

### Adding a New Route/View

The UI is single-page with modals. To add a new view:

1. Create component in `src/components/`
2. Add visibility state to appropriate store
3. Render conditionally in `app.js` or as modal

### Modifying the Chat Display

1. **Message rendering** - `src/components/MessageItem.js`
2. **Message state** - `src/state/session.js`
3. **Message types** handled in `src/ws/handlers.js`:
   - `streamStart`, `streamChunk`, `streamEnd`
   - `session`, `sessionPatch`
   - System messages (role: 'system') are filtered from UI display

**Note**: System messages are intentionally filtered from the UI in `app.js` as they contain AI context not intended for user visibility (onboarding summaries, compaction summaries, etc.).

## File Organization

### When to Create a New File

- **New component** that doesn't fit existing ones
- **New store** for distinct domain (rare)
- **Utility functions** used across components

### When to Modify Existing Files

- **Adding fields** to existing stores
- **New message types** in `app.js`
- **CSS classes** in `styles.css`

## Debugging

### Useful Techniques

1. **Log store state**:
   ```javascript
   console.log(store.state.get());
   ```

2. **Check WebSocket messages**:
   - Look in Network tab → WS → Messages

3. **Verify reactivity**:
   - Ensure `.map()` is used for reactive values
   - Check that state updates use store actions

## Dependencies

### Adding New Packages

```bash
cd web
npm install package-name
```

Prefer small, focused packages. The UI avoids large frameworks.

### Existing Key Dependencies

| Package | Purpose |
|---------|---------|
| `@bunnix/core` | UI framework |
| `@bunnix/redux` | State management |

## Testing Changes

1. **Dev server** auto-reloads on changes
2. **Check browser console** for errors
3. **Verify WebSocket** stays connected
4. **Test with actual provider** when possible

## Gateway Coordination

When modifying WebSocket protocol:

1. Update `gateway/server.js` handler
2. Update `gateway/README.md` protocol docs
3. Update this file if client patterns change

When adding provider support:

1. Add gateway handler first
2. Add UI panel following existing patterns
3. Update provider status display
