import Bunnix from '@bunnix/core';
import { ChatWindow } from '../components/ChatWindow.js';
import { InputArea } from '../components/InputArea.js';
import './ChatPage.css';

const { div } = Bunnix;

/**
 * Chat Page Component
 * Composes ChatWindow and InputArea into a complete chat page view
 * Layout: Header (in app.js) -> ChatWindow -> InputArea (with StatusBar)
 */
export function ChatPage() {
  return div({ class: 'chat-page' },
    div({ class: 'chat-main' },
      ChatWindow(),
      InputArea()
    )
  );
}
