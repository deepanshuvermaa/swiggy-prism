import { describe, it, expect } from "vitest";
import { optimizeCart } from "../src/core/optimizer";
import type { Ingredient, SKU } from "../src/types";

function makeIngredient(
  name: string,
  qty: number,
  priority: "essential" | "important" | "optional" = "essential"
): Ingredient {
  return {
    name,
    quantity: qty,
    unit: "g",
    category: "protein",
    priority,
  };
}

function makeSKU(name: string, price: number, qty: number): SKU {
  return {
    skuId: `sku-${name}`,
    name,
    brand: "TestBrand",
    price,
    quantity: qty,
    unit: "g",
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
      makeIngredient("chicken", 500, "essential"),
      makeIngredient("garnish", 50, "optional"),
    ];

    const skuMap = new Map([
      ["chicken", [makeSKU("chicken breast", 280, 500)]],
      ["garnish", [makeSKU("coriander", 30, 100)]],
    ]);

    // budget only fits chicken
    const result = optimizeCart(ingredients, skuMap, 290);

    const selectedNames = result.items.map((i) => i.ingredient.name);
    expect(selectedNames).toContain("chicken");
    expect(result.droppedItems.length).toBe(1);
  });

  it("rejects budgets below minimum", () => {
    expect(() =>
      optimizeCart([], new Map(), 10)
    ).toThrow("Budget must be between");
  });

  it("handles empty ingredient list", () => {
    const result = optimizeCart([], new Map(), 500);

    expect(result.items.length).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("skips ingredients with no matching SKUs", () => {
    const ingredients = [makeIngredient("saffron", 1)];
    const skuMap = new Map<string, SKU[]>();

    const result = optimizeCart(ingredients, skuMap, 1000);

    expect(result.items.length).toBe(0);
  });

  it("skips out-of-stock SKUs", () => {
    const ingredients = [makeIngredient("rice", 1000)];
    const outOfStock: SKU = {
      ...makeSKU("basmati rice", 150, 1000),
      inStock: false,
    };

    const skuMap = new Map([["rice", [outOfStock]]]);
    const result = optimizeCart(ingredients, skuMap, 500);

    expect(result.items.length).toBe(0);
  });
});
