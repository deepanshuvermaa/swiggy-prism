import { describe, it, expect, vi, beforeEach } from "vitest";
import { optimizeCart } from "../src/core/optimizer.js";
import { MockMCPClient } from "../src/mcp/mock.js";
import type { Ingredient } from "../src/types/index.js";

// integration test: ingredients → mock SKU search → optimizer → cart
// skips the LLM call (that requires an API key) and starts from parsed ingredients

describe("end-to-end pipeline (mock MCP)", () => {
  const mockClient = new MockMCPClient();

  beforeEach(() => {
    mockClient.clearCart();
  });

  it("builds a butter chicken cart within budget", async () => {
    const ingredients: Ingredient[] = [
      { name: "chicken", quantity: 500, unit: "g", category: "protein", priority: "essential" },
      { name: "onion", quantity: 300, unit: "g", category: "vegetable", priority: "essential" },
      { name: "tomato", quantity: 200, unit: "g", category: "vegetable", priority: "essential" },
      { name: "cream", quantity: 100, unit: "ml", category: "dairy", priority: "important" },
      { name: "butter", quantity: 50, unit: "g", category: "dairy", priority: "important" },
      { name: "garam masala", quantity: 10, unit: "g", category: "spice", priority: "optional" },
      { name: "turmeric", quantity: 5, unit: "g", category: "spice", priority: "optional" },
      { name: "cumin", quantity: 5, unit: "g", category: "spice", priority: "optional" },
    ];

    // search SKUs for each ingredient
    const skuEntries = await Promise.all(
      ingredients.map(async (ing) => {
        const skus = await mockClient.searchSKUs(ing.name);
        return [ing.name, skus] as [string, typeof skus];
      })
    );

    const skuMap = new Map(skuEntries);
    const cart = optimizeCart(ingredients, skuMap, 800);

    expect(cart.totalCost).toBeLessThanOrEqual(800);
    expect(cart.items.length).toBeGreaterThan(0);

    // essentials should be picked first
    const essentials = cart.items.filter((i) => i.ingredient.priority === "essential");
    expect(essentials.length).toBeGreaterThanOrEqual(2);

    // add to cart
    await mockClient.addToCart(
      cart.items.map((item) => ({
        skuId: item.sku.skuId,
        quantity: item.count,
      }))
    );

    const summary = await mockClient.getCartSummary();
    expect(summary.success).toBe(true);
  });

  it("drops items when budget is very tight", async () => {
    const ingredients: Ingredient[] = [
      { name: "chicken", quantity: 1000, unit: "g", category: "protein", priority: "essential" },
      { name: "basmati rice", quantity: 1000, unit: "g", category: "grain", priority: "essential" },
      { name: "cream", quantity: 200, unit: "ml", category: "dairy", priority: "important" },
      { name: "cardamom", quantity: 10, unit: "g", category: "spice", priority: "optional" },
    ];

    const skuEntries = await Promise.all(
      ingredients.map(async (ing) => {
        const skus = await mockClient.searchSKUs(ing.name);
        return [ing.name, skus] as [string, typeof skus];
      })
    );

    const skuMap = new Map(skuEntries);
    // very tight budget — can't fit everything
    const cart = optimizeCart(ingredients, skuMap, 300);

    expect(cart.totalCost).toBeLessThanOrEqual(300);
    expect(cart.droppedItems.length).toBeGreaterThan(0);

    // with tight budget, at least one item should survive
    expect(cart.items.length).toBeGreaterThan(0);
  });

  it("handles a vegetarian recipe", async () => {
    const ingredients: Ingredient[] = [
      { name: "paneer", quantity: 200, unit: "g", category: "protein", priority: "essential" },
      { name: "capsicum", quantity: 100, unit: "g", category: "vegetable", priority: "essential" },
      { name: "onion", quantity: 200, unit: "g", category: "vegetable", priority: "essential" },
      { name: "tomato", quantity: 150, unit: "g", category: "vegetable", priority: "essential" },
      { name: "oil", quantity: 30, unit: "ml", category: "oil_fat", priority: "important" },
    ];

    const skuEntries = await Promise.all(
      ingredients.map(async (ing) => {
        const skus = await mockClient.searchSKUs(ing.name);
        return [ing.name, skus] as [string, typeof skus];
      })
    );

    const skuMap = new Map(skuEntries);
    const cart = optimizeCart(ingredients, skuMap, 500);

    expect(cart.totalCost).toBeLessThanOrEqual(500);
    expect(cart.items.length).toBeGreaterThanOrEqual(3);
  });
});
