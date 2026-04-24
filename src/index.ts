import { parseRecipe } from "./core/parser";
import { optimizeCart } from "./core/optimizer";
import { MCPClient } from "./mcp/client";
import type { PrismRequest, OptimizedCart, SKU } from "./types";

export async function processRequest(req: PrismRequest): Promise<OptimizedCart> {
  const ingredients = await parseRecipe(req.prompt, req.servings);

  const client = new MCPClient();
  await client.authenticate(
    process.env.SWIGGY_CLIENT_ID!,
    process.env.SWIGGY_CLIENT_SECRET!
  );

  // fetch SKUs for each ingredient in parallel
  const skuEntries = await Promise.all(
    ingredients.map(async (ingredient) => {
      const skus = await client.searchSKUs(ingredient.name);
      return [ingredient.name, skus] as [string, SKU[]];
    })
  );

  const skuMap = new Map(skuEntries);
  const cart = optimizeCart(ingredients, skuMap, req.budget);

  // push selected items to Instamart cart
  if (cart.items.length > 0) {
    await client.addToCart(
      cart.items.map((item) => ({
        skuId: item.sku.skuId,
        quantity: item.count,
      }))
    );
  }

  return cart;
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: swiggy-prism <recipe> <budget>");
    console.log('Example: swiggy-prism "butter chicken for 4" 800');
    process.exit(1);
  }

  const prompt = args[0];
  const budget = parseInt(args[1], 10);

  if (isNaN(budget) || budget <= 0) {
    console.error("Budget must be a positive number");
    process.exit(1);
  }

  console.log(`Parsing recipe: "${prompt}"`);
  console.log(`Budget: ₹${budget}\n`);

  const cart = await processRequest({ prompt, budget });

  console.log("--- Optimized Cart ---");
  for (const item of cart.items) {
    console.log(
      `  ${item.ingredient.name} → ${item.sku.name} (${item.sku.brand}) x${item.count} = ₹${item.totalPrice}`
    );
  }

  console.log(`\nTotal: ₹${cart.totalCost} / ₹${cart.budget}`);
  console.log(`Utilization: ${Math.round(cart.budgetUtilization * 100)}%`);

  if (cart.droppedItems.length > 0) {
    console.log("\nDropped (over budget):");
    for (const item of cart.droppedItems) {
      console.log(`  - ${item.name} [${item.priority}]`);
    }
  }

  console.log(`\nOptimized in ${cart.meta.optimizationTimeMs}ms`);
  console.log(`SKUs evaluated: ${cart.meta.totalSkusEvaluated}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
