import Bunnix, { ForEach } from '@bunnix/core';
import { send } from '../helpers.js';
import './MemoryPanel.css';

const { div, h4, p, button, span } = Bunnix;

export function MemoryPanel({ docs: docsData }) {
  const handleReingest = (name) => {
    send({ type: 'reingestDoc', name });
  };

  const handleReingestAll = () => {
    send({ type: 'reingestAllDocs' });
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Memory Documents'),
      p({ class: 'settings-muted' }, 'Re-ingest docs from /skills to update memory.'),
      div({ class: 'modal-actions auth-actions' },
        button({ class: 'modal-btn save', click: handleReingestAll }, 'REINGEST_ALL')
      ),
      div({ style: 'margin-top: 12px;' },
        docsData.length === 0 ?
          div({ class: 'settings-muted' }, 'No docs found.') :
          ForEach(docsData, 'name', (doc) =>
            div({ class: 'doc-item' },
              span({ class: 'doc-name' }, doc.name),
              button({ class: 'modal-btn save', click: () => handleReingest(doc.name) }, 'REINGEST')
            )
          )
      )
    )
  );
}
