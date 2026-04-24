import type {
  Ingredient,
  IngredientPriority,
  SKU,
  CartItem,
  OptimizedCart,
  OptimizerConfig,
} from "../types/index.js";
import { normalize } from "../utils/units.js";

const DEFAULT_CONFIG: OptimizerConfig = {
  minBudget: 50,
  maxBudget: 50000,
  priorityWeights: {
    essential: 3,
    important: 2,
    optional: 1,
  },
};

interface KnapsackItem {
  ingredient: Ingredient;
  sku: SKU;
  matchScore: number;
  count: number;
  cost: number;
  value: number;
}

export function optimizeCart(
  ingredients: Ingredient[],
  skuMap: Map<string, SKU[]>,
  budget: number,
  config: OptimizerConfig = DEFAULT_CONFIG
): OptimizedCart {
  if (budget < config.minBudget || budget > config.maxBudget) {
    throw new Error(
      `Budget must be between ₹${config.minBudget} and ₹${config.maxBudget}`
    );
  }

  const startTime = performance.now();
  let totalSkusEvaluated = 0;

  const candidates: KnapsackItem[] = [];

  for (const ingredient of ingredients) {
    const skus = skuMap.get(ingredient.name) ?? [];
    totalSkusEvaluated += skus.length;

    const bestMatch = findBestSKU(ingredient, skus);
    if (!bestMatch) continue;

    const neededQty = convertQuantity(ingredient, bestMatch.sku);
    const count = Math.max(1, Math.ceil(neededQty));
    const cost = bestMatch.sku.price * count;
    const value = computeValue(ingredient, bestMatch.score, config);

    candidates.push({
      ingredient,
      sku: bestMatch.sku,
      matchScore: bestMatch.score,
      count,
      cost,
      value,
    });
  }

  const selected = knapsack(candidates, budget);

  const selectedNames = new Set(selected.map((s) => s.ingredient.name));
  const droppedItems = ingredients.filter((i) => !selectedNames.has(i.name));

  const items: CartItem[] = selected.map((s) => ({
    ingredient: s.ingredient,
    sku: s.sku,
    matchScore: s.matchScore,
    count: s.count,
    totalPrice: s.cost,
  }));

  const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    items,
    totalCost,
    budget,
    budgetUtilization: Math.round((totalCost / budget) * 100) / 100,
    droppedItems,
    meta: {
      algorithmUsed: "knapsack",
      optimizationTimeMs: Math.round(performance.now() - startTime),
      totalSkusEvaluated,
    },
  };
}

function convertQuantity(ingredient: Ingredient, sku: SKU): number {
  const need = normalize(ingredient.quantity, ingredient.unit);
  const have = normalize(sku.quantity, sku.unit);

  // if units are compatible (both grams or both ml), do the division
  if (need.unit === have.unit) {
    return need.quantity / have.quantity;
  }

  // incompatible units (e.g., grams vs pcs) — assume 1 unit needed
  return 1;
}

function findBestSKU(
  ingredient: Ingredient,
  skus: SKU[]
): { sku: SKU; score: number } | null {
  if (skus.length === 0) return null;

  let bestSku: SKU | null = null;
  let bestScore = -1;

  for (const sku of skus) {
    if (!sku.inStock) continue;

    let score = 0;

    // name similarity
    const ingredientTokens = ingredient.name.toLowerCase().split(/\s+/);
    const skuTokens = sku.name.toLowerCase().split(/\s+/);
    const overlap = ingredientTokens.filter((t) => skuTokens.includes(t)).length;
    score += (overlap / ingredientTokens.length) * 50;

    // unit compatibility bonus
    const needUnit = normalize(1, ingredient.unit).unit;
    const skuUnit = normalize(1, sku.unit).unit;
    if (needUnit === skuUnit) score += 20;

    // value score — normalized so expensive items aren't penalized to zero
    const pricePerUnit = sku.price / sku.quantity;
    score += 30 / (1 + pricePerUnit);

    if (score > bestScore) {
      bestScore = score;
      bestSku = sku;
    }
  }

  return bestSku ? { sku: bestSku, score: bestScore } : null;
}

function computeValue(
  ingredient: Ingredient,
  matchScore: number,
  config: OptimizerConfig
): number {
  const priorityWeight = config.priorityWeights[ingredient.priority];
  return matchScore * priorityWeight;
}

function knapsack(items: KnapsackItem[], budget: number): KnapsackItem[] {
  const n = items.length;
  if (n === 0) return [];

  // for large budgets, use coarser granularity to keep memory sane
  const scale = budget > 10000 ? 10 : 1;
  const W = Math.floor(budget / scale);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(W + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const cost = Math.ceil(items[i - 1].cost / scale);
    const val = items[i - 1].value;

    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (cost <= w && dp[i - 1][w - cost] + val > dp[i][w]) {
        dp[i][w] = dp[i - 1][w - cost] + val;
      }
    }
  }

  const selected: KnapsackItem[] = [];
  let w = W;

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(items[i - 1]);
      w -= Math.ceil(items[i - 1].cost / scale);
    }
  }

  return selected;
}
