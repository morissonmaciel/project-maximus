import Bunnix, { Show } from '@bunnix/core';
import { authTab } from '../../../state/settings.js';
import { setAuthTab } from '../../../state/settings.js';
import { send, settingsStore, formatValue } from '../helpers.js';
import './AnthropicPanel.css';

const { div, h4, p, button, input, span, ol, li } = Bunnix;

export function AnthropicPanel({ settings: anthropicSettings }) {
  const state = settingsStore.state.get();
  const anthropicData = anthropicSettings?.providers?.anthropic || {};
  const usage = anthropicData.usage;
  const limits = anthropicData.limits || {};
  const rate = limits.rate || {};

  const totalInput = usage ?
    (Number(usage.input_tokens || 0) + Number(usage.cache_creation_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0))
    : null;

  const saveApiKey = () => {
    const apiKey = state.apiKey?.trim();
    if (!apiKey || !apiKey.startsWith('sk-ant-api')) return;
    settingsStore.setSaving({ value: true });
    send({ type: 'setApiKey', apiKey });
  };

  const startOAuth = () => {
    settingsStore.setStartingOAuth({ value: true });
    send({ type: 'startOAuthFlow', provider: 'anthropic' });
  };

  const completeOAuth = () => {
    const codeState = state.oauthCode?.trim();
    if (!codeState) return;
    const parts = codeState.split('#');
    if (parts.length !== 2) return;
    settingsStore.setCompletingOAuth({ value: true });
    send({ type: 'completeOAuthFlow', code: parts[0], state: parts[1] });
  };

  const tab = authTab.map(t => t);

  return div({ class: 'settings-panel' },
    div({ class: 'auth-tabs' },
      button({
        class: Bunnix.Compute(tab, t => `auth-tab ${t === 'apikey' ? 'active' : ''}`),
        click: () => setAuthTab('apikey')
      }, '[API_KEY]'),
      button({
        class: Bunnix.Compute(tab, t => `auth-tab ${t === 'oauth' ? 'active' : ''}`),
        click: () => setAuthTab('oauth')
      }, '[OAUTH]')
    ),

    Show(authTab.map(t => t === 'apikey'), () =>
      div({ class: "settings-section" },
        div({ class: 'auth-panel active' },
          p('Enter your Anthropic API key (sk-ant-api...).'),
          input({
            type: 'password',
            placeholder: 'sk-ant-api03-...',
            value: state.apiKey,
            input: (e) => settingsStore.setApiKey({ value: e.target.value }),
            keydown: (e) => { if (e.key === 'Enter') saveApiKey(); }
          }),
          div({ class: 'modal-actions auth-actions' },
            button({
              class: 'modal-btn save',
              click: saveApiKey
            }, state.isSaving ? 'SAVING...' : 'SAVE_KEY')
          )
        )
      )
    ),

    Show(authTab.map(t => t === 'oauth'), () =>
       div({ class: "settings-section" },
        div({ class: 'auth-panel active' },
          p('Authenticate with your Claude Pro/Max account via OAuth (token used directly).'),

          Show(settingsStore.state.map(s => s.oauthStep === 1), () =>
            div({ class: 'modal-actions' },
              button({
                class: 'modal-btn oauth',
                click: startOAuth
              }, state.isStartingOAuth ? 'STARTING...' : 'START_OAUTH')
            )
          ),

          Show(settingsStore.state.map(s => s.oauthStep === 2), () =>
            div(null,
              ol({ class: 'oauth-steps' },
                li('Click the link below to open the authorization page'),
                li('Log in and authorize the application'),
                li('Copy the code from the URL (format: code#state)'),
                li('Paste it below and click Complete')
              ),
              div({ class: 'oauth-url-box' }, state.oauthUrl || 'Generating URL...'),
              button({
                class: 'modal-btn',
                style: 'margin-bottom: 12px; width: 100%;',
                click: () => { if (state.oauthUrl) window.open(state.oauthUrl, '_blank'); }
              }, 'OPEN_AUTH_URL'),
              input({
                type: 'text',
                placeholder: 'Paste code#state here...',
                value: state.oauthCode,
                input: (e) => settingsStore.setOAuthCode({ code: e.target.value }),
                keydown: (e) => { if (e.key === 'Enter') completeOAuth(); }
              }),
              div({ class: 'modal-actions' },
                button({
                  class: 'modal-btn cancel',
                  click: () => {
                    settingsStore.setOAuthStep({ step: 1 });
                    settingsStore.setOAuthUrl({ url: null });
                  }
                }, 'BACK'),
                button({
                  class: 'modal-btn save',
                  click: completeOAuth
                }, state.isCompletingOAuth ? 'COMPLETING...' : 'COMPLETE')
              )
            )
          )
        )
       )
    ),

    div({ class: 'settings-section' },
      h4('Usage (Last Response)'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Model'),
        span({ class: 'settings-value' }, formatValue(anthropicData.model, 'Unknown'))
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Max tokens'),
        span({ class: 'settings-value' }, formatValue(limits.maxTokens))
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Input tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.input_tokens) : 'No usage yet')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Output tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.output_tokens) : '--')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Cache create'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.cache_creation_input_tokens) : '--')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Cache read'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.cache_read_input_tokens) : '--')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Total input'),
        span({ class: 'settings-value' }, totalInput || '--')
      )
    ),

    div({ class: 'settings-section' },
      h4('Rate Limits'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Requests'),
        span({ class: 'settings-value' },
          rate.requestsLimit ? `${formatValue(rate.requestsRemaining)} / ${formatValue(rate.requestsLimit)}` : 'Not available'
        )
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Requests reset'),
        span({ class: 'settings-value' }, formatValue(rate.requestsReset))
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Tokens'),
        span({ class: 'settings-value' },
          rate.tokensLimit ? `${formatValue(rate.tokensRemaining)} / ${formatValue(rate.tokensLimit)}` : 'Not available'
        )
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Tokens reset'),
        span({ class: 'settings-value' }, formatValue(rate.tokensReset))
      )
    )
  );
}
