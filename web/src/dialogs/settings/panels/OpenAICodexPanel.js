import Bunnix, { Show } from '@bunnix/core';
import { send, settingsStore, formatValue, resolveProviderModel } from '../helpers.js';
import { openModelSelector } from '../../../state/models.js';
import { ProgressBar } from '../../../design-system/primitives/ProgressBar.js';
import './OpenAICodexPanel.css';

const { div, h4, p, button, input, span, ol, li } = Bunnix;

export function OpenAICodexPanel({ settings: codexSettings }) {
  const state = settingsStore.state;
  const codexData = codexSettings?.providers?.['openai-codex'] || {};
  const usage = codexData.accumulatedUsage || codexData.usage;
  const limits = codexData.limits || {};
  const daily = limits?.daily || null;
  const weekly = limits?.weekly || null;
  const displayModel = resolveProviderModel(codexData);
  const formatWindow = (minutes, unit) => {
    const value = Number(minutes);
    if (!Number.isFinite(value)) return '--';
    const converted = unit === 'hours' ? value / 60 : value / 1440;
    const formatted = Number.isInteger(converted) ? converted : Number(converted.toFixed(1));
    return `${formatted} ${unit}`;
  };

  const isConfigured = () => {
    const s = state.get();
    return s.settings?.providers?.['openai-codex']?.configured || false;
  };

  const startCodexOAuth = () => {
    settingsStore.setStartingOAuth({ value: true });
    send({ type: 'startOAuthFlow', provider: 'openai-codex' });
  };

  const changeOAuth = () => {
    send({ type: 'clearOAuthCredentials', provider: 'openai-codex' });
    settingsStore.setCodexOAuthStep({ step: 1 });
    settingsStore.setCodexOAuthUrl({ url: null });
    settingsStore.setCodexOAuthCode({ code: '' });
  };

  const completeCodexOAuth = () => {
    const s = state.get();
    const input = s.codexOauthCode?.trim();
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

  // Create observables for step display
  const codexOauthStep = state.map(s => s.codexOauthStep);

  return div({ class: 'settings-panel' },
    div({ class: 'settings-section' },
      h4('Authentication'),
      p('Authenticate with your OpenAI Codex account via OAuth.'),

      // Step 1: Start OAuth button (or show configured state)
      Show(codexOauthStep.map(step => step === 1), () => {
        const s = state.get();
        const configured = s.settings?.providers?.['openai-codex']?.configured;

        // If configured, show the "already authorized" view
        if (configured) {
          return div(null,
            div({ class: 'oauth-status configured' },
              span({ class: 'status-badge configured' }, '✓'),
              'Configured'
            ),
            p('Your OpenAI Codex account is authenticated.'),
            div({ class: 'modal-actions' },
              button({
                class: 'modal-btn oauth',
                click: changeOAuth
              }, 'Change OAuth')
            )
          );
        }

        // Otherwise show the start button
        return div({ class: 'modal-actions' },
          button({
            class: 'modal-btn oauth',
            click: startCodexOAuth
          }, s.isStartingOAuth ? 'Starting...' : 'Start OAuth')
        );
      }),

      // Step 2: Complete OAuth
      Show(codexOauthStep.map(step => step === 2), () => {
        const s = state.get();
        return div(null,
          ol({ class: 'oauth-steps' },
            li('Click the link below to open the authorization page.'),
            li('Log in and authorize the application.'),
            li('If the browser fails to load the redirect page (localhost:1455), look at the address bar.'),
            li('Copy the full URL or just the code and state (format: code#state).'),
            li('Paste it below and click Complete.')
          ),
          div({ class: 'oauth-url-box' }, s.codexOauthUrl || 'Generating URL...'),
          button({
            class: 'modal-btn',
            style: 'margin-bottom: 12px; width: 100%;',
            click: () => { if (s.codexOauthUrl) window.open(s.codexOauthUrl, '_blank'); }
          }, 'Open Auth URL'),
          input({
            type: 'text',
            placeholder: 'Paste code#state or full URL here...',
            value: s.codexOauthCode,
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
            }, 'Back'),
            button({
              class: 'modal-btn save',
              click: completeCodexOAuth
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
          click: () => openModelSelector('openai-codex', displayModel)
        }, 'Select Model')
      )
    ),

    div({ class: 'settings-section' },
      h4('Current Session Usage'),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Input tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.input_tokens) : 'No usage yet — make a request to see usage')
      ),
      div({ class: 'settings-row' },
        span({ class: 'settings-label' }, 'Output tokens'),
        span({ class: 'settings-value' }, usage ? formatValue(usage.output_tokens) : '--')
      ),
      usage?.total_tokens !== undefined && usage?.total_tokens !== null
        ? div({ class: 'settings-row' },
            span({ class: 'settings-label' }, 'Total tokens'),
            span({ class: 'settings-value' }, formatValue(usage.total_tokens))
          )
        : null
    ),

    div({ class: 'settings-section' },
      h4('Limits'),
      daily || weekly ? null : div(null,
        limits.maxTokens
          ? div({ class: 'settings-row' },
              span({ class: 'settings-label' }, 'Max tokens'),
              span({ class: 'settings-value' },
                `${formatValue(limits.maxTokens)}${usage ? '' : ' (default)'}`
              )
            )
          : p('No limits available from provider.'),
        limits.contextWindow
          ? div({ class: 'settings-row' },
              span({ class: 'settings-label' }, 'Context window'),
              span({ class: 'settings-value' },
                `${formatValue(limits.contextWindow)}${usage ? '' : ' (default)'}`
              )
            )
          : null
      ),
      daily ? div(null, [
        h4({ class: 'settings-subtitle' }, 'Daily window'),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Used'),
          daily.used_percent !== null && daily.used_percent !== undefined
            ? div({ class: 'limits-progress-row' }, [
                ProgressBar({
                  progress: Number(daily.used_percent),
                  variant: 'success',
                  size: 'xl'
                }),
                span({ class: 'limits-progress-value settings-value' }, `${Math.round(daily.used_percent)}%`)
              ])
            : span({ class: 'settings-value' }, '--')
        ),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Usage limit window (hours)'),
          span({ class: 'settings-value' }, formatWindow(daily.window_minutes, 'hours'))
        ),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Reset at'),
          span({ class: 'settings-value' }, daily.reset_at ? new Date(daily.reset_at * 1000).toLocaleString() : '--')
        )
      ]) : null,
      weekly ? div(null, [
        h4({ class: 'settings-subtitle' }, 'Weekly window'),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Used'),
          weekly.used_percent !== null && weekly.used_percent !== undefined
            ? div({ class: 'limits-progress-row' }, [
                ProgressBar({
                  progress: Number(weekly.used_percent),
                  variant: 'success',
                  size: 'xl'
                }),
                span({ class: 'limits-progress-value settings-value' }, `${Math.round(weekly.used_percent)}%`)
              ])
            : span({ class: 'settings-value' }, '--')
        ),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Usage limit window (days)'),
          span({ class: 'settings-value' }, formatWindow(weekly.window_minutes, 'days'))
        ),
        div({ class: 'settings-row' },
          span({ class: 'settings-label' }, 'Reset at'),
          span({ class: 'settings-value' }, weekly.reset_at ? new Date(weekly.reset_at * 1000).toLocaleString() : '--')
        )
      ]) : null
    )
  );
}
