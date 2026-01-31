import Bunnix from '@bunnix/core';
import { send } from '../lib/websocket.js';
import { isConnected } from '../state/connection.js';
import { addMessage } from '../state/messages.js';
import { StatusBar } from '../design-system/composables/index.js';
import './InputArea.css';

const { div, form, input, button } = Bunnix;

// Input Component
export function InputArea() {
  const inputValue = Bunnix.useState('');
  const connected = isConnected.map(c => c);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputValue.get().trim();
    if (!text || !connected.get()) return;

    addMessage('user', text);
    send({ type: 'chat', messages: [{ role: 'user', content: text }] });
    inputValue.set('');
  };

  return div({ class: 'input-area' },
    form({ class: 'input-form', submit: handleSubmit },
      div({ class: 'input-container' },
        input({
          class: 'message-input',
          type: 'text',
          value: inputValue,
          input: (e) => inputValue.set(e.target.value),
          placeholder: 'Type a message...',
          disabled: connected.map(c => !c)
        })
      ),
      button(
        { class: 'send-btn', type: 'submit', disabled: connected.map(c => !c) },
        'Send'
      )
    ),
    StatusBar()
  );
}
