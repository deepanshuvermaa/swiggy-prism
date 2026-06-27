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
  let dishName = "";
  let bestMatchLen = 0;
  for (const dish of KNOWN_DISHES) {
    if (lower.includes(dish) && dish.length > bestMatchLen) {
      dishName = dish;
      bestMatchLen = dish.length;
    }
  }
  // If no known dish matched, extract meaningful words
  if (bestMatchLen === 0) {
    const cleaned = lower
      .replace(/\b(i\s+want|give\s+me|make\s+me|something|for|people|persons?|budget|under|rs|rupees?|₹|min|minutes?|hrs?|hours?|quick|fast|date|night|party|family|casual|veg|non-?veg|healthy|cheap|good)\b/g, "")
      .replace(/\d+/g, "")
      .replace(/[,.\-]/g, " ")
      .trim();
    if (cleaned.length > 2) {
      dishName = cleaned.split(/\s+/).slice(0, 3).join(" ");
    }
  }
  // If still empty (e.g. "something quick"), pick a sensible default based on context
  if (!dishName) {
    if (/\b(quick|fast|hurry)\b/.test(lower)) dishName = "fried rice";
    else if (/\b(healthy)\b/.test(lower)) dishName = "dal tadka";
    else if (/\b(date|romantic)\b/.test(lower)) dishName = "pasta";
    else if (/\b(party|celebration)\b/.test(lower)) dishName = "biryani";
    else dishName = "thali"; // generic fallback
  }

  // Extract servings: "for 4", "4 people", "4 persons"
  const servingsMatch = lower.match(/(?:for\s+)?(\d+)\s*(?:people|persons?|pax|guests?|servings?)/);
  const forMatch = lower.match(/for\s+(\d+)/);
  const servings = servingsMatch
    ? parseInt(servingsMatch[1])
    : forMatch
      ? parseInt(forMatch[1])
      : 2;

  // Extract time constraint FIRST — so "30 min" doesn't become budget=30
  let timeConstraintMin: number | undefined;
  const timeMatch = lower.match(/(\d+)\s*(?:min(?:utes?)?)/);
  const hourMatch = lower.match(/(\d+)\s*(?:hrs?|hours?)/);
  if (timeMatch) {
    timeConstraintMin = parseInt(timeMatch[1]);
  } else if (hourMatch) {
    timeConstraintMin = parseInt(hourMatch[1]) * 60;
  }

  // Strip time expressions before budget parsing so "30 min" isn't treated as ₹30
  const textWithoutTime = lower
    .replace(/(?:under|within|in)\s+\d+\s*(?:min(?:utes?)?|hrs?|hours?)/g, "")
    .replace(/\d+\s*(?:min(?:utes?)?|hrs?|hours?)/g, "");

  // Extract budget: "₹800", "rs 800", "budget 800", "under 800"
  let budget = 800; // default
  const budgetPatterns = [
    /(?:₹|rs\.?\s*|rupees?\s*|budget\s*[:=]?\s*)(\d{2,5})/i,
    /(\d{3,5})\s*(?:₹|rs|rupees?|budget)/i,
    /under\s+(?:₹|rs\.?\s*)?(\d{3,5})/i,
  ];
  for (const pattern of budgetPatterns) {
    const m = textWithoutTime.match(pattern);
    if (m) {
      budget = parseInt(m[1]);
      break;
    }
  }
  // Fallback: find largest 3-5 digit number (must be ≥100 to avoid time values)
  if (budget === 800) {
    const numbers = textWithoutTime.match(/\b(\d{3,5})\b/g);
    if (numbers) {
      const largest = Math.max(...numbers.map(Number));
      if (largest >= 100 && largest <= 50000) budget = largest;
    }
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
