import type { FoodIntent } from "../types/index.js";

/**
 * Known dish names for matching. Combines existing RECIPE_DB names
 * with popular restaurant dishes to cover both cook and order paths.
 */
const KNOWN_DISHES = [
  "butter chicken",
  "paneer tikka",
  "biryani",
  "chicken biryani",
  "veg biryani",
  "dal tadka",
  "dal makhani",
  "chole bhature",
  "aloo gobi",
  "egg curry",
  "palak paneer",
  "rajma",
  "sandwich",
  "pasta",
  "fried rice",
  "omelette",
  "maggi",
  "paneer butter masala",
  "kadhai paneer",
  "chicken tikka",
  "mutton rogan josh",
  "fish curry",
  "malai kofta",
  "naan",
  "paratha",
  "dosa",
  "idli",
  "pizza",
  "burger",
  "momos",
  "noodles",
  "thali",
  "kebab",
  "tandoori chicken",
  "manchurian",
];

/**
 * Parse natural language input into a structured FoodIntent.
 * Extracts: dish name, servings, budget, time constraint, occasion, dietary prefs.
 */
export function parseIntent(text: string): FoodIntent {
  const lower = text.toLowerCase().trim();

  // Extract dish name — find best matching known dish
  let dishName = "butter chicken"; // fallback
  let bestMatchLen = 0;
  for (const dish of KNOWN_DISHES) {
    if (lower.includes(dish) && dish.length > bestMatchLen) {
      dishName = dish;
      bestMatchLen = dish.length;
    }
  }
  // If no known dish matched, use first meaningful words as dish name
  if (bestMatchLen === 0) {
    const cleaned = lower
      .replace(/\b(for|people|persons?|budget|under|rs|rupees?|₹|min|minutes?|hrs?|hours?|quick|fast|date|night|party|family|casual|veg|non-?veg)\b/g, "")
      .replace(/\d+/g, "")
      .replace(/[,.\-]/g, " ")
      .trim();
    if (cleaned.length > 0) {
      dishName = cleaned.split(/\s+/).slice(0, 3).join(" ");
    }
  }

  // Extract servings: "for 4", "4 people", "4 persons"
  const servingsMatch = lower.match(/(?:for\s+)?(\d+)\s*(?:people|persons?|pax|guests?|servings?)/);
  const forMatch = lower.match(/for\s+(\d+)/);
  const servings = servingsMatch
    ? parseInt(servingsMatch[1])
    : forMatch
      ? parseInt(forMatch[1])
      : 2;

  // Extract budget: "₹800", "rs 800", "budget 800", "under 800", or largest 3-5 digit number
  let budget = 800; // default
  const budgetPatterns = [
    /(?:₹|rs\.?\s*|rupees?\s*|budget\s*[:=]?\s*|under\s+)(\d{2,5})/i,
    /(\d{3,5})\s*(?:₹|rs|rupees?|budget)/i,
  ];
  for (const pattern of budgetPatterns) {
    const m = lower.match(pattern);
    if (m) {
      budget = parseInt(m[1]);
      break;
    }
  }
  // Fallback: find largest 3-5 digit number if no budget keyword matched
  if (budget === 800) {
    const numbers = lower.match(/\b(\d{3,5})\b/g);
    if (numbers) {
      const largest = Math.max(...numbers.map(Number));
      if (largest >= 100 && largest <= 50000) budget = largest;
    }
  }

  // Extract time constraint: "45 min", "30 minutes", "1 hour"
  let timeConstraintMin: number | undefined;
  const timeMatch = lower.match(/(\d+)\s*(?:min(?:utes?)?)/);
  const hourMatch = lower.match(/(\d+)\s*(?:hrs?|hours?)/);
  if (timeMatch) {
    timeConstraintMin = parseInt(timeMatch[1]);
  } else if (hourMatch) {
    timeConstraintMin = parseInt(hourMatch[1]) * 60;
  }

  // Infer occasion from keywords
  let occasion: FoodIntent["occasion"];
  if (/\b(date|romantic|anniversary|special)\b/.test(lower)) occasion = "date";
  else if (/\b(party|celebration|gathering|group)\b/.test(lower)) occasion = "party";
  else if (/\b(family|kids|home)\b/.test(lower)) occasion = "family";
  else if (/\b(quick|fast|hurry|rush|asap)\b/.test(lower)) occasion = "quick";
  else occasion = "casual";

  // Extract dietary preferences
  const dietaryPrefs: string[] = [];
  if (/\bnon[\s-]?veg\b/.test(lower)) dietaryPrefs.push("non-veg");
  else if (/\bveg\b/.test(lower)) dietaryPrefs.push("veg");
  if (/\bjain\b/.test(lower)) dietaryPrefs.push("jain");
  if (/\begg[\s-]?free\b/.test(lower)) dietaryPrefs.push("egg-free");

  return {
    dishName,
    servings,
    budget,
    timeConstraintMin,
    occasion,
    dietaryPrefs: dietaryPrefs.length > 0 ? dietaryPrefs : undefined,
  };
}
