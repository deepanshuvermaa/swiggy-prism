#!/usr/bin/env node

import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
let globalCodeVerifier = "";
import { parseRecipe } from "./core/parser.js";
import { optimizeCart } from "./core/optimizer.js";
import { localParseRecipe } from "./core/local-parser.js";
import { sanitizePrompt } from "./utils/sanitize.js";
import { createProvider, createFoodProvider, createDineoutProvider, getAuthManager } from "./mcp/adapter.js";
import { parseIntent } from "./core/intent-parser.js";
import { decide } from "./core/decision-engine.js";
import type { Ingredient, SKU, Persona } from "./types/index.js";
import { log, getLogs, getStats } from "./logger.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const UI_DIR = join(__dirname, "..", "ui");
const PORT = parseInt(process.env.PORT ?? "3000", 10);

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// OAuth redirect URIs — localhost for dev, GitHub Pages for production
const REDIRECT_URIS = [
  `http://localhost:${PORT}/auth/callback`,
  "https://deepanshuvermaa.github.io/swiggy-prism/auth/callback",
];

function getRedirectUri(req: any): string {
  const host = req.headers.host ?? "";
  if (host.includes("github.io") || host.includes("deepanshuverma")) {
    return REDIRECT_URIS[1];
  }
  return REDIRECT_URIS[0];
}

const mcpClient = createProvider();
const foodProvider = createFoodProvider();
const dineoutProvider = createDineoutProvider();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // API routes
  if (url.pathname === "/api/parse" && req.method === "POST") {
    return handleParse(req, res);
  }
  if (url.pathname === "/api/optimize" && req.method === "POST") {
    return handleOptimize(req, res);
  }
  if (url.pathname === "/api/decide" && req.method === "POST") {
    return handleDecide(req, res);
  }
  if (url.pathname === "/api/health") {
    const isLive = process.env.MCP_MODE === "live";
    return json(res, {
      status: "ok",
      hasLLM: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY,
      mcpMode: isLive ? "live" : "mock",
      authenticated: isLive ? getAuthManager().isAuthenticated() : true,
    });
  }

  if (url.pathname === "/auth/callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Missing authorization code</h1>");
      return;
    }
    try {
      const { exchangeCode } = await import("./mcp/auth-pkce.js");
      const redirectUri = getRedirectUri(req);
      const token = await exchangeCode(code, globalCodeVerifier, redirectUri);
      getAuthManager().setToken(token);
      log({ level: "info", event: "auth_success", status: "auth", details: `Token expires in ${Math.round((token.expiresAt - Date.now()) / 3600000)}h` });
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prism — Connected</title><style>*{margin:0;font-family:Inter,-apple-system,sans-serif}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FFF3E8}.card{background:white;border-radius:20px;padding:40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.1);max-width:360px}.icon{font-size:48px;margin-bottom:12px}.title{font-size:22px;font-weight:700;color:#333;margin-bottom:8px}.sub{font-size:14px;color:#666;line-height:1.5}.badge{display:inline-block;margin-top:16px;padding:8px 20px;background:#FC8019;color:white;border-radius:10px;font-weight:600;font-size:14px}</style></head><body><div class="card"><div class="icon">&#x2705;</div><div class="title">Connected to Swiggy</div><div class="sub">Prism is now linked to your Swiggy account.<br>All 35 MCP tools are active.</div><div class="badge">Food &middot; Instamart &middot; Dineout</div></div></body></html>`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log({ level: "error", event: "auth_failed", status: "error", details: msg });
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h1>Authentication failed</h1><p>${msg}</p>`);
    }
    return;
  }

  if (url.pathname === "/auth/start") {
    try {
      const { generateCodeVerifier, generateCodeChallenge, registerClient, buildAuthorizationUrl } = await import("./mcp/auth-pkce.js");
      const redirectUri = getRedirectUri(req);

      log({ level: "info", event: "auth_start", status: "auth", details: `redirect_uri=${redirectUri}` });

      const { clientId } = await registerClient(redirectUri, "Swiggy Prism");
      globalCodeVerifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(globalCodeVerifier);
      const state = crypto.randomBytes(16).toString("hex");

      const authUrl = buildAuthorizationUrl(clientId, redirectUri, challenge, state);
      res.writeHead(302, { Location: authUrl });
      res.end();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log({ level: "error", event: "auth_start_failed", status: "error", details: msg });
      json(res, { success: false, error: msg }, 500);
    }
    return;
  }

  // ─── Admin & Logs API ─────────────────────────────────────────────────
  if (url.pathname === "/api/logs") {
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const level = url.searchParams.get("level") ?? undefined;
    return json(res, { logs: getLogs(limit, { level }), stats: getStats() });
  }

  if (url.pathname === "/admin") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(ADMIN_HTML);
    return;
  }

  // static file serving for UI
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  try {
    const fullPath = join(UI_DIR, filePath);
    const content = await readFile(fullPath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "text/plain" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

async function handleParse(req: any, res: any) {
  const body = await readBody(req);
  const { prompt, servings } = JSON.parse(body);
  const clean = sanitizePrompt(prompt);

  try {
    let ingredients: Ingredient[];

    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      // use real LLM
      ingredients = await parseRecipe(clean, servings);
    } else {
      // fallback to local keyword parser for demo
      ingredients = localParseRecipe(clean, servings);
    }

    json(res, { success: true, ingredients, usedLLM: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    json(res, { success: false, error: msg }, 500);
  }
}

async function handleOptimize(req: any, res: any) {
  const body = await readBody(req);
  const { ingredients, budget } = JSON.parse(body) as { ingredients: Ingredient[]; budget: number };

  try {
    // search mock MCP for each ingredient
    const skuEntries = await Promise.all(
      ingredients.map(async (ing) => {
        const skus = await mcpClient.searchSKUs(ing.name);
        return [ing.name, skus] as [string, SKU[]];
      })
    );

    const skuMap = new Map(skuEntries);
    const cart = optimizeCart(ingredients, skuMap, budget);

    // add to cart
    if (cart.items.length > 0) {
      await mcpClient.addToCart(
        cart.items.map((item) => ({ skuId: item.sku.skuId, quantity: item.count }))
      );
    }

    json(res, { success: true, cart });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    json(res, { success: false, error: msg }, 500);
  }
}

async function handleDecide(req: any, res: any) {
  const body = await readBody(req);
  const { text, persona = "balanced" } = JSON.parse(body) as { text: string; persona?: Persona };
  const clean = sanitizePrompt(text);
  const start = Date.now();

  try {
    const intent = parseIntent(clean);
    const result = await decide(intent, persona, mcpClient, foodProvider, dineoutProvider);
    log({
      level: "info", event: "decision_complete", status: "ok",
      durationMs: Date.now() - start,
      details: `"${intent.dishName}" → ${result.options.length} options, best=${result.bestOption}`,
    });
    json(res, { success: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log({ level: "error", event: "decision_failed", status: "error", details: msg });
    json(res, { success: false, error: msg }, 500);
  }
}

function json(res: any, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ─── Admin Dashboard HTML ────────────────────────────────────────────────────
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prism Admin — Production Logs</title>
<style>
*{margin:0;box-sizing:border-box}
body{font-family:Inter,-apple-system,sans-serif;background:#f5f5f5;color:#333}
.header{background:linear-gradient(135deg,#FC8019,#FF6B35);color:white;padding:20px 24px}
.header h1{font-size:20px;font-weight:700}.header p{font-size:12px;opacity:0.8;margin-top:4px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px 24px}
.stat-card{background:white;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
.stat-value{font-size:28px;font-weight:800;color:#FC8019}.stat-label{font-size:11px;color:#666;margin-top:4px}
.controls{padding:8px 24px;display:flex;gap:8px;flex-wrap:wrap}
.ctrl-btn{padding:6px 14px;border:1px solid #ddd;border-radius:8px;background:white;font-size:12px;cursor:pointer;font-family:inherit}
.ctrl-btn:hover{border-color:#FC8019;color:#FC8019}.ctrl-btn.active{background:#FC8019;color:white;border-color:#FC8019}
.logs{padding:0 24px 24px;margin-top:8px}
.log-entry{background:white;border-radius:10px;padding:12px 16px;margin-bottom:6px;font-size:12px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.log-time{color:#999;white-space:nowrap;flex-shrink:0;font-family:monospace;font-size:11px}
.log-badge{padding:2px 8px;border-radius:6px;font-weight:600;font-size:10px;flex-shrink:0;text-transform:uppercase}
.log-badge.info{background:#E8F5EE;color:#39A06F}.log-badge.warn{background:#FFF3E8;color:#FC8019}.log-badge.error{background:#FDEAEC;color:#E04F5F}
.log-body{flex:1;line-height:1.4}.log-event{font-weight:600;color:#333}.log-detail{color:#666;margin-top:2px}
.log-tool{background:#f0f0f0;padding:1px 6px;border-radius:4px;font-family:monospace;font-size:11px}
.log-sid{color:#999;font-family:monospace;font-size:10px}
.empty{text-align:center;padding:40px;color:#999}
.auth-section{padding:16px 24px}
.auth-btn{display:inline-block;padding:10px 24px;background:#FC8019;color:white;border-radius:10px;font-weight:600;text-decoration:none;font-size:14px}
.auth-btn:hover{background:#E5710F}
.auth-status{display:inline-block;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-left:12px}
.auth-status.ok{background:#E8F5EE;color:#39A06F}.auth-status.no{background:#FDEAEC;color:#E04F5F}
.export-btn{padding:8px 16px;background:#333;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit}
</style>
</head><body>
<div class="header">
  <h1>Swiggy Prism — Production Dashboard</h1>
  <p>Activity logs for Swiggy Builders Club submission</p>
</div>
<div class="auth-section">
  <a href="/auth/start" class="auth-btn">Connect Swiggy Account</a>
  <span id="auth-status" class="auth-status no">Not Connected</span>
</div>
<div class="stats" id="stats"></div>
<div class="controls">
  <button class="ctrl-btn active" onclick="filterLogs('all')">All</button>
  <button class="ctrl-btn" onclick="filterLogs('info')">Info</button>
  <button class="ctrl-btn" onclick="filterLogs('warn')">Warnings</button>
  <button class="ctrl-btn" onclick="filterLogs('error')">Errors</button>
  <button class="export-btn" onclick="exportLogs()">Export as JSON</button>
</div>
<div class="logs" id="logs"></div>
<script>
var currentFilter = 'all';
function loadLogs() {
  var url = '/api/logs?limit=200' + (currentFilter !== 'all' ? '&level=' + currentFilter : '');
  fetch(url).then(r=>r.json()).then(function(data) {
    // Auth status
    fetch('/api/health').then(r=>r.json()).then(function(h) {
      var el = document.getElementById('auth-status');
      if (h.authenticated) { el.textContent = 'Connected'; el.className = 'auth-status ok'; }
      else { el.textContent = 'Not Connected'; el.className = 'auth-status no'; }
    });
    // Stats
    var s = data.stats;
    document.getElementById('stats').innerHTML =
      '<div class="stat-card"><div class="stat-value">' + s.total + '</div><div class="stat-label">Total Events</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + s.toolCalls + '</div><div class="stat-label">Tool Calls</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + s.errors + '</div><div class="stat-label">Errors</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + s.avgLatencyMs + 'ms</div><div class="stat-label">Avg Latency</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + s.errorRate + '</div><div class="stat-label">Error Rate</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + s.authEvents + '</div><div class="stat-label">Auth Events</div></div>';
    // Logs
    var logs = data.logs;
    if (logs.length === 0) { document.getElementById('logs').innerHTML = '<div class="empty">No logs yet. Make some requests!</div>'; return; }
    var html = '';
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var time = new Date(l.ts).toLocaleTimeString();
      html += '<div class="log-entry">';
      html += '<span class="log-time">' + time + '</span>';
      html += '<span class="log-badge ' + l.level + '">' + l.level + '</span>';
      html += '<div class="log-body"><div class="log-event">' + l.event;
      if (l.tool) html += ' <span class="log-tool">' + l.tool + '</span>';
      if (l.durationMs) html += ' <span style="color:#999">' + l.durationMs + 'ms</span>';
      html += '</div>';
      if (l.details) html += '<div class="log-detail">' + l.details + '</div>';
      if (l.sessionId) html += '<div class="log-sid">session: ' + l.sessionId + '</div>';
      html += '</div></div>';
    }
    document.getElementById('logs').innerHTML = html;
  });
}
function filterLogs(level) {
  currentFilter = level;
  document.querySelectorAll('.ctrl-btn').forEach(function(b){b.classList.remove('active')});
  event.target.classList.add('active');
  loadLogs();
}
function exportLogs() {
  fetch('/api/logs?limit=500').then(r=>r.json()).then(function(data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prism-logs-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  });
}
loadLogs();
setInterval(loadLogs, 5000);
</script>
</body></html>`;

server.listen(PORT, () => {
  const llmStatus = process.env.GEMINI_API_KEY ? "Gemini" : process.env.OPENAI_API_KEY ? "OpenAI" : "local fallback (no API key)";
  const mcpStatus = process.env.MCP_MODE === "live" ? "LIVE (mcp.swiggy.com)" : "mock (embedded catalog)";
  console.log(`\n  Swiggy Prism server running at http://localhost:${PORT}`);
  console.log(`  LLM: ${llmStatus}`);
  console.log(`  MCP: ${mcpStatus}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  Auth:  http://localhost:${PORT}/auth/start\n`);
  log({ level: "info", event: "server_start", status: "ok", details: `MCP=${mcpStatus} LLM=${llmStatus}` });
});
