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
  instamartProvider: InstamartProvider,
  pantryItems: string[] = []
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

    // Deduplicate ingredients (e.g. "ginger" + "ginger garlic paste" → keep only one)
    const seen = new Set<string>();
    ingredients = ingredients.filter(ing => {
      const key = ing.name.toLowerCase().split(/\s+/)[0]; // first word as key
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out pantry items
    if (pantryItems.length > 0) {
      const pantrySet = pantryItems.map(p => p.toLowerCase());
      const before = ingredients.length;
      ingredients = ingredients.filter(ing => {
        const name = ing.name.toLowerCase();
        return !pantrySet.some(p => name.includes(p) || p.includes(name));
      });
      if (before > ingredients.length) console.log('[Cook] Skipped', before - ingredients.length, 'pantry items');
    }

    // Search SKUs for top ingredients only (essentials + important) for speed
    const topIngredients = ingredients
      .filter(i => i.priority === 'essential' || i.priority === 'important')
      .slice(0, 6);
    // Fall back to all if none are prioritized
    const searchIngredients = topIngredients.length > 0 ? topIngredients : ingredients.slice(0, 6);

    const skuMap = new Map<string, Awaited<ReturnType<typeof instamartProvider.searchSKUs>>>();
    // Search in parallel for speed
    const skuResults = await Promise.allSettled(
      searchIngredients.map(async (ing) => {
        const skus = await instamartProvider.searchSKUs(ing.name, 3);
        return { name: ing.name, skus };
      })
    );
    for (const result of skuResults) {
      if (result.status === 'fulfilled') {
        skuMap.set(result.value.name, result.value.skus);
      }
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
  } catch (err) {
    console.error('[DEBUG Cook] queryCookIt failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function queryOrderIt(
  intent: FoodIntent,
  foodProvider: FoodProvider
): Promise<ChannelOption | null> {
  try {
    // Search restaurants for this dish
    const restaurants = await foodProvider.searchRestaurants("", intent.dishName);
    if (restaurants.length === 0) return null;

    // Pick best open restaurant
    const restaurant = restaurants.find(r => r.availabilityStatus === "OPEN") ?? restaurants[0];

    // Estimate cost from costForTwo (from search results) — avoid extra menu/cart calls for speed
    const costPerPerson = restaurant.deliveryFee ? (restaurant.deliveryFee * 2 + 200) : 300;
    const estimatedCost = Math.round((costPerPerson / 2) * intent.servings + (restaurant.deliveryFee || 40));

    // Parse offer/discount from restaurant data
    let discount = 0;
    const offerText = (restaurant as any).offer ?? '';
    const offerMatch = String(offerText).match(/₹(\d+)/);
    if (offerMatch) discount = parseInt(offerMatch[1]);

    const details: OrderItDetails = {
      type: "order",
      restaurant,
      menuItems: [],
      cart: {
        restaurantId: restaurant.restaurantId,
        restaurantName: restaurant.name,
        items: [],
        subtotal: estimatedCost,
        deliveryFee: restaurant.deliveryFee || 40,
        appliedCoupon: undefined,
        discount,
        total: Math.max(0, estimatedCost - discount),
        estimatedDeliveryMin: restaurant.deliveryTimeMin,
      },
      deliveryMin: restaurant.deliveryTimeMin,
    };

    return {
      channel: "food",
      available: true,
      score: 0,
      cost: details.cart.total,
      timeMin: restaurant.deliveryTimeMin,
      healthScore: getDishHealth(intent.dishName),
      details,
      recommended: false,
      reasonShort: "",
    };
  } catch (err) {
    console.error('[DEBUG Order] queryOrderIt failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function queryDineOut(
  intent: FoodIntent,
  dineoutProvider: DineoutProvider
): Promise<ChannelOption | null> {
  try {
    // Search venues — dineout accepts addressId OR lat/lng
    // Pass 0,0 as lat/lng — the dineout client will use addressId if available
    const venues = await dineoutProvider.searchVenues(intent.dishName, 0, 0, "CUISINE");
    if (venues.length === 0) return null;

    const venue = venues[0];

    // Try to get slots, but don't fail if unavailable (needs lat/lng which we may not have)
    let nextSlot: any = null;
    try {
      const today = new Date().toISOString().split("T")[0];
      const slots = await dineoutProvider.getAvailableSlots(venue.restaurantId, today, 0, 0);
      const freeSlots = slots.filter(s =>
        s.deals.some(d => d.isFree && d.bookingPrice === 0)
      );
      if (freeSlots.length > 0) nextSlot = freeSlots[0];
    } catch {
      // Slots require lat/lng which we don't have — create a placeholder
    }

    if (!nextSlot) {
      // Create a placeholder slot for display
      const now = new Date();
      nextSlot = {
        dateStr: now.toISOString().split('T')[0],
        reservationTime: Math.floor(now.getTime() / 1000) + 7200,
        displayTime: '7:30 PM',
        slotGroupName: 'Dinner',
        deals: [{ isFree: true, bookingPrice: 0, discountPercentage: 0 }],
      };
    }

    const estimatedBill = Math.round((venue.costForTwo / 2) * intent.servings);
    const travelMin = getDineoutTravelTime(2.5); // assume ~2.5km average
    const rawOffer = venue.offers?.length > 0 ? venue.offers[0] : undefined;
    const offerText = typeof rawOffer === 'string' ? rawOffer : typeof rawOffer === 'object' ? String((rawOffer as any)?.text ?? (rawOffer as any)?.title ?? '') : undefined;

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
  } catch (err) {
    console.error('[DEBUG Dineout] queryDineOut failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function decide(
  intent: FoodIntent,
  persona: Persona,
  instamartProvider: InstamartProvider,
  foodProvider: FoodProvider,
  dineoutProvider: DineoutProvider,
  pantryItems: string[] = []
): Promise<DecisionResult> {
  // Pre-fetch address to avoid race conditions (all channels need it)
  // Food's get_addresses works for all channels
  console.log('[Decision] Starting 3 channel queries for "' + intent.dishName + '"...');
  const [cookResult, orderResult, dineoutResult] = await Promise.allSettled([
    queryCookIt(intent, instamartProvider, pantryItems),
    queryOrderIt(intent, foodProvider),
    queryDineOut(intent, dineoutProvider),
  ]);

  console.log('[Decision] Cook:', cookResult.status, cookResult.status === 'fulfilled' ? (cookResult.value ? 'cost=' + cookResult.value.cost : 'null') : (cookResult as any).reason?.message);
  console.log('[Decision] Order:', orderResult.status, orderResult.status === 'fulfilled' ? (orderResult.value ? 'cost=' + orderResult.value.cost : 'null') : (orderResult as any).reason?.message);
  console.log('[Decision] Dineout:', dineoutResult.status, dineoutResult.status === 'fulfilled' ? (dineoutResult.value ? 'cost=' + dineoutResult.value.cost : 'null') : (dineoutResult as any).reason?.message);

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
