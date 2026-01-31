import Bunnix, { ForEach, Show } from '@bunnix/core';
import { messages, isTyping, messagesStore } from '../state/messages.js';
import { MessageItem } from '../design-system/composables/index.js';
import './ChatWindow.css';

const { div, span } = Bunnix;

// Chat Component
export function ChatWindow() {
  const anchorRef = Bunnix.useRef(null);

  // Create reactive atoms inside component
  const msgs = messages.map(m => m);
  const typing = isTyping.map(t => t);

  // Scroll to bottom on new messages
  const handleScroll = () => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  Bunnix.useEffect(state => {
    if (!state) return;
    handleScroll();
  }, messagesStore.state);

  return div({ class: 'chat-container', id: 'chat-container' },
    ForEach(msgs, 'id', (msg) => MessageItem({ msg })),
    Show(typing, () =>
      div({ class: 'typing-indicator' },
        span(), span(), span()
      )
    ),
    span({ ref: anchorRef })
  );
}
