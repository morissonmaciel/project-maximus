/**
 * OpenAI Codex OAuth flow
 */

import crypto from 'node:crypto';
import { generatePKCE } from "./pkce.js";

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const REDIRECT_URI = "http://localhost:1455/auth/callback";
const SCOPE = "openid profile email offline_access";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";

function createState() {
  return crypto.randomBytes(16).toString("hex");
}

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1] ?? "";
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getAccountId(accessToken) {
  const payload = decodeJwt(accessToken);
  const auth = payload?.[JWT_CLAIM_PATH];
  const accountId = auth?.chatgpt_account_id;
  return typeof accountId === "string" && accountId.length > 0 ? accountId : null;
}

/**
 * Generate authorization URL for OAuth flow
 */
export async function getAuthorizationUrl() {
  const { verifier, challenge } = await generatePKCE();
  const state = createState();

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", "pi");

  return {
    url: url.toString(),
    verifier,
    state // Returning state so the gateway can verify it if needed, though mostly for client side
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code, state, verifier) {
  // Check if the code is actually a full URL or contains state (though gateway passes them separately usually)
  // But let's handle the pure code case primarily as per anthropic implementation.
  
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    code_verifier: verifier,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const json = await response.json();

  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new Error("Token response missing fields");
  }

  const accountId = getAccountId(json.access_token);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000 - 5 * 60 * 1000, // 5 min buffer
    accountId
  };
}

/**
 * Refresh OAuth token
 */
export async function refreshToken(refreshTokenValue) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token refresh failed: ${response.status} ${text}`);
  }

  const json = await response.json();

  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new Error("Token refresh response missing fields");
  }

  const accountId = getAccountId(json.access_token);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000 - 5 * 60 * 1000,
    accountId
  };
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(expiresAt) {
  return Date.now() >= expiresAt;
}
