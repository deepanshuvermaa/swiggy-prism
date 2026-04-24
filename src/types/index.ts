/** Parsed ingredient from LLM extraction */
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  priority: IngredientPriority;
}

export type IngredientCategory =
  | "protein"
  | "dairy"
  | "vegetable"
  | "spice"
  | "grain"
  | "oil_fat"
  | "condiment"
  | "other";

/** Priority determines Knapsack weight — essentials are picked first when budget is tight */
export type IngredientPriority = "essential" | "important" | "optional";

/** Instamart SKU returned from Swiggy MCP */
export interface SKU {
  skuId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  unit: string;
  inStock: boolean;
  imageUrl?: string;
}

/** Mapped ingredient to best-value SKU */
export interface CartItem {
  ingredient: Ingredient;
  sku: SKU;
  matchScore: number;
  /** How many units of this SKU to add */
  count: number;
  totalPrice: number;
}

/** Budget optimization result */
export interface OptimizedCart {
  items: CartItem[];
  totalCost: number;
  budget: number;
  budgetUtilization: number;
  /** Items that couldn't fit within budget */
  droppedItems: Ingredient[];
  /** Optimization metadata */
  meta: {
    algorithmUsed: "knapsack";
    optimizationTimeMs: number;
    totalSkusEvaluated: number;
  };
}

/** User request input */
export interface PrismRequest {
  prompt: string;
  budget: number;
  servings?: number;
  dietaryPreferences?: string[];
  location?: {
    lat: number;
    lng: number;
  };
}

/** MCP tool call payload */
export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** MCP server response */
export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** LLM parser configuration */
export interface ParserConfig {
  provider: "gemini" | "openai";
  model: string;
  maxTokens: number;
  temperature: number;
}

/** Optimizer configuration */
export interface OptimizerConfig {
  minBudget: number;
  maxBudget: number;
  priorityWeights: Record<IngredientPriority, number>;
}
