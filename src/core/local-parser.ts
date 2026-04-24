import type { Ingredient, IngredientCategory, IngredientPriority } from "../types/index.js";

// keyword-based recipe parser — no API key needed
// maps common Indian recipe names to typical ingredient lists

const RECIPE_DB: Record<string, Array<{ name: string; quantity: number; unit: string }>> = {
  "butter chicken": [
    { name: "chicken", quantity: 500, unit: "g" },
    { name: "butter", quantity: 50, unit: "g" },
    { name: "onion", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 300, unit: "g" },
    { name: "cream", quantity: 100, unit: "ml" },
    { name: "ginger garlic paste", quantity: 30, unit: "g" },
    { name: "garam masala", quantity: 10, unit: "g" },
    { name: "turmeric", quantity: 5, unit: "g" },
    { name: "red chili powder", quantity: 10, unit: "g" },
    { name: "kasuri methi", quantity: 5, unit: "g" },
    { name: "curd", quantity: 100, unit: "g" },
    { name: "oil", quantity: 30, unit: "ml" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "paneer tikka": [
    { name: "paneer", quantity: 400, unit: "g" },
    { name: "curd", quantity: 200, unit: "g" },
    { name: "capsicum", quantity: 150, unit: "g" },
    { name: "onion", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 100, unit: "g" },
    { name: "ginger garlic paste", quantity: 20, unit: "g" },
    { name: "red chili powder", quantity: 10, unit: "g" },
    { name: "garam masala", quantity: 5, unit: "g" },
    { name: "lemon", quantity: 2, unit: "pcs" },
    { name: "oil", quantity: 30, unit: "ml" },
  ],
  "biryani": [
    { name: "basmati rice", quantity: 500, unit: "g" },
    { name: "chicken", quantity: 500, unit: "g" },
    { name: "onion", quantity: 300, unit: "g" },
    { name: "curd", quantity: 150, unit: "g" },
    { name: "tomato", quantity: 200, unit: "g" },
    { name: "ginger garlic paste", quantity: 30, unit: "g" },
    { name: "green chili", quantity: 20, unit: "g" },
    { name: "mint leaves", quantity: 20, unit: "g" },
    { name: "coriander leaves", quantity: 20, unit: "g" },
    { name: "ghee", quantity: 30, unit: "ml" },
    { name: "biryani masala", quantity: 15, unit: "g" },
    { name: "oil", quantity: 50, unit: "ml" },
    { name: "salt", quantity: 15, unit: "g" },
  ],
  "dal tadka": [
    { name: "toor dal", quantity: 250, unit: "g" },
    { name: "onion", quantity: 150, unit: "g" },
    { name: "tomato", quantity: 150, unit: "g" },
    { name: "garlic", quantity: 20, unit: "g" },
    { name: "cumin seeds", quantity: 5, unit: "g" },
    { name: "turmeric", quantity: 5, unit: "g" },
    { name: "red chili powder", quantity: 5, unit: "g" },
    { name: "ghee", quantity: 20, unit: "ml" },
    { name: "coriander leaves", quantity: 10, unit: "g" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "chole bhature": [
    { name: "chana dal", quantity: 300, unit: "g" },
    { name: "onion", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 200, unit: "g" },
    { name: "ginger garlic paste", quantity: 20, unit: "g" },
    { name: "maida refined flour", quantity: 300, unit: "g" },
    { name: "curd", quantity: 50, unit: "g" },
    { name: "oil", quantity: 200, unit: "ml" },
    { name: "cumin seeds", quantity: 5, unit: "g" },
    { name: "garam masala", quantity: 10, unit: "g" },
    { name: "red chili powder", quantity: 10, unit: "g" },
    { name: "salt", quantity: 15, unit: "g" },
  ],
  "aloo gobi": [
    { name: "potato", quantity: 300, unit: "g" },
    { name: "cauliflower", quantity: 1, unit: "pcs" },
    { name: "onion", quantity: 150, unit: "g" },
    { name: "tomato", quantity: 150, unit: "g" },
    { name: "ginger", quantity: 10, unit: "g" },
    { name: "turmeric", quantity: 5, unit: "g" },
    { name: "cumin seeds", quantity: 5, unit: "g" },
    { name: "coriander powder", quantity: 10, unit: "g" },
    { name: "oil", quantity: 30, unit: "ml" },
    { name: "green chili", quantity: 10, unit: "g" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "egg curry": [
    { name: "eggs", quantity: 8, unit: "pcs" },
    { name: "onion", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 200, unit: "g" },
    { name: "ginger garlic paste", quantity: 20, unit: "g" },
    { name: "turmeric", quantity: 5, unit: "g" },
    { name: "red chili powder", quantity: 10, unit: "g" },
    { name: "garam masala", quantity: 5, unit: "g" },
    { name: "oil", quantity: 30, unit: "ml" },
    { name: "coriander leaves", quantity: 10, unit: "g" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "palak paneer": [
    { name: "paneer", quantity: 250, unit: "g" },
    { name: "spinach", quantity: 500, unit: "g" },
    { name: "onion", quantity: 100, unit: "g" },
    { name: "tomato", quantity: 100, unit: "g" },
    { name: "garlic", quantity: 15, unit: "g" },
    { name: "ginger", quantity: 10, unit: "g" },
    { name: "cream", quantity: 50, unit: "ml" },
    { name: "cumin seeds", quantity: 5, unit: "g" },
    { name: "garam masala", quantity: 5, unit: "g" },
    { name: "oil", quantity: 20, unit: "ml" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "rajma": [
    { name: "rajma", quantity: 250, unit: "g" },
    { name: "onion", quantity: 200, unit: "g" },
    { name: "tomato", quantity: 200, unit: "g" },
    { name: "ginger garlic paste", quantity: 20, unit: "g" },
    { name: "cumin seeds", quantity: 5, unit: "g" },
    { name: "turmeric", quantity: 5, unit: "g" },
    { name: "red chili powder", quantity: 10, unit: "g" },
    { name: "garam masala", quantity: 5, unit: "g" },
    { name: "oil", quantity: 30, unit: "ml" },
    { name: "salt", quantity: 10, unit: "g" },
    { name: "basmati rice", quantity: 400, unit: "g" },
  ],
  "sandwich": [
    { name: "bread", quantity: 400, unit: "g" },
    { name: "butter", quantity: 50, unit: "g" },
    { name: "tomato", quantity: 150, unit: "g" },
    { name: "onion", quantity: 100, unit: "g" },
    { name: "cucumber", quantity: 100, unit: "g" },
    { name: "capsicum", quantity: 100, unit: "g" },
    { name: "cheese", quantity: 100, unit: "g" },
    { name: "salt", quantity: 5, unit: "g" },
    { name: "black pepper", quantity: 5, unit: "g" },
  ],
  "pasta": [
    { name: "penne pasta", quantity: 250, unit: "g" },
    { name: "tomato", quantity: 300, unit: "g" },
    { name: "onion", quantity: 100, unit: "g" },
    { name: "garlic", quantity: 15, unit: "g" },
    { name: "capsicum", quantity: 100, unit: "g" },
    { name: "olive oil", quantity: 30, unit: "ml" },
    { name: "cheese", quantity: 100, unit: "g" },
    { name: "black pepper", quantity: 5, unit: "g" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "fried rice": [
    { name: "basmati rice", quantity: 400, unit: "g" },
    { name: "onion", quantity: 100, unit: "g" },
    { name: "carrot", quantity: 100, unit: "g" },
    { name: "capsicum", quantity: 100, unit: "g" },
    { name: "beans french", quantity: 50, unit: "g" },
    { name: "eggs", quantity: 3, unit: "pcs" },
    { name: "soy sauce", quantity: 20, unit: "ml" },
    { name: "oil", quantity: 30, unit: "ml" },
    { name: "green chili", quantity: 10, unit: "g" },
    { name: "salt", quantity: 10, unit: "g" },
  ],
  "omelette": [
    { name: "eggs", quantity: 4, unit: "pcs" },
    { name: "onion", quantity: 50, unit: "g" },
    { name: "tomato", quantity: 50, unit: "g" },
    { name: "green chili", quantity: 10, unit: "g" },
    { name: "coriander leaves", quantity: 10, unit: "g" },
    { name: "butter", quantity: 20, unit: "g" },
    { name: "salt", quantity: 5, unit: "g" },
    { name: "black pepper", quantity: 3, unit: "g" },
  ],
  "maggi": [
    { name: "noodles hakka", quantity: 300, unit: "g" },
    { name: "onion", quantity: 50, unit: "g" },
    { name: "tomato", quantity: 50, unit: "g" },
    { name: "capsicum", quantity: 50, unit: "g" },
    { name: "butter", quantity: 20, unit: "g" },
    { name: "green peas", quantity: 30, unit: "g" },
  ],
};

const CATEGORY_MAP: Record<string, IngredientCategory> = {
  chicken: "protein", paneer: "protein", mutton: "protein", fish: "protein",
  egg: "protein", prawn: "protein", dal: "protein", lentil: "protein",
  rajma: "protein", chana: "protein",
  milk: "dairy", cream: "dairy", curd: "dairy", yogurt: "dairy",
  butter: "dairy", cheese: "dairy", ghee: "oil_fat", oil: "oil_fat",
  olive: "oil_fat",
  rice: "grain", atta: "grain", flour: "grain", maida: "grain",
  bread: "grain", pasta: "grain", noodle: "grain", rava: "grain", oats: "grain",
  onion: "vegetable", tomato: "vegetable", potato: "vegetable",
  garlic: "vegetable", ginger: "vegetable", capsicum: "vegetable",
  carrot: "vegetable", peas: "vegetable", spinach: "vegetable",
  cauliflower: "vegetable", beans: "vegetable", cucumber: "vegetable",
  lemon: "vegetable", mint: "vegetable", coriander: "vegetable",
  salt: "spice", turmeric: "spice", cumin: "spice", chili: "spice",
  chilli: "spice", pepper: "spice", masala: "spice", cinnamon: "spice",
  cardamom: "spice", kasuri: "spice", biryani: "spice",
  sugar: "condiment", soy: "condiment", vinegar: "condiment",
  ketchup: "condiment", honey: "condiment",
};

const PRIORITY_MAP: Record<IngredientCategory, IngredientPriority> = {
  protein: "essential", grain: "essential", vegetable: "essential",
  dairy: "important", oil_fat: "important",
  spice: "optional", condiment: "optional", other: "optional",
};

function inferCategory(name: string): IngredientCategory {
  const lower = name.toLowerCase().replace(/\s+/g, "_");
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "other";
}

export function localParseRecipe(prompt: string, servings?: number): Ingredient[] {
  const lower = prompt.toLowerCase();

  // find best matching recipe
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const recipeName of Object.keys(RECIPE_DB)) {
    const tokens = recipeName.split(/\s+/);
    const score = tokens.filter((t) => lower.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = recipeName;
    }
  }

  // extract servings from prompt like "for 4" or "for 5 people"
  const servingsMatch = lower.match(/for\s+(\d+)/);
  const targetServings = servings ?? (servingsMatch ? parseInt(servingsMatch[1], 10) : 2);
  const baseServings = 2;
  const scale = targetServings / baseServings;

  let rawIngredients: Array<{ name: string; quantity: number; unit: string }>;

  if (bestMatch && bestScore > 0) {
    rawIngredients = RECIPE_DB[bestMatch].map((ing) => ({
      ...ing,
      quantity: Math.round(ing.quantity * scale),
    }));
  } else {
    // fallback — generic grocery list
    rawIngredients = [
      { name: "onion", quantity: Math.round(200 * scale), unit: "g" },
      { name: "tomato", quantity: Math.round(200 * scale), unit: "g" },
      { name: "potato", quantity: Math.round(300 * scale), unit: "g" },
      { name: "rice", quantity: Math.round(500 * scale), unit: "g" },
      { name: "oil", quantity: 30, unit: "ml" },
      { name: "salt", quantity: 10, unit: "g" },
      { name: "turmeric", quantity: 5, unit: "g" },
    ];
  }

  return rawIngredients.map((ing) => {
    const category = inferCategory(ing.name);
    return {
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category,
      priority: PRIORITY_MAP[category],
    };
  });
}
