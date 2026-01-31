import fs from 'fs';
import { SETTINGS_DIR, SETTINGS_PATH } from './constants.js';

export function saveConfig(state) {
  try {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({
      provider: state.provider,
      lastSessionId: state.lastSessionId,
      system: state.systemConfig,
      anthropic: {
        credentials: state.anthropicCredentials
      },
      openaiCodex: {
        credentials: state.openaiCodexCredentials
      },
      kimi: {
        credentials: state.kimiCredentials
      },
      nvidia: {
        credentials: state.nvidiaCredentials
      },
      ollama: {
        host: state.ollamaConfig.host,
        model: state.ollamaConfig.model
      }
    }, null, 2));
    console.log('[Gateway] Settings saved');
  } catch (err) {
    console.error('[Gateway] Failed to save config:', err.message);
  }
}

export function loadConfigFromFile() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const rawConfig = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
            return rawConfig;
        }
    } catch (err) {
        console.error('[Gateway] Failed to load config file:', err.message);
    }
    return {};
}
