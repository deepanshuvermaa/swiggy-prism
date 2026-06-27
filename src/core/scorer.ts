import type { ChannelOption, FoodIntent, Persona } from "../types/index.js";

/**
 * Persona-driven multi-factor scorer.
 * Each persona has different weights AND behavioral modifiers
 * that shift recommendations based on context, not just raw numbers.
 */

const PERSONA_WEIGHTS: Record<Persona, { cost: number; time: number; health: number; experience: number }> = {
  foodie:    { cost: 0.10, time: 0.15, health: 0.10, experience: 0.65 },
  gymfreak:  { cost: 0.10, time: 0.10, health: 0.65, experience: 0.15 },
  balanced:  { cost: 0.25, time: 0.25, health: 0.25, experience: 0.25 },
  budget:    { cost: 0.55, time: 0.15, health: 0.10, experience: 0.20 },
};

// Persona-specific bonuses/penalties per channel
const PERSONA_CHANNEL_BIAS: Record<Persona, Record<string, number>> = {
  foodie: {
    dineout: 12,    // foodies love dining out — premium experience
    food: 5,        // ordering from top restaurants is also good
    instamart: -5,  // cooking is less exciting unless it's a specialty dish
  },
  gymfreak: {
    instamart: 15,  // cooking gives macro control
    food: -5,       // restaurant food is often calorie-heavy
    dineout: -8,    // dining out = no portion control
  },
  balanced: {
    instamart: 3,   // slight preference for home cooking
    food: 0,
    dineout: 0,
  },
  budget: {
    instamart: 18,  // cooking is always cheapest
    food: -8,       // delivery fees + restaurant markup
    dineout: -12,   // dining out is most expensive
  },
};

function scoreCost(cost: number, budget: number): number {
  if (budget <= 0) return 50;
  const ratio = cost / budget;
  if (ratio <= 0.5) return 100;    // under half budget = perfect
  if (ratio <= 0.75) return 85;    // well under budget
  if (ratio <= 1.0) return 70;     // within budget
  if (ratio <= 1.2) return 40;     // slightly over
  return Math.max(0, 20 - (ratio - 1.2) * 50); // way over
}

function scoreTime(timeMin: number, maxTime: number): number {
  if (maxTime <= 0) maxTime = 120;
  if (timeMin <= 15) return 100;   // instant
  if (timeMin <= 30) return 85;    // fast
  if (timeMin <= 45) return 70;    // reasonable
  if (timeMin <= 60) return 55;    // ok
  return Math.max(0, 40 - (timeMin - 60) / 2);
}

function scoreExperience(option: ChannelOption, intent: FoodIntent): number {
  const d = option.details;

  if (d.type === "cook") {
    // Cooking experience depends on complexity and occasion
    let base = 45;
    if (d.cookTimeMin <= 20) base += 10; // quick recipes are more appealing
    if (intent.servings <= 2) base += 5; // cooking for few is easier
    if (intent.occasion === "family") base += 15; // family loves home-cooked
    return Math.min(100, base);
  }

  if (d.type === "order") {
    // Restaurant quality matters
    const ratingBonus = (d.restaurant.rating - 3.5) * 20; // 3.5★ = baseline
    let base = 60 + ratingBonus;
    if (d.cart.discount > 0) base += 8; // discounts improve experience
    if (intent.occasion === "quick") base += 10; // delivery is great for quick
    return Math.min(100, Math.max(0, base));
  }

  if (d.type === "dineout") {
    const ratingBonus = (d.venue.rating - 3.5) * 15;
    let base = 75 + ratingBonus;
    if (intent.occasion === "date") base += 20;   // perfect for dates
    if (intent.occasion === "party") base += 15;   // great for parties
    if (d.offerText) base += 5;                     // offers sweeten the deal
    return Math.min(100, Math.max(0, base));
  }

  return 50;
}

function scoreHealth(option: ChannelOption, persona: Persona): number {
  let base = option.healthScore;

  // Cooking at home is always healthier (portion control, fresh ingredients)
  if (option.details.type === "cook") {
    base = Math.min(100, base + 12);
  }

  // Gym freaks get a protein bonus for cook options
  if (persona === "gymfreak" && option.details.type === "cook") {
    base = Math.min(100, base + 8);
  }

  // Restaurant food tends to be heavier
  if (option.details.type === "order") {
    base = Math.max(0, base - 5);
  }

  return base;
}

function generateReason(
  option: ChannelOption,
  scores: { cost: number; time: number; health: number; experience: number },
  persona: Persona,
  intent: FoodIntent
): string {
  const d = option.details;
  const channel = d.type === "cook" ? "Cook at home" : d.type === "order" ? "Order delivery" : "Dine out";

  // Find the dominant factor
  const factors = [
    { name: "cost", score: scores.cost, label: "" },
    { name: "time", score: scores.time, label: "" },
    { name: "health", score: scores.health, label: "" },
    { name: "experience", score: scores.experience, label: "" },
  ].sort((a, b) => b.score - a.score);

  const best = factors[0].name;

  // Persona-aware reason generation
  if (persona === "budget") {
    if (d.type === "cook" && scores.cost >= 70) return `${channel} — saves ₹${Math.round(intent.budget * 0.4)} vs ordering`;
    if (scores.cost >= 80) return `${channel} — best value at ₹${option.cost}`;
    return `${channel} — ${scores.cost >= 60 ? "within budget" : "slightly over budget"}`;
  }

  if (persona === "gymfreak") {
    if (d.type === "cook") return `${channel} — full macro control, health score ${option.healthScore}`;
    if (scores.health >= 70) return `${channel} — healthier option, ${option.healthScore}/100`;
    return `${channel} — convenient, watch portions`;
  }

  if (persona === "foodie") {
    if (d.type === "dineout") return `${channel} — premium dining experience`;
    if (d.type === "order" && scores.experience >= 70) return `${channel} — top-rated restaurant`;
    if (d.type === "cook") return `${channel} — homemade flavor, save ₹${Math.round(intent.budget * 0.3)}`;
    return `${channel} — great taste option`;
  }

  // Balanced — highlight the best factor
  if (best === "cost") return `${channel} — best value for money`;
  if (best === "time") return `${channel} — fastest at ${option.timeMin} min`;
  if (best === "health") return `${channel} — healthiest choice`;
  if (best === "experience") return `${channel} — best overall experience`;
  return `${channel} — good balance`;
}

export function scoreOption(
  option: ChannelOption,
  intent: FoodIntent,
  persona: Persona
): ChannelOption {
  const weights = PERSONA_WEIGHTS[persona] ?? PERSONA_WEIGHTS.balanced;
  const maxTime = intent.timeConstraintMin ?? 120;
  const channelBias = PERSONA_CHANNEL_BIAS[persona]?.[option.channel] ?? 0;

  const scores = {
    cost: scoreCost(option.cost, intent.budget),
    time: scoreTime(option.timeMin, maxTime),
    health: scoreHealth(option, persona),
    experience: scoreExperience(option, intent),
  };

  // Weighted base score
  let score = Math.round(
    scores.cost * weights.cost +
    scores.time * weights.time +
    scores.health * weights.health +
    scores.experience * weights.experience
  );

  // Apply persona-specific channel bias
  score = Math.max(0, Math.min(100, score + channelBias));

  // Occasion-specific adjustments
  if (intent.occasion === "quick") {
    if (option.timeMin > 45) score = Math.max(0, score - 15);
    if (option.timeMin <= 20) score = Math.min(100, score + 10);
  }
  if (intent.occasion === "date" && option.details.type === "cook" && intent.servings <= 2) {
    score = Math.max(0, score - 10); // cooking for a date is less romantic
  }
  if (intent.occasion === "party" && option.details.type === "cook" && intent.servings > 6) {
    score = Math.max(0, score - 12); // cooking for 6+ is stressful
  }

  // Budget overflow penalty (applies to all personas but harder for budget)
  if (option.cost > intent.budget) {
    const overflowPct = (option.cost - intent.budget) / intent.budget;
    const penalty = persona === "budget" ? overflowPct * 30 : overflowPct * 15;
    score = Math.max(0, Math.round(score - penalty));
  }

  const reasonShort = generateReason(option, scores, persona, intent);

  return { ...option, score, reasonShort, healthScore: scores.health };
}

export function rankOptions(
  options: ChannelOption[],
  intent: FoodIntent,
  persona: Persona
): ChannelOption[] {
  const scored = options.map(o => scoreOption(o, intent, persona));
  scored.sort((a, b) => b.score - a.score);

  // Mark only the top as recommended
  for (const o of scored) o.recommended = false;
  if (scored.length > 0) scored[0].recommended = true;

  return scored;
}
