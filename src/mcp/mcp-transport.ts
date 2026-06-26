/**
 * MCP Streamable HTTP transport layer.
 *
 * All 3 Swiggy MCP servers use the same protocol:
 * - POST to server endpoint with JSON-RPC 2.0 payload
 * - Bearer token authentication
 * - Standard response: { success, data, message } or { success: false, error: { message } }
 *
 * Implements Swiggy's documented error handling:
 * - 401: re-auth (thrown as AUTH_REQUIRED)
 * - 400: bad input, no retry
 * - 502/503/504: exponential backoff, max 5 retries
 * - 500: single retry then escalate
 * - 200 + success:false: domain error, surface to user
 *
 * Non-idempotent operations (place_food_order, checkout, book_table)
 * must NOT be blind-retried. Caller checks order status first.
 */

import { PKCEAuthManager } from "./auth-pkce.js";
import { log } from "../logger.js";

const MAX_RETRIES = 5;
const RETRY_BASE_MS = 500;

export interface MCPToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string };
}

export class MCPTransport {
  private endpoint: string;
  private auth: PKCEAuthManager;
  private timeout: number;

  constructor(endpoint: string, auth: PKCEAuthManager, timeout = 10_000) {
    this.endpoint = endpoint;
    this.auth = auth;
    this.timeout = timeout;
  }

  /**
   * Call an MCP tool with automatic retry on transient errors.
   * Does NOT retry non-idempotent operations — caller must handle those.
   */
  async callTool<T = unknown>(
    params: MCPToolCallParams,
    options: { retryable?: boolean } = { retryable: true }
  ): Promise<MCPToolResponse<T>> {
    const token = this.auth.getAccessToken();

    let lastError: Error | null = null;
    const maxAttempts = options.retryable ? MAX_RETRIES : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * delay * 0.5;
        await new Promise(r => setTimeout(r, delay + jitter));
      }

      const callStart = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const res = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: params.name,
              arguments: params.arguments,
            },
            id: Date.now(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Auth failures — don't retry, signal re-auth
        if (res.status === 401) {
          throw Object.assign(new Error("AUTH_REQUIRED"), { status: 401 });
        }
        if (res.status === 419) {
          throw Object.assign(new Error("SESSION_REVOKED"), { status: 419 });
        }

        // Bad input — don't retry
        if (res.status === 400) {
          const body = await res.json().catch(() => ({ error: { message: "Bad request" } }));
          throw new Error(`VALIDATION_ERROR: ${body?.error?.message ?? res.statusText}`);
        }

        // Transient errors — retry
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          lastError = new Error(`UPSTREAM_ERROR: ${res.status} ${res.statusText}`);
          continue;
        }

        // Internal error — single retry
        if (res.status === 500) {
          if (attempt === 0) {
            lastError = new Error(`INTERNAL_ERROR: ${res.status}`);
            continue;
          }
          throw new Error(`INTERNAL_ERROR: ${res.status} after retry`);
        }

        // Rate limited (v1.1+) — honour Retry-After header
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("Retry-After") ?? 30);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          lastError = new Error("RATE_LIMITED: Too many requests");
          continue;
        }

        // Parse successful response
        const body = await res.json();

        // Log for support correlation + admin dashboard
        const sessionId = res.headers.get("x-session-id") ?? body?.result?._meta?.sessionId ?? "";
        log({
          level: "info",
          event: "mcp_tool_call",
          tool: params.name,
          sessionId: sessionId || undefined,
          durationMs: Date.now() - callStart,
          status: "ok",
          details: `${this.endpoint} → ${res.status}`,
        });

        // Deprecation monitoring (ships v1.1)
        const deprecation = body?.result?._meta?.swiggy?.deprecation;
        if (deprecation) {
          log({
            level: "warn",
            event: "deprecation_warning",
            tool: params.name,
            status: "ok",
            details: JSON.stringify(deprecation),
          });
        }

        // JSON-RPC error
        if (body.error) {
          const code = body.error.code;
          // Auth errors via JSON-RPC
          if (code === -32001) {
            throw Object.assign(new Error("AUTH_REQUIRED"), { status: 401 });
          }
          // Internal JSON-RPC error
          if (code === -32603) {
            lastError = new Error(`JSONRPC_ERROR: ${body.error.message}`);
            if (attempt === 0) continue;
            throw lastError;
          }
          throw new Error(`MCP_ERROR: ${body.error.message ?? JSON.stringify(body.error)}`);
        }

        // Extract result from JSON-RPC envelope
        const result = body.result ?? body;

        // Domain failure (200 + success:false) — terminal, don't retry
        if (result.success === false) {
          throw new Error(`DOMAIN_ERROR: ${result.error?.message ?? result.message ?? "Unknown error"}`);
        }

        return result as MCPToolResponse<T>;
      } catch (err: any) {
        clearTimeout(timer);

        // Abort = timeout
        if (err.name === "AbortError") {
          lastError = new Error("UPSTREAM_TIMEOUT: Request timed out");
          continue;
        }

        // Auth errors bubble up immediately
        if (err.message?.startsWith("AUTH_REQUIRED") || err.message?.startsWith("SESSION_REVOKED")) {
          throw err;
        }

        // Validation / domain errors don't retry
        if (err.message?.startsWith("VALIDATION_ERROR") || err.message?.startsWith("DOMAIN_ERROR")) {
          throw err;
        }

        lastError = err;
      }
    }

    throw lastError ?? new Error("MCP call failed after retries");
  }
}
