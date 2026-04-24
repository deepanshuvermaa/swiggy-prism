import type {
  Ingredient,
  IngredientPriority,
  SKU,
  CartItem,
  OptimizedCart,
  OptimizerConfig,
} from "../types";

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

  // build candidate list — best SKU match per ingredient
  const candidates: KnapsackItem[] = [];

  for (const ingredient of ingredients) {
    const skus = skuMap.get(ingredient.name) ?? [];
    totalSkusEvaluated += skus.length;

    const bestMatch = findBestSKU(ingredient, skus);
    if (!bestMatch) continue;

    const count = Math.ceil(ingredient.quantity / bestMatch.sku.quantity);
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

  // run knapsack
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

    // name similarity — simple token overlap
    const ingredientTokens = ingredient.name.toLowerCase().split(/\s+/);
    const skuTokens = sku.name.toLowerCase().split(/\s+/);
    const overlap = ingredientTokens.filter((t) => skuTokens.includes(t)).length;
    score += (overlap / ingredientTokens.length) * 50;

    // unit match bonus
    if (sku.unit === ingredient.unit) score += 20;

    // value score — lower price per unit is better
    const pricePerUnit = sku.price / sku.quantity;
    score += Math.max(0, 30 - pricePerUnit);

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

/**
 * 0/1 Knapsack via dynamic programming.
 * Budget is discretized to integer rupees for the DP table.
 */
function knapsack(items: KnapsackItem[], budget: number): KnapsackItem[] {
  const n = items.length;
  const W = Math.floor(budget);

  // dp[i][w] = max value using items 0..i-1 with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(W + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const cost = Math.ceil(items[i - 1].cost);
    const val = items[i - 1].value;

    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      if (cost <= w && dp[i - 1][w - cost] + val > dp[i][w]) {
        dp[i][w] = dp[i - 1][w - cost] + val;
      }
    }
  }

  // backtrack to find selected items
  const selected: KnapsackItem[] = [];
  let w = W;

  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(items[i - 1]);
      w -= Math.ceil(items[i - 1].cost);
    }
  }

  return selected;
}
