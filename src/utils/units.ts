// normalize everything to base units: grams and milliliters

const TO_GRAMS: Record<string, number> = {
  g: 1,
  gm: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
};

const TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  l: 1000,
  liter: 1000,
  litre: 1000,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const PIECE_UNITS = new Set(["pcs", "pc", "piece", "pieces", "nos", "no"]);

export interface NormalizedQuantity {
  quantity: number;
  unit: string; // "g", "ml", or "pcs"
}

export function normalize(quantity: number, unit: string): NormalizedQuantity {
  const u = unit.toLowerCase().trim();

  if (TO_GRAMS[u] !== undefined) {
    return { quantity: quantity * TO_GRAMS[u], unit: "g" };
  }

  if (TO_ML[u] !== undefined) {
    return { quantity: quantity * TO_ML[u], unit: "ml" };
  }

  if (PIECE_UNITS.has(u)) {
    return { quantity, unit: "pcs" };
  }

  // unknown unit — pass through as-is
  return { quantity, unit: u };
}

export function convertToUnit(quantity: number, fromUnit: string, toUnit: string): number {
  const from = normalize(quantity, fromUnit);
  const to = normalize(1, toUnit);

  if (from.unit !== to.unit) {
    // can't convert across types (g to ml), return original
    return quantity;
  }

  return from.quantity / to.quantity;
}
