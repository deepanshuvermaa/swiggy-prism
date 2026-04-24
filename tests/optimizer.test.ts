import { describe, it, expect } from "vitest";
import { optimizeCart } from "../src/core/optimizer.js";
import type { Ingredient, SKU } from "../src/types/index.js";

function makeIngredient(
  name: string,
  qty: number,
  unit = "g",
  priority: "essential" | "important" | "optional" = "essential"
): Ingredient {
  return { name, quantity: qty, unit, category: "protein", priority };
}

function makeSKU(name: string, price: number, qty: number, unit = "g"): SKU {
  return {
    skuId: `sku-${name.replace(/\s/g, "-")}`,
    name,
    brand: "TestBrand",
    price,
    quantity: qty,
    unit,
    inStock: true,
  };
}

describe("optimizeCart", () => {
  it("selects all items when budget is sufficient", () => {
    const ingredients = [
      makeIngredient("chicken", 500),
      makeIngredient("onion", 200),
    ];
    const skuMap = new Map([
      ["chicken", [makeSKU("chicken breast", 250, 500)]],
      ["onion", [makeSKU("onion pack", 40, 500)]],
    ]);

    const result = optimizeCart(ingredients, skuMap, 500);

    expect(result.items.length).toBe(2);
    expect(result.totalCost).toBeLessThanOrEqual(500);
    expect(result.droppedItems.length).toBe(0);
  });

  it("drops optional items first when budget is tight", () => {
    const ingredients = [
      makeIngredient("chicken", 500, "g", "essential"),
      makeIngredient("garnish", 50, "g", "optional"),
    ];
    const skuMap = new Map([
      ["chicken", [makeSKU("chicken breast", 280, 500)]],
      ["garnish", [makeSKU("coriander", 30, 100)]],
    ]);

    const result = optimizeCart(ingredients, skuMap, 290);
    const selectedNames = result.items.map((i) => i.ingredient.name);

    expect(selectedNames).toContain("chicken");
    expect(result.droppedItems.length).toBe(1);
  });

  it("rejects budgets below minimum", () => {
    expect(() => optimizeCart([], new Map(), 10)).toThrow("Budget must be between");
  });

  it("handles empty ingredient list", () => {
    const result = optimizeCart([], new Map(), 500);
    expect(result.items.length).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("skips ingredients with no matching SKUs", () => {
    const ingredients = [makeIngredient("saffron", 1)];
    const result = optimizeCart(ingredients, new Map(), 1000);
    expect(result.items.length).toBe(0);
  });

  it("skips out-of-stock SKUs", () => {
    const ingredients = [makeIngredient("rice", 1000)];
    const oos: SKU = { ...makeSKU("basmati rice", 150, 1000), inStock: false };
    const result = optimizeCart(ingredients, new Map([["rice", [oos]]]), 500);
    expect(result.items.length).toBe(0);
  });

  it("handles unit conversion between g and kg", () => {
    const ingredients = [makeIngredient("rice", 2, "kg")];
    const skuMap = new Map([
      ["rice", [makeSKU("basmati rice", 199, 1000, "g")]],
    ]);

    const result = optimizeCart(ingredients, skuMap, 500);
    expect(result.items.length).toBe(1);
    // 2kg = 2000g, SKU is 1000g, so need 2 units
    expect(result.items[0].count).toBe(2);
  });

  it("handles large budgets without memory blowup", () => {
    const ingredients = [makeIngredient("chicken", 500)];
    const skuMap = new Map([
      ["chicken", [makeSKU("chicken breast", 250, 500)]],
    ]);

    // should not throw — uses coarser granularity above 10000
    const result = optimizeCart(ingredients, skuMap, 50000);
    expect(result.items.length).toBe(1);
  });
});
