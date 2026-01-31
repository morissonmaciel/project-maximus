import Bunnix, { ForEach, Show } from '@bunnix/core';
import { send } from '../lib/websocket.js';
import {
  providerSelectorOpen,
  providerList,
  selectedProvider,
  provider
} from '../state/connection.js';
import { connectionStore } from '../state/connection.js';
import './ProviderSelector.css';

const { div, h3, p, button, span } = Bunnix;

function buildMeta(item) {
  if (item.id === 'ollama') {
    if (item.reachable === false) return item.error || 'Unavailable';
    if (!item.model) return 'Select a model';
    return `Model: ${item.model}`;
  }
  if (item.configured) return 'Configured';
  return 'Not configured';
}

function isSelectable(item) {
  if (item.id === 'ollama') {
    return item.reachable === true && !!item.model;
  }
  return !!item.configured;
}

export function ProviderSelector() {
  const isOpen = providerSelectorOpen.map(o => o);
  const providers = providerList.map(p => p || []);
  const currentProvider = provider.map(p => p);
  const selected = selectedProvider.map(p => p);

  const close = () => connectionStore.closeProviderSelector();

  const select = (id, selectable) => {
    if (!selectable) return;
    connectionStore.setSelectedProvider({ value: id });
  };

  const handleContinue = () => {
    const value = connectionStore.state.get().selectedProvider;
    if (!value) return;
    send({ type: 'setProvider', provider: value });
  };

  const canContinue = Bunnix.Compute([selected, providers], (sel, list) => {
    if (!sel) return false;
    const item = (list || []).find(p => p.id === sel);
    if (!item) return false;
    return isSelectable(item);
  });

  return Show(isOpen, () =>
    div({ class: 'modal-overlay active' },
      div({ class: 'modal' },
        h3('Choose Provider'),
        p({}, 'Choose a provider to start this session.'),
        Show(Bunnix.Compute([providers], (list) => list.length === 0), () =>
          p({}, 'No providers available.')
        ),
        div({ class: 'provider-grid' },
          ForEach(providers, 'id', (item) => {
            const selectable = isSelectable(item);
            const isActive = Bunnix.Compute([currentProvider], (cp) => cp === item.id);
            const isSelected = Bunnix.Compute([selected], (sel) => sel === item.id);
            const cardClass = Bunnix.Compute([isActive, isSelected], (active, selectedValue) => {
              let klass = 'provider-card';
              if (active) klass += ' active';
              if (!selectable) klass += ' disabled';
              if (selectedValue && selectable) klass += ' selected';
              return klass;
            });
            return div({
              class: cardClass,
              click: () => select(item.id, selectable)
            },
              div({ class: 'provider-title' }, item.label || item.id),
              div({ class: 'provider-meta' }, buildMeta(item))
            );
          })
        ),
        div({ class: 'modal-actions' },
          button({ class: 'modal-btn cancel', click: close }, 'Cancel'),
          button({
            class: Bunnix.Compute(canContinue, c => `modal-btn ${c ? 'save' : 'cancel'} ${c ? '' : 'disabled'}`),
            click: () => { if (connectionStore.state.get().providerSelectorOpen) handleContinue(); }
          }, 'Continue')
        )
      )
    )
  );
}
