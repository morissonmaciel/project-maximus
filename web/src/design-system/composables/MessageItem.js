import Bunnix from '@bunnix/core';
import { renderMarkdown } from '../../utils/helpers.js';
import './MessageItem.css';

const { div, span } = Bunnix;

// Tool message content component (replaces raw HTML string builder)
function ToolMessageContent({ meta }) {
  const statusText = meta.status === 'running' ? 'using' : meta.status === 'success' ? 'used' : 'failed';
  const statusClass = `tool-${meta.status}`;

  return div({ class: `tool-call-inline ${statusClass}` },
    span({ class: 'tool-status' }, statusText),
    ' ',
    span({ class: 'tool-name' }, meta.toolName),
    meta.reason ? div({ class: 'tool-reason' }, meta.reason) : null
  );
}

// Message Component
export function MessageItem({ msg }) {
  // Tool message rendering - uses same assistant avatar styling
  if (msg.meta?.type === 'tool') {
    return div({ class: 'message assistant tool-message' },
      div({ class: 'message-avatar' }, 'M'),
      div({ class: 'message-content' },
        ToolMessageContent({ meta: msg.meta })
      )
    );
  }

  if (msg.meta?.hidden) {
    return null;
  }

  if (msg.meta?.source === 'cron') {
    return div({ class: 'message user cron-message' },
      div({ class: 'message-avatar' }, '$'),
      div({ class: 'message-content' },
        div({ class: 'cron-badge' }, 'CRON EVENT'),
        div({ class: 'cron-text', innerHTML: renderMarkdown(msg.content) })
      )
    );
  }

  // Regular message rendering
  return div({ class: `message ${msg.role}` },
    div({ class: 'message-avatar' }, msg.role === 'user' ? '$' : 'M'),
    div({ class: 'message-content', innerHTML: renderMarkdown(msg.content) })
  );
}
