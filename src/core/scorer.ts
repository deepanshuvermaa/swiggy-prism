import type { ChannelOption, FoodIntent, Persona } from "../types/index.js";

const PERSONA_WEIGHTS: Record<Persona, { cost: number; time: number; health: number; experience: number }> = {
  foodie:    { cost: 0.15, time: 0.20, health: 0.15, experience: 0.50 },
  gymfreak:  { cost: 0.15, time: 0.15, health: 0.55, experience: 0.15 },
  balanced:  { cost: 0.25, time: 0.25, health: 0.25, experience: 0.25 },
  budget:    { cost: 0.50, time: 0.15, health: 0.15, experience: 0.20 },
};

function scoreCost(cost: number, budget: number): number {
  if (budget <= 0) return 50;
  const ratio = cost / budget;
  return Math.max(0, Math.min(100, 100 - ratio * 100));
}

function scoreTime(timeMin: number, maxTime: number): number {
  if (maxTime <= 0) return 50;
  return Math.max(0, Math.min(100, 100 - (timeMin / maxTime) * 100));
}

function scoreExperience(option: ChannelOption): number {
  const d = option.details;
  if (d.type === "cook") return 40;
  if (d.type === "order") return Math.min(100, 60 + d.restaurant.rating * 5);
  if (d.type === "dineout") return Math.min(100, 80 + d.venue.rating * 4);
  return 50;
}

export function scoreOption(
  option: ChannelOption,
  intent: FoodIntent,
  persona: Persona
): ChannelOption {
  const weights = PERSONA_WEIGHTS[persona] ?? PERSONA_WEIGHTS.balanced;
  const maxTime = intent.timeConstraintMin ?? 120;

  const costScore = scoreCost(option.cost, intent.budget);
  const timeScore = scoreTime(option.timeMin, maxTime);
  const healthScore = option.healthScore;
  let experienceScore = scoreExperience(option);

  // Occasion overrides
  if (intent.occasion === "quick" && option.details.type === "cook") {
    experienceScore = Math.max(0, experienceScore - 20);
  }
  if (intent.occasion === "date" && option.details.type === "dineout") {
    experienceScore = Math.min(100, experienceScore + 20);
  }
  if (intent.occasion === "party" && intent.servings > 6 && option.details.type === "cook") {
    experienceScore = Math.max(0, experienceScore - 15);
  }

  const score = Math.round(
    costScore * weights.cost +
    timeScore * weights.time +
    healthScore * weights.health +
    experienceScore * weights.experience
  );

  // Generate short reason
  let reasonShort = "";
  if (costScore >= 70 && costScore >= timeScore) reasonShort = "Best value for money";
  else if (timeScore >= 70) reasonShort = "Fastest option";
  else if (healthScore >= 70) reasonShort = "Healthiest choice";
  else if (experienceScore >= 70) reasonShort = "Best experience";
  else reasonShort = "Good balance";

  if (option.details.type === "cook") reasonShort = `Cook at home — ${reasonShort.toLowerCase()}`;
  if (option.details.type === "order") reasonShort = `Order delivery — ${reasonShort.toLowerCase()}`;
  if (option.details.type === "dineout") reasonShort = `Dine out — ${reasonShort.toLowerCase()}`;

  return { ...option, score, reasonShort };
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
