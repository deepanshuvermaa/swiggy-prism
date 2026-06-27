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
import { fetchUserProfile, addConnectedSession, getConnectedSessions } from "./mcp/auth-pkce.js";
import { parseIntent } from "./core/intent-parser.js";
import { decide } from "./core/decision-engine.js";
import type { Ingredient, SKU, Persona } from "./types/index.js";
import { log, getLogs, getStats } from "./logger.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// UI lives in docs/ (GitHub Pages) — resolve relative to project root
const UI_DIR = join(__dirname, "..", "docs");
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

// OAuth redirect URIs — localhost for dev, Railway for production, GitHub Pages for static
const REDIRECT_URIS = [
  `http://localhost:${PORT}/auth/callback`,
  "https://swiggy-prism-production.up.railway.app/auth/callback",
  "https://deepanshuvermaa.github.io/swiggy-prism/auth/callback",
];

function getRedirectUri(req: any): string {
  const host = req.headers.host ?? "";
  if (host.includes("railway.app")) {
    return REDIRECT_URIS[1];
  }
  if (host.includes("github.io") || host.includes("deepanshuverma")) {
    return REDIRECT_URIS[2];
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
  if (url.pathname === "/api/order-history") {
    return handleOrderHistory(req, res);
  }
  if (url.pathname === "/api/go-to-items") {
    return handleGoToItems(req, res);
  }
  if (url.pathname === "/api/check-prices" && req.method === "GET") {
    return handleCheckPrices(req, res, url);
  }
  if (url.pathname === "/api/meal-plan" && req.method === "POST") {
    return handleMealPlan(req, res);
  }
  if (url.pathname === "/api/group-order" && req.method === "POST") {
    return handleGroupOrder(req, res);
  }
  if (url.pathname === "/api/parse-video") {
    return handleParseVideo(req, res, url);
  }
  if (url.pathname === "/api/health") {
    const isLive = process.env.MCP_MODE === "live";
    return json(res, {
      status: "ok",
      hasLLM: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY || !!process.env.GROQ_API_KEY,
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

      // Fetch user profile and track session
      const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
      const profile = await fetchUserProfile(token.accessToken);
      const userLabel = profile.phone || profile.name || profile.userId || clientIp;
      addConnectedSession({
        phone: profile.phone,
        name: profile.name,
        userId: profile.userId,
        connectedAt: new Date().toISOString(),
        expiresAt: token.expiresAt,
        scope: token.scope,
        ip: clientIp,
      });

      log({ level: "info", event: "auth_success", status: "auth", userId: userLabel, details: `User: ${userLabel} — Token expires in ${Math.round((token.expiresAt - Date.now()) / 3600000)}h` });
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prism — Connected</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;font-family:Inter,-apple-system,sans-serif}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FFF3E8}.card{background:white;border-radius:20px;padding:40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.1);max-width:380px}.icon{font-size:48px;margin-bottom:12px}.title{font-size:22px;font-weight:700;color:#333;margin-bottom:8px}.sub{font-size:14px;color:#666;line-height:1.5}.badge{display:inline-block;margin-top:16px;padding:8px 20px;background:#FC8019;color:white;border-radius:10px;font-weight:600;font-size:14px}.links{margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.link{padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;transition:all 0.2s}.link-primary{background:#FC8019;color:white}.link-primary:hover{background:#E5710F}.link-secondary{background:#f5f5f5;color:#333}.link-secondary:hover{background:#e8e8e8}.countdown{margin-top:12px;font-size:12px;color:#999}</style></head><body><div class="card"><div class="icon">&#x2705;</div><div class="title">Connected to Swiggy</div><div class="sub">Prism is now linked to your Swiggy account.<br>All 35 MCP tools are active.</div><div class="badge">Food &middot; Instamart &middot; Dineout</div><div class="links"><a href="/" class="link link-primary">Open Prism</a><a href="/admin" class="link link-secondary">Admin Dashboard</a></div><div class="countdown" id="cd">Redirecting to Prism in 5s...</div></div><script>localStorage.setItem('prism_onboarded','live');console.log('[Prism Auth] Connected — localStorage set to live');var needsPersona=!localStorage.getItem('prism_persona');var s=5;var el=document.getElementById('cd');if(needsPersona){el.textContent='Setting up your profile...';}var t=setInterval(function(){s--;if(s<=0){clearInterval(t);if(needsPersona){console.log('[Prism Auth] No persona — redirecting to persona screen');localStorage.setItem('prism_needs_persona','true');window.location.href='/';}else{console.log('[Prism Auth] Persona exists — redirecting to app');window.location.href='/';}}else{el.textContent=(needsPersona?'Setting up profile':'Redirecting to Prism')+' in '+s+'s...';}},1000);</script></body></html>`);
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
  if (url.pathname === "/api/sessions") {
    return json(res, { sessions: getConnectedSessions() });
  }

  if (url.pathname === "/api/logs") {
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const level = url.searchParams.get("level") ?? undefined;
    return json(res, { logs: getLogs(limit, { level }), stats: getStats(), sessions: getConnectedSessions() });
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

    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) {
      // use real LLM
      ingredients = await parseRecipe(clean, servings);
    } else {
      // fallback to local keyword parser for demo
      ingredients = localParseRecipe(clean, servings);
    }

    json(res, { success: true, ingredients, usedLLM: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) });
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

async function handleOrderHistory(_req: any, res: any) {
  try {
    const isLive = process.env.MCP_MODE === "live" && getAuthManager().isAuthenticated();
    if (!isLive) {
      return json(res, { success: true, food: [], instamart: [], totalSpent: 0 });
    }

    const [foodOrders, instamartOrders] = await Promise.allSettled([
      (foodProvider as any).getOrders?.() ?? [],
      (mcpClient as any).getOrders?.() ?? [],
    ]);

    const food = foodOrders.status === "fulfilled" ? foodOrders.value : [];
    const instamart = instamartOrders.status === "fulfilled" ? instamartOrders.value : [];

    // Log actual order structure for debugging
    if (food.length > 0) console.log('[OrderHistory] Food order sample:', JSON.stringify(food[0]).slice(0, 500));
    if (instamart.length > 0) console.log('[OrderHistory] Instamart order sample:', JSON.stringify(instamart[0]).slice(0, 500));

    // Calculate total spent — try many possible field names
    let totalSpent = 0;
    const extractAmount = (o: any): number => {
      if (typeof o === 'string') {
        // Parse amount from text like "Order total: ₹450"
        const m = o.match(/₹\s*([\d,]+)/);
        return m ? parseInt(m[1].replace(/,/g, '')) : 0;
      }
      return o?.total ?? o?.amount ?? o?.orderTotal ?? o?.billAmount ?? o?.bill?.total
        ?? o?.orderValue ?? o?.cost ?? o?.price ?? o?.grandTotal ?? o?.billing?.total ?? 0;
    };
    for (const o of food) totalSpent += extractAmount(o);
    for (const o of instamart) totalSpent += extractAmount(o);

    json(res, { success: true, food, instamart, totalSpent, orderCount: food.length + instamart.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    json(res, { success: false, error: msg }, 500);
  }
}

async function handleParseVideo(_req: any, res: any, url: URL) {
  try {
    const videoUrl = url.searchParams.get("url") ?? "";
    if (!videoUrl) return json(res, { success: false, error: "URL required" }, 400);

    // Fetch YouTube page to get title and description
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const pageRes = await fetch(videoUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      const html = await pageRes.text();
      clearTimeout(timer);

      // Extract title from <title> tag
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : '';

      // Extract description from meta
      const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const desc = descMatch ? descMatch[1] : '';

      const combined = title + '. ' + desc;

      // Use LLM to extract dish name from video title/description
      if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
        const { parseRecipe } = await import("./core/parser.js");
        const ingredients = await parseRecipe(combined, 4);
        // Derive dish name from title
        const dishName = title.replace(/\|.*$/, '').replace(/recipe/i, '').replace(/how to make/i, '').trim().toLowerCase();
        return json(res, { success: true, recipe: dishName || 'recipe from video', ingredients, title });
      }

      // Fallback: just return the title as dish name
      const simpleDish = title.replace(/\|.*$/, '').replace(/recipe/i, '').replace(/how to make/i, '').trim().toLowerCase();
      return json(res, { success: true, recipe: simpleDish || 'butter chicken', title });
    } catch {
      clearTimeout(timer);
      return json(res, { success: false, error: "Could not fetch video page" }, 500);
    }
  } catch (err) {
    json(res, { success: false, error: String(err) }, 500);
  }
}

async function handleGoToItems(_req: any, res: any) {
  try {
    const isLive = process.env.MCP_MODE === "live" && getAuthManager().isAuthenticated();
    if (!isLive) return json(res, { success: true, items: [] });
    const items = await (mcpClient as any).getGoToItems?.() ?? [];
    json(res, { success: true, items });
  } catch (err) {
    json(res, { success: false, error: String(err) }, 500);
  }
}

async function handleCheckPrices(_req: any, res: any, url: URL) {
  try {
    const items = (url.searchParams.get("items") ?? "").split(",").filter(Boolean).slice(0, 5);
    if (items.length === 0) return json(res, { success: true, prices: [] });

    const isLive = process.env.MCP_MODE === "live" && getAuthManager().isAuthenticated();
    const prices = [];
    for (const item of items) {
      try {
        if (isLive) {
          const restaurants = await foodProvider.searchRestaurants("", item);
          const cheapest = restaurants.sort((a: any, b: any) => (a.deliveryFee || 300) - (b.deliveryFee || 300))[0];
          prices.push({ dish: item, price: cheapest ? Math.round((cheapest.deliveryFee || 200) * 2) : 0, restaurant: cheapest?.name ?? '' });
        } else {
          prices.push({ dish: item, price: Math.round(200 + Math.random() * 400), restaurant: 'Mock Restaurant' });
        }
      } catch { prices.push({ dish: item, price: 0, restaurant: '' }); }
    }
    json(res, { success: true, prices });
  } catch (err) {
    json(res, { success: false, error: String(err) }, 500);
  }
}

async function handleMealPlan(req: any, res: any) {
  try {
    const body = await readBody(req);
    const { persona = "balanced", weeklyBudget = 3500, servings = 2 } = JSON.parse(body);

    const BREAKFAST = ["🥞 Dosa","🍳 Omelette","🫓 Paratha","🥣 Poha","🍞 Sandwich","🥣 Upma","🧇 Idli"];
    const LUNCH = ["🫘 Dal Tadka","🫘 Rajma Chawal","🍚 Biryani","🍛 Thali","🍚 Fried Rice","🥬 Palak Paneer","🫛 Chole"];
    const DINNER = ["🍗 Butter Chicken","🧀 Paneer Tikka","🍝 Pasta","🍜 Noodles","🫛 Chole Bhature","🥚 Egg Curry","🥔 Aloo Gobi"];

    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const bBudget = Math.round(weeklyBudget * 0.2 / 7);
    const lBudget = Math.round(weeklyBudget * 0.35 / 7);
    const dBudget = Math.round(weeklyBudget * 0.45 / 7);
    const plan = [];

    for (let d = 0; d < 7; d++) {
      const bCh = "instamart";
      const lCh = d % 3 === 0 ? "food" : "instamart";
      const dCh = d === 5 ? "dineout" : d % 2 === 0 ? "food" : "instamart";
      plan.push(
        { day: days[d], meal: "breakfast", dish: BREAKFAST[d % BREAKFAST.length], channel: bCh, cost: Math.round(bBudget * (0.7 + Math.random() * 0.6)) },
        { day: days[d], meal: "lunch", dish: LUNCH[d % LUNCH.length], channel: lCh, cost: Math.round(lBudget * (0.7 + Math.random() * 0.6)) },
        { day: days[d], meal: "dinner", dish: DINNER[d % DINNER.length], channel: dCh, cost: Math.round(dBudget * (0.7 + Math.random() * 0.6)) },
      );
    }

    const totalCost = plan.reduce((s, p) => s + p.cost, 0);
    const cookCount = plan.filter(p => p.channel === "instamart").length;
    const orderCount = plan.filter(p => p.channel === "food").length;
    const dineCount = plan.filter(p => p.channel === "dineout").length;
    const channelSplit = { cook: cookCount, order: orderCount, dine: dineCount };

    json(res, { success: true, plan, totalCost, weeklyBudget, channelSplit });
  } catch (err) {
    json(res, { success: false, error: String(err) }, 500);
  }
}

async function handleGroupOrder(req: any, res: any) {
  try {
    const body = await readBody(req);
    const { servings = 8, budget = 3000, persona = "balanced" } = JSON.parse(body);

    const appetBudget = Math.round(budget * 0.3);
    const mainBudget = Math.round(budget * 0.5);
    const dessertBudget = Math.round(budget * 0.2);

    // Generate appetizer suggestions (cook at home)
    const appetizers = [
      { name: "Paneer Tikka", channel: "instamart", cost: Math.round(appetBudget * 0.5), servings, type: "appetizer" },
      { name: "Aloo Tikki", channel: "instamart", cost: Math.round(appetBudget * 0.3), servings, type: "appetizer" },
      { name: "Masala Papad", channel: "instamart", cost: Math.round(appetBudget * 0.2), servings, type: "appetizer" },
    ];

    // Generate main course suggestions (order delivery)
    const mains = [
      { name: "Butter Chicken + Naan", channel: "food", cost: Math.round(mainBudget * 0.6), servings, type: "main" },
      { name: "Veg Biryani", channel: "food", cost: Math.round(mainBudget * 0.4), servings, type: "main" },
    ];

    // Desserts
    const desserts = [
      { name: "Gulab Jamun", channel: "food", cost: Math.round(dessertBudget * 0.5), servings, type: "dessert" },
      { name: "Ice Cream", channel: "instamart", cost: Math.round(dessertBudget * 0.5), servings, type: "dessert" },
    ];

    const allItems = [...appetizers, ...mains, ...desserts];
    const totalCost = allItems.reduce((s, i) => s + i.cost, 0);
    const perPerson = Math.round(totalCost / servings);
    const overBudget = totalCost > budget;
    const foodCartTotal = allItems.filter(i => i.channel === "food").reduce((s, i) => s + i.cost, 0);

    json(res, {
      success: true,
      items: allItems,
      totalCost,
      perPerson,
      budget,
      servings,
      overBudget,
      foodCartWarning: foodCartTotal > 1000 ? "Food cart exceeds ₹1000 limit — may need to split orders" : null,
      split: { appetizers: appetBudget, mains: mainBudget, desserts: dessertBudget },
    });
  } catch (err) {
    json(res, { success: false, error: String(err) }, 500);
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
<title>Swiggy Prism — Admin Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{font-family:Inter,-apple-system,sans-serif;background:#FAFAFA;color:#1a1a2e;min-height:100vh}

/* Header */
.header{background:linear-gradient(135deg,#FC8019 0%,#FF6B35 50%,#E5710F 100%);color:white;padding:28px 32px 20px;position:relative;overflow:hidden}
.header::after{content:'';position:absolute;top:-40%;right:-10%;width:300px;height:300px;background:rgba(255,255,255,0.06);border-radius:50%}
.header-row{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.header h1{font-size:24px;font-weight:800;letter-spacing:-0.3px}
.header-sub{font-size:13px;opacity:0.85;margin-top:4px;font-weight:400}
.header-badge{background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;backdrop-filter:blur(4px)}
.header-servers{display:flex;gap:8px;margin-top:14px;position:relative;z-index:1}
.server-chip{background:rgba(255,255,255,0.15);padding:5px 12px;border-radius:8px;font-size:11px;font-weight:600;backdrop-filter:blur(4px)}

/* Auth Section */
.auth-bar{background:white;margin:16px 24px;border-radius:14px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.auth-left{display:flex;align-items:center;gap:12px}
.auth-icon{width:40px;height:40px;border-radius:10px;background:#FFF3E8;display:flex;align-items:center;justify-content:center;font-size:20px}
.auth-info h3{font-size:14px;font-weight:600;color:#1a1a2e}.auth-info p{font-size:11px;color:#666;margin-top:1px}
.auth-btn{padding:10px 20px;background:#FC8019;color:white;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;transition:all 0.2s}
.auth-btn:hover{background:#E5710F;transform:translateY(-1px);box-shadow:0 4px 12px rgba(252,128,25,0.3)}
.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
.status-dot.on{background:#39A06F}.status-dot.off{background:#E04F5F}

/* Connected Users */
.users-section{padding:0 24px;margin-top:4px}
.users-grid{display:flex;flex-direction:column;gap:8px}
.user-card{background:white;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);border-left:3px solid #39A06F;transition:all 0.15s}
.user-card.expired{border-left-color:#E04F5F;opacity:0.6}
.user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#FC8019,#FF6B35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0}
.user-info{flex:1;min-width:0}
.user-primary{font-size:14px;font-weight:600;color:#1a1a2e;display:flex;align-items:center;gap:6px}
.user-phone{font-family:'SF Mono',Consolas,monospace;letter-spacing:0.5px}
.user-meta{font-size:11px;color:#888;margin-top:2px;display:flex;gap:12px;flex-wrap:wrap}
.user-badge{padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.user-badge.active{background:#E8F5EE;color:#2D8B57}
.user-badge.expired-badge{background:#FDEAEC;color:#C93545}
.no-users{text-align:center;padding:24px;color:#bbb;font-size:13px}

/* Stats Grid */
.section-title{font-size:13px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;padding:20px 24px 8px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 24px}
.stat-card{background:white;border-radius:14px;padding:18px 14px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.05);transition:transform 0.15s}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.stat-icon{font-size:20px;margin-bottom:6px}
.stat-value{font-size:26px;font-weight:800;color:#FC8019;line-height:1}
.stat-label{font-size:10px;color:#888;margin-top:6px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px}

/* Tool Breakdown */
.breakdown{padding:0 24px;margin-top:4px}
.breakdown-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:#f0f0f0;margin-top:8px}
.breakdown-seg{height:100%;transition:width 0.5s}
.breakdown-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.legend-item{display:flex;align-items:center;gap:4px;font-size:10px;color:#666}
.legend-dot{width:8px;height:8px;border-radius:2px}

/* Controls */
.controls{padding:16px 24px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ctrl-btn{padding:7px 16px;border:1.5px solid #e8e8e8;border-radius:20px;background:white;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;transition:all 0.15s;color:#555}
.ctrl-btn:hover{border-color:#FC8019;color:#FC8019}.ctrl-btn.active{background:#FC8019;color:white;border-color:#FC8019}
.ctrl-spacer{flex:1}
.export-btn{padding:7px 16px;background:#1a1a2e;color:white;border:none;border-radius:20px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600;transition:all 0.15s;display:flex;align-items:center;gap:6px}
.export-btn:hover{background:#333;transform:translateY(-1px)}

/* Logs */
.logs{padding:0 24px 32px;margin-top:4px}
.log-entry{background:white;border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;box-shadow:0 1px 3px rgba(0,0,0,0.04);border-left:3px solid transparent;transition:all 0.15s}
.log-entry:hover{box-shadow:0 3px 12px rgba(0,0,0,0.08);transform:translateX(2px)}
.log-entry.info{border-left-color:#39A06F}.log-entry.warn{border-left-color:#F5A623}.log-entry.error{border-left-color:#E04F5F}
.log-time{color:#aaa;white-space:nowrap;flex-shrink:0;font-family:'SF Mono',Consolas,monospace;font-size:10px;padding-top:2px}
.log-badge{padding:2px 8px;border-radius:6px;font-weight:700;font-size:9px;flex-shrink:0;text-transform:uppercase;letter-spacing:0.5px}
.log-badge.info{background:#E8F5EE;color:#2D8B57}.log-badge.warn{background:#FFF3E8;color:#D4860B}.log-badge.error{background:#FDEAEC;color:#C93545}
.log-body{flex:1;min-width:0}.log-event{font-weight:600;color:#1a1a2e;font-size:13px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.log-tool{background:#F0EEFF;color:#6B4EFF;padding:2px 8px;border-radius:4px;font-family:'SF Mono',Consolas,monospace;font-size:10px;font-weight:600}
.log-duration{color:#aaa;font-size:11px;font-family:monospace}
.log-detail{color:#666;margin-top:3px;font-size:12px;line-height:1.4}
.log-sid{color:#bbb;font-family:monospace;font-size:9px;margin-top:2px}
.log-user{display:inline-flex;align-items:center;gap:4px;background:#FFF3E8;color:#E5710F;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:'SF Mono',Consolas,monospace}
.empty{text-align:center;padding:48px 24px;color:#999}
.empty-icon{font-size:40px;margin-bottom:12px;opacity:0.4}.empty p{font-size:14px}

/* Live indicator */
.live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#39A06F;margin-right:6px;animation:livePulse 2s infinite}
@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}
</style>
</head><body>

<div class="header">
  <div class="header-row">
    <div>
      <h1>Swiggy Prism</h1>
      <div class="header-sub">Production Dashboard &mdash; Builders Club Integration</div>
    </div>
    <div class="header-badge"><span class="live-dot"></span>Live</div>
  </div>
  <div class="header-servers">
    <span class="server-chip">Food (14 tools)</span>
    <span class="server-chip">Instamart (13 tools)</span>
    <span class="server-chip">Dineout (8 tools)</span>
  </div>
</div>

<div class="auth-bar">
  <div class="auth-left">
    <div class="auth-icon">&#x1F511;</div>
    <div class="auth-info">
      <h3>Swiggy OAuth 2.1 (PKCE)</h3>
      <p><span class="status-dot off" id="status-dot"></span><span id="auth-text">Not connected</span> &middot; <span id="user-count">0</span> session(s)</p>
    </div>
  </div>
  <a href="/auth/start" class="auth-btn">Connect Account</a>
</div>

<div class="section-title">Connected Users</div>
<div class="users-section" id="users"></div>

<div class="section-title">Performance Overview</div>
<div class="stats" id="stats"></div>

<div class="section-title">MCP Tool Usage</div>
<div class="breakdown" id="breakdown"></div>

<div class="controls">
  <button class="ctrl-btn active" onclick="filterLogs('all')">All Events</button>
  <button class="ctrl-btn" onclick="filterLogs('info')">Info</button>
  <button class="ctrl-btn" onclick="filterLogs('warn')">Warnings</button>
  <button class="ctrl-btn" onclick="filterLogs('error')">Errors</button>
  <div class="ctrl-spacer"></div>
  <button class="export-btn" onclick="exportLogs()">&#x2B73; Export JSON</button>
</div>

<div class="section-title">Activity Log <span style="font-weight:400;text-transform:none;font-size:11px;color:#bbb">(auto-refreshes every 5s)</span></div>
<div class="logs" id="logs"></div>

<script>
var currentFilter = 'all';
var toolColors = ['#FC8019','#6B4EFF','#39A06F','#E04F5F','#F5A623','#3B82F6','#EC4899','#14B8A6'];

function getTimeAgo(d) {
  var diff = Date.now() - d.getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.floor(hrs / 24);
  return days + 'd ago';
}
function getTimeUntil(ts) {
  var diff = ts - Date.now();
  if (diff <= 0) return 'expired';
  var hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return hrs + 'h';
  var days = Math.floor(hrs / 24);
  return days + 'd ' + (hrs % 24) + 'h';
}

function loadLogs() {
  var url = '/api/logs?limit=200' + (currentFilter !== 'all' ? '&level=' + currentFilter : '');
  fetch(url).then(function(r){return r.json()}).then(function(data) {
    fetch('/api/health').then(function(r){return r.json()}).then(function(h) {
      var dot = document.getElementById('status-dot');
      var txt = document.getElementById('auth-text');
      if (h.authenticated) {
        dot.className = 'status-dot on';
        txt.textContent = h.mcpMode === 'live' ? 'Connected to mcp.swiggy.com' : 'Connected (mock mode)';
      } else {
        dot.className = 'status-dot off';
        txt.textContent = 'Not connected — click Connect Account';
      }
    });

    // Render connected users
    var sessions = data.sessions || [];
    var ucEl = document.getElementById('user-count');
    if (ucEl) ucEl.textContent = sessions.length;
    var usersEl = document.getElementById('users');
    if (usersEl) {
      if (sessions.length === 0) {
        usersEl.innerHTML = '<div class="users-grid"><div class="no-users">No users connected yet. Share the app to get connections.</div></div>';
      } else {
        var uhtml = '<div class="users-grid">';
        for (var ui = 0; ui < sessions.length; ui++) {
          var u = sessions[ui];
          var now = Date.now();
          var isExpired = now >= u.expiresAt;
          var label = u.phone || u.name || u.userId || u.ip || 'Unknown';
          var maskedLabel = label;
          if (u.phone && u.phone.length >= 10) {
            maskedLabel = u.phone.slice(0, 3) + '****' + u.phone.slice(-3);
          }
          var avatar = label.charAt(0).toUpperCase();
          var connTime = new Date(u.connectedAt);
          var timeAgo = getTimeAgo(connTime);
          var expiresIn = isExpired ? 'Expired' : getTimeUntil(u.expiresAt);
          uhtml += '<div class="user-card' + (isExpired ? ' expired' : '') + '">';
          uhtml += '<div class="user-avatar">' + avatar + '</div>';
          uhtml += '<div class="user-info">';
          uhtml += '<div class="user-primary">';
          if (u.phone) {
            uhtml += '<span class="user-phone">' + maskedLabel + '</span>';
          } else if (u.name) {
            uhtml += '<span>' + u.name + '</span>';
          } else {
            uhtml += '<span>' + (u.userId || u.ip || 'User') + '</span>';
          }
          uhtml += ' <span class="user-badge ' + (isExpired ? 'expired-badge' : 'active') + '">' + (isExpired ? 'Expired' : 'Active') + '</span>';
          uhtml += '</div>';
          uhtml += '<div class="user-meta">';
          uhtml += '<span>Connected ' + timeAgo + '</span>';
          uhtml += '<span>' + (isExpired ? 'Token expired' : 'Expires in ' + expiresIn) + '</span>';
          if (u.ip && u.ip !== 'unknown') uhtml += '<span>IP: ' + u.ip + '</span>';
          uhtml += '</div>';
          uhtml += '</div></div>';
        }
        uhtml += '</div>';
        usersEl.innerHTML = uhtml;
      }
    }

    var s = data.stats;
    document.getElementById('stats').innerHTML =
      '<div class="stat-card"><div class="stat-icon">&#x1F4CA;</div><div class="stat-value">' + s.total + '</div><div class="stat-label">Total Events</div></div>' +
      '<div class="stat-card"><div class="stat-icon">&#x1F527;</div><div class="stat-value">' + s.toolCalls + '</div><div class="stat-label">MCP Tool Calls</div></div>' +
      '<div class="stat-card"><div class="stat-icon">&#x26A0;</div><div class="stat-value">' + s.errors + '</div><div class="stat-label">Errors</div></div>' +
      '<div class="stat-card"><div class="stat-icon">&#x23F1;</div><div class="stat-value">' + s.avgLatencyMs + '<small style="font-size:12px">ms</small></div><div class="stat-label">Avg Latency</div></div>' +
      '<div class="stat-card"><div class="stat-icon">&#x2705;</div><div class="stat-value">' + s.errorRate + '</div><div class="stat-label">Error Rate</div></div>' +
      '<div class="stat-card"><div class="stat-icon">&#x1F512;</div><div class="stat-value">' + s.authEvents + '</div><div class="stat-label">Auth Events</div></div>';

    // Tool breakdown bar
    var bd = data.stats.toolBreakdown || {};
    var keys = Object.keys(bd);
    var total = keys.reduce(function(s,k){return s+bd[k]},0);
    if (total > 0) {
      var barHtml = '<div class="breakdown-bar">';
      var legendHtml = '<div class="breakdown-legend">';
      for (var ti=0;ti<keys.length;ti++) {
        var pct = (bd[keys[ti]]/total*100).toFixed(1);
        var c = toolColors[ti%toolColors.length];
        barHtml += '<div class="breakdown-seg" style="width:'+pct+'%;background:'+c+'"></div>';
        legendHtml += '<div class="legend-item"><span class="legend-dot" style="background:'+c+'"></span>'+keys[ti]+' ('+bd[keys[ti]]+')</div>';
      }
      barHtml += '</div>';
      legendHtml += '</div>';
      document.getElementById('breakdown').innerHTML = barHtml + legendHtml;
    } else {
      document.getElementById('breakdown').innerHTML = '<div style="font-size:12px;color:#bbb;padding:8px 0">No tool calls recorded yet</div>';
    }

    var logs = data.logs;
    if (logs.length === 0) {
      document.getElementById('logs').innerHTML = '<div class="empty"><div class="empty-icon">&#x1F4ED;</div><p>No activity recorded yet</p><p style="font-size:12px;margin-top:4px;color:#bbb">Start using Prism to see logs here</p></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      var d = new Date(l.ts);
      var time = d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3,'0');
      html += '<div class="log-entry ' + l.level + '">';
      html += '<span class="log-time">' + time + '</span>';
      html += '<span class="log-badge ' + l.level + '">' + l.level + '</span>';
      html += '<div class="log-body"><div class="log-event">' + l.event;
      if (l.tool) html += ' <span class="log-tool">' + l.tool + '</span>';
      if (l.userId) html += ' <span class="log-user">&#x1F464; ' + l.userId + '</span>';
      if (l.durationMs) html += ' <span class="log-duration">' + l.durationMs + 'ms</span>';
      html += '</div>';
      if (l.details) html += '<div class="log-detail">' + l.details + '</div>';
      if (l.sessionId) html += '<div class="log-sid">Session: ' + l.sessionId + '</div>';
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
  fetch('/api/logs?limit=500').then(function(r){return r.json()}).then(function(data) {
    data.exportedAt = new Date().toISOString();
    data.integration = 'Swiggy Prism — Builders Club';
    data.developer = 'Deepanshu Verma <deepanshuverma966@gmail.com>';
    var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'swiggy-prism-logs-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
  });
}

loadLogs();
setInterval(loadLogs, 5000);
</script>
</body></html>`;

server.listen(PORT, () => {
  const llmStatus = process.env.GEMINI_API_KEY ? "Gemini" : process.env.OPENAI_API_KEY ? "OpenAI" : process.env.GROQ_API_KEY ? "Groq (Llama 3.3 70B)" : "local fallback (no API key)";
  const mcpStatus = process.env.MCP_MODE === "live" ? "LIVE (mcp.swiggy.com)" : "mock (embedded catalog)";
  console.log(`\n  Swiggy Prism server running at http://localhost:${PORT}`);
  console.log(`  LLM: ${llmStatus}`);
  console.log(`  MCP: ${mcpStatus}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  Auth:  http://localhost:${PORT}/auth/start\n`);
  log({ level: "info", event: "server_start", status: "ok", details: `MCP=${mcpStatus} LLM=${llmStatus}` });
});
