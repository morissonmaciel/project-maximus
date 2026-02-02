import Bunnix, { Show } from '@bunnix/core';
import { send, settingsStore, formatValue } from '../helpers.js';
import { openModelSelector } from '../../../state/models.js';
import './ClaudeCodePanel.css';

const { div, h4, p, button, input, span, ol, li } = Bunnix;

export function ClaudeCodePanel({ settings: claudeCodeSettings }) {
  const state = settingsStore.state;
  const claudeCodeData = claudeCodeSettings?.providers?.['claude-code'] || {};
  const usage = claudeCodeData.accumulatedUsage || claudeCodeData.usage;
  const limits = claudeCodeData.limits || {};
  const rate = limits.rate || {};

  const totalInput = usage ?
    (Number(usage.input_tokens || 0) + Number(usage.cache_creation_input_tokens || 0) + Number(usage.cache_read_input_tokens || 0))
    : null;

  const configured = state.map(s => s.settings?.providers?.['claude-code']?.configured || false);
  const oauthStep = state.map(s => s.oauthStep);
  const displayModel = claudeCodeData.preferredModel || claudeCodeData.model || claudeCodeData.models?.[0] || 'Unknown';

  const startOAuth = () => {
    settingsStore.setStartingOAuth({ value: true });
    send({ type: 'startOAuthFlow', provider: 'claude-code' });
  };

  const changeOAuth = () => {
    send({ type: 'clearOAuthCredentials', provider: 'claude-code' });
    settingsStore.setOAuthStep({ step: 1 });
    settingsStore.setOAuthUrl({ url: null });
    settingsStore.setOAuthCode({ code: '' });
  };

  const completeOAuth = () => {
    const s = state.get();
    const codeState = s.oauthCode?.trim();
    if (!codeState) return;
    const parts = codeState.split('#');
    if (parts.length !== 2) return;
    settingsStore.setCompletingOAuth({ value: true });
    send({ type: 'completeOAuthFlow', code: parts[0], state: parts[1] });
  };

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Authentication'),
      p('Authenticate with your Claude Pro/Max account via OAuth.'),

      Show(oauthStep.map(step => step === 1), () => {
        const s = state.get();
        const isConfigured = s.settings?.providers?.['claude-code']?.configured;

        if (isConfigured) {
          return div(null,
            div({ class: 'oauth-status configured' },
              span({ class: 'status-badge configured' }, '✓'),
              'Configured'
            ),
            p('Your Claude Pro/Max account is authenticated.'),
            div({ class: 'modal-actions' },
              button({
                class: 'modal-btn oauth',
                click: changeOAuth
              }, 'Change OAuth')
            )
          );
        }

        return div({ class: 'modal-actions' },
          button({
            class: 'modal-btn oauth',
            click: startOAuth
          }, s.isStartingOAuth ? 'Starting...' : 'Start OAuth')
        );
      }),

      Show(oauthStep.map(step => step === 2), () => {
        const s = state.get();
        return div(null,
          ol({ class: 'oauth-steps' },
            li('Click the link below to open the authorization page'),
            li('Log in with your Claude Pro/Max account'),
            li('Copy the code from the URL (format: code#state)'),
            li('Paste it below and click Complete')
          ),
          div({ class: 'oauth-url-box' }, s.oauthUrl || 'Generating URL...'),
          button({
            class: 'modal-btn',
            style: 'margin-bottom: 12px; width: 100%;',
            click: () => { if (s.oauthUrl) window.open(s.oauthUrl, '_blank'); }
          }, 'Open Auth URL'),
          input({
            type: 'text',
            placeholder: 'Paste code#state here...',
            value: s.oauthCode,
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
            }, 'Back'),
            button({
              class: 'modal-btn save',
              click: completeOAuth
            }, s.isCompletingOAuth ? 'Completing...' : 'Complete')
          )
        );
      })
    ),

    div({ class: 'settings-section' },
      h4('Model Selection'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Current Model'),
        span({ class: 'settings-value' }, formatValue(displayModel, 'Unknown'))
      ),
      div({ class: 'modal-actions', style: 'margin-top: 12px;' },
        button({
          class: 'modal-btn save',
          click: () => openModelSelector('claude-code', displayModel)
        }, 'Select Model')
      )
    ),

    div({ class: 'settings-section' },
      h4('Current Session Usage'),
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
      h4('Limits'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Max tokens'),
        span({ class: 'settings-value' }, formatValue(limits.maxTokens))
      ),
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
