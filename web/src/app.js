import Bunnix from '@bunnix/core';
import { Container, Dialog, NavigationBar, Text } from '@bunnix/components';
import { Header } from './components/Header.js';
import Chat from './ChatView.js';

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
 * Handles UI composition only - WebSocket handlers are installed in ws/handlers.js
 */
export function App() {
  return (
    Container({ type: "main" },
      Dialog(),
      Header(),
      Container({ type: "content" },
        Chat(),
      ),
    )
  );
}
