import Bunnix, { Show } from '@bunnix/core';
import { send, settingsStore, formatValue } from '../helpers.js';
import './OpenAICodexPanel.css';

const { div, h4, p, button, input, span, ol, li } = Bunnix;

export function OpenAICodexPanel({ settings: codexSettings }) {
  const state = settingsStore.state.get();
  const codexData = codexSettings?.providers?.['openai-codex'] || {};
  const usage = codexData.usage;
  const limits = codexData.limits || {};

  const startCodexOAuth = () => {
    settingsStore.setStartingOAuth({ value: true });
    send({ type: 'startOAuthFlow', provider: 'openai-codex' });
  };

  const completeCodexOAuth = () => {
    const input = state.codexOauthCode?.trim();
    if (!input) return;

    let code = input;
    let codeState = null;

    try {
      const url = new URL(input);
      const urlCode = url.searchParams.get('code');
      const urlState = url.searchParams.get('state');
      if (urlCode) {
        code = urlCode;
        codeState = urlState || null;
      }
    } catch (e) {
      if (input.includes('#')) {
        const p = input.split('#');
        code = p[0];
        codeState = p[1];
      }
    }

    settingsStore.setCompletingOAuth({ value: true });
    send({ type: 'completeOAuthFlow', code, state: codeState });
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Authentication'),
      p('Authenticate with your OpenAI Codex account via OAuth.'),

      Show(settingsStore.state.map(s => s.codexOauthStep === 1), () =>
        div({ class: 'modal-actions' },
          button({
            class: 'modal-btn oauth',
            click: startCodexOAuth
          }, state.isStartingOAuth ? 'STARTING...' : 'START_OAUTH')
        )
      ),

      Show(settingsStore.state.map(s => s.codexOauthStep === 2), () =>
        div(null,
          ol({ class: 'oauth-steps' },
            li('Click the link below to open the authorization page.'),
            li('Log in and authorize the application.'),
            li('If the browser fails to load the redirect page (localhost:1455), look at the address bar.'),
            li('Copy the full URL or just the code and state (format: code#state).'),
            li('Paste it below and click Complete.')
          ),
          div({ class: 'oauth-url-box' }, state.codexOauthUrl || 'Generating URL...'),
          button({
            class: 'modal-btn',
            style: 'margin-bottom: 12px; width: 100%;',
            click: () => { if (state.codexOauthUrl) window.open(state.codexOauthUrl, '_blank'); }
          }, 'OPEN_AUTH_URL'),
          input({
            type: 'text',
            placeholder: 'Paste code#state or full URL here...',
            value: state.codexOauthCode,
            input: (e) => settingsStore.setCodexOAuthCode({ code: e.target.value }),
            keydown: (e) => { if (e.key === 'Enter') completeCodexOAuth(); }
          }),
          div({ class: 'modal-actions' },
            button({
              class: 'modal-btn cancel',
              click: () => {
                settingsStore.setCodexOAuthStep({ step: 1 });
                settingsStore.setCodexOAuthUrl({ url: null });
              }
            }, 'BACK'),
            button({
              class: 'modal-btn save',
              click: completeCodexOAuth
            }, state.isCompletingOAuth ? 'COMPLETING...' : 'COMPLETE')
          )
        )
      )
    ),

    div({ class: 'settings-section' },
      h4('Usage (Last Response)'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Model'),
        span({ class: 'settings-value' }, formatValue(codexData.model, 'Unknown'))
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
      )
    )
  );
}
