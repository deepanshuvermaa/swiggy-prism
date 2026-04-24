import type { Ingredient, IngredientCategory, IngredientPriority, ParserConfig } from "../types";

const DEFAULT_CONFIG: ParserConfig = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  maxTokens: 1024,
  temperature: 0.2,
};

const CATEGORY_MAP: Record<string, IngredientCategory> = {
  chicken: "protein",
  paneer: "protein",
  mutton: "protein",
  fish: "protein",
  egg: "protein",
  dal: "protein",
  milk: "dairy",
  cream: "dairy",
  curd: "dairy",
  butter: "dairy",
  ghee: "oil_fat",
  oil: "oil_fat",
  rice: "grain",
  atta: "grain",
  flour: "grain",
  bread: "grain",
  onion: "vegetable",
  tomato: "vegetable",
  potato: "vegetable",
  garlic: "vegetable",
  ginger: "vegetable",
  salt: "spice",
  turmeric: "spice",
  cumin: "spice",
  coriander: "spice",
  chili: "spice",
  garam_masala: "spice",
};

const PRIORITY_BY_CATEGORY: Record<IngredientCategory, IngredientPriority> = {
  protein: "essential",
  grain: "essential",
  vegetable: "essential",
  dairy: "important",
  oil_fat: "important",
  spice: "optional",
  condiment: "optional",
  other: "optional",
};

const SYSTEM_PROMPT = `You are an ingredient extraction engine. Given a recipe description or meal plan, extract every ingredient with its quantity and unit.

Respond ONLY with a JSON array. Each element:
{"name": "ingredient name", "quantity": number, "unit": "g|kg|ml|l|pcs|tbsp|tsp|cup"}

Rules:
- Normalize units (e.g., "a pinch" = 1g, "1 cup" = 240ml for liquids)
- If servings are mentioned, scale quantities accordingly
- Include cooking staples only if explicitly mentioned (salt, oil, etc.)
- Use lowercase names
- No explanations, just the JSON array`;

export async function parseRecipe(
  prompt: string,
  servings?: number,
  config: ParserConfig = DEFAULT_CONFIG
): Promise<Ingredient[]> {
  const userMessage = servings
    ? `${prompt} (for ${servings} servings)`
    : prompt;

  const raw = await callLLM(userMessage, config);
  const parsed = JSON.parse(raw) as Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;

  return parsed.map((item) => {
    const category = inferCategory(item.name);
    return {
      name: item.name.toLowerCase().trim(),
      quantity: item.quantity,
      unit: item.unit,
      category,
      priority: PRIORITY_BY_CATEGORY[category],
    };
  });
}

function inferCategory(name: string): IngredientCategory {
  const normalized = name.toLowerCase().replace(/\s+/g, "_");

  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(keyword)) return category;
  }

  return "other";
}

async function callLLM(prompt: string, config: ParserConfig): Promise<string> {
  if (config.provider === "gemini") {
    return callGemini(prompt, config);
  }
  return callOpenAI(prompt, config);
}

async function callGemini(prompt: string, config: ParserConfig): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Ready. Send me a recipe." }] },
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: config.temperature,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  // strip markdown code fences if present
  return text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
}

async function callOpenAI(prompt: string, config: ParserConfig): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");

  return text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
}
