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

// =====================================================
// Prism v2 — Cross-Channel Decision Engine Types
// =====================================================

export type Channel = "instamart" | "food" | "dineout";

export type Persona = "foodie" | "gymfreak" | "balanced" | "budget";

// --- Food (Delivery) Types ---
// Matches search_restaurants response from mcp.swiggy.com/food

export interface Restaurant {
  restaurantId: string;
  name: string;
  cuisine: string[];
  rating: number;
  ratingCount: number;
  deliveryTimeMin: number;
  deliveryFee: number;
  distanceKm: number;
  availabilityStatus: "OPEN" | "CLOSED" | "UNAVAILABLE";
  isVeg: boolean;
}

/** Matches get_restaurant_menu response items */
export interface MenuItem {
  itemId: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isBestseller: boolean;
  category: string;
  hasVariants: boolean;
  hasAddons: boolean;
}

/** Matches fetch_food_coupons response — COD-eligible only in v1 */
export interface FoodCoupon {
  couponCode: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  requiresOnlinePayment: boolean;
}

export interface FoodCartItem {
  menuItem: MenuItem;
  quantity: number;
  totalPrice: number;
}

/** Food cart state — ₹1000 cap during beta, COD only */
export interface FoodCart {
  restaurantId: string;
  restaurantName: string;
  items: FoodCartItem[];
  subtotal: number;
  deliveryFee: number;
  appliedCoupon?: FoodCoupon;
  discount: number;
  total: number;
  estimatedDeliveryMin: number;
}

// --- Dineout Types ---
// Matches search_restaurants_dineout response from mcp.swiggy.com/dineout

export interface DineoutVenue {
  restaurantId: string;
  name: string;
  cuisine: string[];
  rating: number;
  ratingCount: number;
  locality: string;
  costForTwo: number;
  availability: "AVAILABLE" | "UNAVAILABLE";
  highlights: string[];
  offers: string[];
}

/**
 * Matches get_available_slots response.
 * Only FREE deals (isFree=true, bookingPrice=0) are usable per Swiggy API.
 */
export interface DineoutSlot {
  dateStr: string;
  reservationTime: number;
  displayTime: string;
  slotGroupName: "Breakfast" | "Lunch" | "Dinner";
  deals: DineoutDeal[];
}

export interface DineoutDeal {
  slotId: number;
  itemId: string;
  title: string;
  bookingPrice: number;
  isFree: boolean;
  discountPercentage: number;
}

export interface DineoutBooking {
  bookingId: string;
  restaurantId: string;
  venueName: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "pending" | "cancelled";
  estimatedBill: number;
}

// --- Decision Engine Types ---

export interface FoodIntent {
  dishName: string;
  servings: number;
  budget: number;
  timeConstraintMin?: number;
  occasion?: "casual" | "date" | "family" | "party" | "quick";
  dietaryPrefs?: string[];
}

export interface CookItDetails {
  type: "cook";
  cart: OptimizedCart;
  cookTimeMin: number;
  groceryDeliveryMin: number;
  recipeName: string;
}

export interface OrderItDetails {
  type: "order";
  restaurant: Restaurant;
  menuItems: MenuItem[];
  cart: FoodCart;
  deliveryMin: number;
}

export interface DineOutDetails {
  type: "dineout";
  venue: DineoutVenue;
  nextSlot: DineoutSlot;
  estimatedBill: number;
  travelMin: number;
  offerText?: string;
}

export interface ChannelOption {
  channel: Channel;
  available: boolean;
  score: number;
  cost: number;
  timeMin: number;
  healthScore: number;
  details: CookItDetails | OrderItDetails | DineOutDetails;
  recommended: boolean;
  reasonShort: string;
}

export interface DecisionResult {
  intent: FoodIntent;
  options: ChannelOption[];
  bestOption: Channel;
  timestamp: string;
}

// --- History / Analytics Types ---

export interface OrderRecord {
  id: string;
  date: string;
  channel: Channel;
  dishName: string;
  cost: number;
  healthScore: number;
  servings: number;
}

export interface XRayAnalytics {
  totalSpend: number;
  spendByChannel: Record<Channel, number>;
  orderCount: number;
  ordersByChannel: Record<Channel, number>;
  avgHealthScore: number;
  healthTrend: number[];
  potentialSavings: number;
  topDishes: Array<{ name: string; count: number; channel: Channel }>;
}
