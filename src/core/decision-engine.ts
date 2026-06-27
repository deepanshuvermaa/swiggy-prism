import type {
  FoodIntent, ChannelOption, DecisionResult, Persona,
  CookItDetails, OrderItDetails, DineOutDetails,
} from "../types/index.js";
import type { FoodProvider } from "../mcp/providers.js";
import type { DineoutProvider } from "../mcp/providers.js";
import type { InstamartProvider } from "../mcp/adapter.js";
import { localParseRecipe } from "../core/local-parser.js";
import { parseRecipe as llmParseRecipe } from "../core/parser.js";
import { optimizeCart } from "../core/optimizer.js";
import { getCookTime, getGroceryDeliveryTime, getDineoutTravelTime } from "./time-estimator.js";
import { rankOptions } from "./scorer.js";

// Simple health score from dish name (reuses existing NUTRITION concept)
const DISH_HEALTH: Record<string, number> = {
  "butter chicken": 55, biryani: 50, "chicken biryani": 50, "veg biryani": 58,
  "dal tadka": 72, "dal makhani": 60, "paneer tikka": 62, "palak paneer": 68,
  "chole bhature": 45, "aloo gobi": 65, "egg curry": 60, rajma: 70,
  sandwich: 55, pasta: 50, "fried rice": 48, omelette: 65, maggi: 35,
  "paneer butter masala": 55, "kadhai paneer": 58, "chicken tikka": 60,
  "mutton rogan josh": 52, "fish curry": 62, pizza: 40, burger: 38,
  momos: 45, noodles: 42, dosa: 60, idli: 72, thali: 65, kebab: 55,
};

function getDishHealth(dishName: string): number {
  const lower = dishName.toLowerCase();
  for (const [key, score] of Object.entries(DISH_HEALTH)) {
    if (lower.includes(key) || key.includes(lower)) return score;
  }
  return 55; // default moderate
}

async function queryCookIt(
  intent: FoodIntent,
  instamartProvider: InstamartProvider
): Promise<ChannelOption | null> {
  try {
    const hasLLM = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
    let ingredients;
    if (hasLLM) {
      try {
        ingredients = await llmParseRecipe(intent.dishName + " for " + intent.servings, intent.servings);
      } catch {
        ingredients = localParseRecipe(intent.dishName, intent.servings);
      }
    } else {
      ingredients = localParseRecipe(intent.dishName, intent.servings);
    }
    if (ingredients.length === 0) return null;

    // Search SKUs for each ingredient
    const skuMap = new Map<string, Awaited<ReturnType<typeof instamartProvider.searchSKUs>>>();
    for (const ing of ingredients) {
      const skus = await instamartProvider.searchSKUs(ing.name, 5);
      skuMap.set(ing.name, skus);
    }

    const cart = optimizeCart(ingredients, skuMap, intent.budget);
    const cookTime = getCookTime(intent.dishName);
    const groceryTime = getGroceryDeliveryTime();

    const details: CookItDetails = {
      type: "cook",
      cart,
      cookTimeMin: cookTime,
      groceryDeliveryMin: groceryTime,
      recipeName: intent.dishName,
    };

    return {
      channel: "instamart",
      available: true,
      score: 0,
      cost: cart.totalCost,
      timeMin: cookTime + groceryTime,
      healthScore: Math.min(100, getDishHealth(intent.dishName) + 15), // cooking is healthier
      details,
      recommended: false,
      reasonShort: "",
    };
  } catch {
    return null;
  }
}

async function queryOrderIt(
  intent: FoodIntent,
  foodProvider: FoodProvider
): Promise<ChannelOption | null> {
  try {
    const mockAddressId = "addr_home";
    const restaurants = await foodProvider.searchRestaurants(mockAddressId, intent.dishName);
    if (restaurants.length === 0) return null;

    // Pick best restaurant (first result — already sorted by relevance)
    const restaurant = restaurants[0];
    const menu = await foodProvider.getMenu(mockAddressId, restaurant.restaurantId);

    // Find menu items matching the dish
    const lower = intent.dishName.toLowerCase();
    const matchingItems = menu.filter(m =>
      m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase())
    );
    const relevantItems = matchingItems.length > 0 ? matchingItems : menu.slice(0, 3);

    // Build cart with first matching item
    const mainItem = relevantItems[0];
    const quantity = Math.max(1, Math.ceil(intent.servings / 2));
    const cartItems = [{ itemId: mainItem.itemId, quantity }];
    const cart = await foodProvider.updateCart(
      restaurant.restaurantId, cartItems, mockAddressId
    );

    // Try best coupon
    const coupons = await foodProvider.fetchCoupons(restaurant.restaurantId, mockAddressId);
    const applicable = coupons
      .filter(c => !c.requiresOnlinePayment && cart.subtotal >= c.minOrderValue)
      .sort((a, b) => {
        const discA = a.discountType === "flat" ? a.discountValue : Math.min((cart.subtotal * a.discountValue) / 100, a.maxDiscount);
        const discB = b.discountType === "flat" ? b.discountValue : Math.min((cart.subtotal * b.discountValue) / 100, b.maxDiscount);
        return discB - discA;
      });

    let finalCart = cart;
    if (applicable.length > 0) {
      try {
        finalCart = await foodProvider.applyCoupon(applicable[0].couponCode, mockAddressId);
      } catch { /* coupon failed, use cart without */ }
    }

    const details: OrderItDetails = {
      type: "order",
      restaurant,
      menuItems: relevantItems.slice(0, 5),
      cart: finalCart,
      deliveryMin: restaurant.deliveryTimeMin,
    };

    return {
      channel: "food",
      available: true,
      score: 0,
      cost: finalCart.total,
      timeMin: restaurant.deliveryTimeMin,
      healthScore: getDishHealth(intent.dishName),
      details,
      recommended: false,
      reasonShort: "",
    };
  } catch {
    return null;
  }
}

async function queryDineOut(
  intent: FoodIntent,
  dineoutProvider: DineoutProvider
): Promise<ChannelOption | null> {
  try {
    // Chandigarh coords as default
    const lat = 30.7333;
    const lng = 76.7794;

    // Search by cuisine matching the dish
    const venues = await dineoutProvider.searchVenues(intent.dishName, lat, lng, "CUISINE");
    if (venues.length === 0) return null;

    const venue = venues[0];
    const today = new Date().toISOString().split("T")[0];
    const slots = await dineoutProvider.getAvailableSlots(venue.restaurantId, today, lat, lng);

    // Find next available dinner slot with free deal
    const freeSlots = slots.filter(s =>
      s.deals.some(d => d.isFree && d.bookingPrice === 0)
    );

    if (freeSlots.length === 0) return null;
    const nextSlot = freeSlots[0];

    const estimatedBill = Math.round((venue.costForTwo / 2) * intent.servings);
    const travelMin = getDineoutTravelTime(2.5); // assume ~2.5km average
    const offerText = venue.offers.length > 0 ? venue.offers[0] : undefined;

    const details: DineOutDetails = {
      type: "dineout",
      venue,
      nextSlot,
      estimatedBill,
      travelMin,
      offerText,
    };

    return {
      channel: "dineout",
      available: true,
      score: 0,
      cost: estimatedBill,
      timeMin: travelMin,
      healthScore: getDishHealth(intent.dishName),
      details,
      recommended: false,
      reasonShort: "",
    };
  } catch {
    return null;
  }
}

export async function decide(
  intent: FoodIntent,
  persona: Persona,
  instamartProvider: InstamartProvider,
  foodProvider: FoodProvider,
  dineoutProvider: DineoutProvider
): Promise<DecisionResult> {
  // Query all 3 channels in parallel
  const [cookResult, orderResult, dineoutResult] = await Promise.allSettled([
    queryCookIt(intent, instamartProvider),
    queryOrderIt(intent, foodProvider),
    queryDineOut(intent, dineoutProvider),
  ]);

  const options: ChannelOption[] = [];

  if (cookResult.status === "fulfilled" && cookResult.value) {
    options.push(cookResult.value);
  }
  if (orderResult.status === "fulfilled" && orderResult.value) {
    options.push(orderResult.value);
  }
  if (dineoutResult.status === "fulfilled" && dineoutResult.value) {
    options.push(dineoutResult.value);
  }

  const ranked = rankOptions(options, intent, persona);

  return {
    intent,
    options: ranked,
    bestOption: ranked.length > 0 ? ranked[0].channel : "food",
    timestamp: new Date().toISOString(),
  };
}
