// Gateway configuration
export const GATEWAY_URL = window.__GATEWAY_URL__ || 'ws://localhost:8081';
export const GATEWAY_CONFIG = window.__GATEWAY_CONFIG__ || {
  WEB_PORT: 8080,
  GATEWAY_PORT: 8081,
  DEFAULT_PROVIDER: null
};
