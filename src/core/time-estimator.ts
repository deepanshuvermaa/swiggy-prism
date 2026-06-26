/**
 * Cook time estimates (minutes) for known dishes.
 * Used by the decision engine to compare cook-at-home vs order vs dine-out.
 */
const COOK_TIME_DB: Record<string, number> = {
  "butter chicken": 45,
  "paneer tikka": 30,
  biryani: 60,
  "dal tadka": 25,
  "chole bhature": 40,
  "aloo gobi": 30,
  "egg curry": 25,
  "palak paneer": 30,
  rajma: 35,
  sandwich: 10,
  pasta: 20,
  "fried rice": 20,
  omelette: 10,
  maggi: 10,
  "dal makhani": 40,
  "chicken tikka": 35,
  "mutton rogan josh": 55,
  "fish curry": 30,
  "veg biryani": 50,
  "paneer butter masala": 35,
  "kadhai paneer": 30,
  "malai kofta": 45,
  "naan": 15,
  "paratha": 20,
};

const DEFAULT_COOK_TIME = 40;
const INSTAMART_DELIVERY_MIN = 10;

export function getCookTime(dishName: string): number {
  const lower = dishName.toLowerCase();
  for (const [key, time] of Object.entries(COOK_TIME_DB)) {
    if (lower.includes(key) || key.includes(lower)) return time;
  }
  return DEFAULT_COOK_TIME;
}

export function getGroceryDeliveryTime(): number {
  return INSTAMART_DELIVERY_MIN;
}

export function getTotalCookTime(dishName: string): number {
  return getGroceryDeliveryTime() + getCookTime(dishName);
}

export function getDineoutTravelTime(distanceKm: number): number {
  // Rough estimate: 4 min per km in city traffic
  return Math.round(distanceKm * 4);
}
