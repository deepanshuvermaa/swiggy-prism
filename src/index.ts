#!/usr/bin/env node

import "dotenv/config";
import { parseRecipe } from "./core/parser.js";
import { optimizeCart } from "./core/optimizer.js";
import { createProvider } from "./mcp/adapter.js";
import { sanitizePrompt } from "./utils/sanitize.js";
import type { PrismRequest, OptimizedCart, SKU } from "./types/index.js";

export async function processRequest(req: PrismRequest): Promise<OptimizedCart> {
  const cleanPrompt = sanitizePrompt(req.prompt);
  const ingredients = await parseRecipe(cleanPrompt, req.servings);

  if (ingredients.length === 0) {
    throw new Error("Could not extract any ingredients from that recipe");
  }

  const provider = createProvider();

  const clientId = process.env.SWIGGY_CLIENT_ID;
  const clientSecret = process.env.SWIGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // mock mode doesn't need real creds, but still calls authenticate
    console.log("[prism] no MCP credentials found, using mock values");
  }
  await provider.authenticate(clientId ?? "mock", clientSecret ?? "mock");

  const skuEntries = await Promise.all(
    ingredients.map(async (ingredient) => {
      const skus = await provider.searchSKUs(ingredient.name);
      return [ingredient.name, skus] as [string, SKU[]];
    })
  );

  const skuMap = new Map(skuEntries);
  const cart = optimizeCart(ingredients, skuMap, req.budget);

  if (cart.items.length > 0) {
    await provider.addToCart(
      cart.items.map((item) => ({
        skuId: item.sku.skuId,
        quantity: item.count,
      }))
    );
  }

  return cart;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length < 2) {
    console.log("Usage: swiggy-prism <recipe> <budget> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --dry-run      Show cart without adding to Instamart");
    console.log("  --provider     LLM provider: gemini (default) or openai");
    console.log("");
    console.log('Example: swiggy-prism "butter chicken for 4" 800');
    process.exit(args.includes("--help") ? 0 : 1);
  }

  const prompt = args[0];
  const budget = parseInt(args[1], 10);

  if (isNaN(budget) || budget <= 0) {
    console.error("Budget must be a positive number");
    process.exit(1);
  }

  console.log(`\nParsing recipe: "${prompt}"`);
  console.log(`Budget: ₹${budget}`);
  console.log("");

  try {
    const cart = await processRequest({ prompt, budget });

    console.log("--- Optimized Cart ---\n");
    for (const item of cart.items) {
      const line = [
        `  ${item.ingredient.name}`,
        `→ ${item.sku.name} (${item.sku.brand})`,
        `x${item.count}`,
        `= ₹${item.totalPrice}`,
      ].join("  ");
      console.log(line);
    }

    console.log(`\n  Total: ₹${cart.totalCost} / ₹${cart.budget}`);
    console.log(`  Utilization: ${Math.round(cart.budgetUtilization * 100)}%`);

    if (cart.droppedItems.length > 0) {
      console.log("\n  Dropped (over budget):");
      for (const item of cart.droppedItems) {
        console.log(`    - ${item.name} [${item.priority}]`);
      }
    }

    console.log(`\n  Optimized in ${cart.meta.optimizationTimeMs}ms`);
    console.log(`  SKUs evaluated: ${cart.meta.totalSkusEvaluated}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

main();
