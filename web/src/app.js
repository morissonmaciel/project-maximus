import Bunnix from '@bunnix/core';
import { Header } from './design-system/navigation/index.js';
import { ChatPage } from './pages/index.js';
import { SettingsModal, ProviderSelector } from './dialogs/index.js';
import './styles.css';

const { div } = Bunnix;

/**
 * Main App component
 * Handles UI composition only - WebSocket handlers are in ad-hoc/ folder
 */
export function App() {
  return div({ class: 'app' },
    Header(),
    ChatPage(),
    ProviderSelector(),
    SettingsModal()
  );
}
