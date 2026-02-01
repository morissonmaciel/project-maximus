import Bunnix from '@bunnix/core';
import { Header } from './design-system/navigation/index.js';
import { ChatPage } from './pages/index.js';
import { SettingsModal, ProviderSelector, AuthDialog, NotificationDialog, ModelSelector } from './dialogs/index.js';
import './styles.css';
import './dialogs/NotificationDialog.css';

const { div } = Bunnix;

/**
 * Request notification permission on first user interaction
 */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Call on first click anywhere in the app
document.addEventListener('click', requestNotificationPermission, { once: true });

/**
 * Main App component
 * Handles UI composition only - WebSocket handlers are in ad-hoc/ folder
 */
export function App() {
  return div({ class: 'app' },
    Header(),
    ChatPage(),
    ProviderSelector(),
    SettingsModal(),
    AuthDialog(),
    NotificationDialog(),
    ModelSelector()
  );
}
