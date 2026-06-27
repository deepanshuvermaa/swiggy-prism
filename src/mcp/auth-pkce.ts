/**
 * OAuth 2.1 PKCE Authentication for Swiggy MCP.
 *
 * Flow (from Swiggy docs):
 * 1. Dynamic Client Registration at POST /auth/register (RFC 7591)
 * 2. Generate PKCE verifier + S256 challenge
 * 3. Redirect user to GET /auth/authorize (phone + OTP in browser)
 * 4. Exchange code at POST /auth/token
 * 5. Access token valid 5 days, no refresh tokens in v1
 * 6. On 401 → re-run full auth flow
 * 7. On 419 → session revoked, full re-auth
 *
 * Base URL: https://mcp.swiggy.com
 */

import crypto from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MCP_BASE = "https://mcp.swiggy.com";

export interface TokenState {
  accessToken: string;
  expiresAt: number; // epoch ms
  scope: string;
}

export interface ConnectedUser {
  phone?: string;
  name?: string;
  userId?: string;
  connectedAt: string; // ISO timestamp
  expiresAt: number;
  scope: string;
  ip?: string;
}

// All sessions that ever connected (in-memory, max 50)
const connectedSessions: ConnectedUser[] = [];
const MAX_SESSIONS = 50;

export function addConnectedSession(session: ConnectedUser): void {
  connectedSessions.push(session);
  if (connectedSessions.length > MAX_SESSIONS) connectedSessions.shift();
}

export function getConnectedSessions(): ConnectedUser[] {
  return [...connectedSessions].reverse(); // newest first
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Step 1: Dynamic Client Registration (RFC 7591).
 * MCP-compatible clients call this transparently.
 * Returns client_id for use in authorization flow.
 */
export async function registerClient(
  redirectUri: string,
  clientName = "Swiggy Prism"
): Promise<{ clientId: string }> {
  const res = await fetch(`${MCP_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none", // public client with PKCE
    }),
  });

  if (!res.ok) {
    throw new Error(`Client registration failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { clientId: data.client_id };
}

/**
 * Step 2: Build the authorization URL.
 * The user must be redirected to this URL in a browser
 * to complete phone + OTP authentication.
 */
export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
  scope = "mcp:tools mcp:resources mcp:prompts"
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    scope,
  });
  return `${MCP_BASE}/auth/authorize?${params.toString()}`;
}

/**
 * Step 3: Exchange authorization code for access token.
 * Called after the user completes phone + OTP and is redirected back.
 */
export async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenState> {
  const res = await fetch(`${MCP_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000, // 60s safety buffer
    scope: data.scope ?? "mcp:tools",
  };
}

/**
 * Fetch user profile from MCP after successful auth.
 * Falls back gracefully if the endpoint is unavailable.
 */
export async function fetchUserProfile(accessToken: string): Promise<{ phone?: string; name?: string; userId?: string }> {
  try {
    // Try MCP userinfo endpoint
    const res = await fetch(`${MCP_BASE}/auth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        phone: data.phone || data.mobile || data.phone_number,
        name: data.name || data.display_name,
        userId: data.user_id || data.sub || data.id,
      };
    }
  } catch {
    // userinfo endpoint may not exist — that's fine
  }

  // Try calling an MCP tool that might return user context
  try {
    const res = await fetch(`${MCP_BASE}/food/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "profile-check",
        method: "tools/call",
        params: { name: "get_user_profile", arguments: {} },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data?.result?.content?.[0]?.text;
      if (content) {
        try {
          const profile = JSON.parse(content);
          return {
            phone: profile.phone || profile.mobile,
            name: profile.name || profile.display_name,
            userId: profile.user_id || profile.id,
          };
        } catch { /* not JSON */ }
      }
    }
  } catch {
    // tool may not exist — that's fine
  }

  return {};
}

/**
 * Logout / revoke session.
 */
export async function logout(accessToken: string): Promise<void> {
  await fetch(`${MCP_BASE}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Token manager — handles expiry checks and re-auth signaling.
 */
const TOKEN_FILE = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", ".token.json");

export class PKCEAuthManager {
  private token: TokenState | null = null;

  constructor() {
    // Load persisted token on startup
    try {
      if (existsSync(TOKEN_FILE)) {
        const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
        if (data.expiresAt && Date.now() < data.expiresAt) {
          this.token = data;
          console.log("[Auth] Loaded persisted token — expires in " + Math.round((data.expiresAt - Date.now()) / 3600000) + "h");
          // Record session for admin dashboard
          addConnectedSession({
            connectedAt: new Date(data.expiresAt - 432000000).toISOString(), // approx original connect time
            expiresAt: data.expiresAt,
            scope: data.scope || "mcp:tools",
            ip: "persisted",
          });
        } else {
          console.log("[Auth] Persisted token expired — need re-auth");
        }
      }
    } catch { /* no persisted token */ }
  }

  setToken(token: TokenState): void {
    this.token = token;
    // Persist to disk so it survives server restarts
    try {
      writeFileSync(TOKEN_FILE, JSON.stringify(token), "utf-8");
      console.log("[Auth] Token persisted to disk");
    } catch (err) {
      console.warn("[Auth] Failed to persist token:", err);
    }
  }

  getAccessToken(): string {
    if (!this.token) throw new Error("Not authenticated. Run OAuth PKCE flow first.");
    if (Date.now() >= this.token.expiresAt) {
      throw new Error("Token expired. Re-run OAuth PKCE flow (no refresh tokens in v1).");
    }
    return this.token.accessToken;
  }

  isAuthenticated(): boolean {
    return this.token !== null && Date.now() < this.token.expiresAt;
  }

  /**
   * Wrap an async function with automatic 401 detection.
   * On 401, throws a typed error so the caller can trigger re-auth.
   */
  async callWithReauth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.status === 401 || err?.message?.includes("401")) {
        this.token = null;
        throw new Error("AUTH_REQUIRED: Token expired or revoked. Re-authenticate.");
      }
      if (err?.status === 419 || err?.message?.includes("419")) {
        this.token = null;
        throw new Error("SESSION_REVOKED: Full re-authentication required.");
      }
      throw err;
    }
  }
}
