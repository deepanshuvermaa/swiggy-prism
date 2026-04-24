#!/usr/bin/env node

import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRecipe } from "./core/parser.js";
import { optimizeCart } from "./core/optimizer.js";
import { localParseRecipe } from "./core/local-parser.js";
import { sanitizePrompt } from "./utils/sanitize.js";
import { MockMCPClient } from "./mcp/mock.js";
import type { Ingredient, SKU } from "./types/index.js";

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
};

const mcpClient = new MockMCPClient();

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
  if (url.pathname === "/api/health") {
    return json(res, { status: "ok", hasLLM: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY });
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

    // add to mock cart
    if (cart.items.length > 0) {
      mcpClient.clearCart();
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

server.listen(PORT, () => {
  const llmStatus = process.env.GEMINI_API_KEY ? "Gemini" : process.env.OPENAI_API_KEY ? "OpenAI" : "local fallback (no API key)";
  console.log(`\n  Swiggy Prism server running at http://localhost:${PORT}`);
  console.log(`  LLM: ${llmStatus}`);
  console.log(`  MCP: mock provider\n`);
});
