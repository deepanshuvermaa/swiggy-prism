import type { Ingredient, IngredientCategory, IngredientPriority, ParserConfig } from "../types/index.js";

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
  prawn: "protein",
  dal: "protein",
  lentil: "protein",
  rajma: "protein",
  chole: "protein",
  soya: "protein",
  milk: "dairy",
  cream: "dairy",
  curd: "dairy",
  yogurt: "dairy",
  butter: "dairy",
  cheese: "dairy",
  ghee: "oil_fat",
  oil: "oil_fat",
  rice: "grain",
  atta: "grain",
  flour: "grain",
  maida: "grain",
  bread: "grain",
  roti: "grain",
  pasta: "grain",
  noodle: "grain",
  rava: "grain",
  sooji: "grain",
  oats: "grain",
  besan: "grain",
  onion: "vegetable",
  tomato: "vegetable",
  potato: "vegetable",
  garlic: "vegetable",
  ginger: "vegetable",
  capsicum: "vegetable",
  carrot: "vegetable",
  peas: "vegetable",
  spinach: "vegetable",
  palak: "vegetable",
  cauliflower: "vegetable",
  brinjal: "vegetable",
  beans: "vegetable",
  cabbage: "vegetable",
  cucumber: "vegetable",
  lemon: "vegetable",
  mint: "vegetable",
  coriander_leaves: "vegetable",
  salt: "spice",
  turmeric: "spice",
  cumin: "spice",
  coriander: "spice",
  chili: "spice",
  chilli: "spice",
  pepper: "spice",
  garam_masala: "spice",
  cinnamon: "spice",
  cardamom: "spice",
  clove: "spice",
  bay: "spice",
  mustard_seed: "spice",
  fennel: "spice",
  kasuri: "spice",
  sugar: "condiment",
  jaggery: "condiment",
  honey: "condiment",
  ketchup: "condiment",
  soy_sauce: "condiment",
  vinegar: "condiment",
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

interface RawIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export async function parseRecipe(
  prompt: string,
  servings?: number,
  config: ParserConfig = DEFAULT_CONFIG
): Promise<Ingredient[]> {
  const userMessage = servings
    ? `${prompt} (for ${servings} servings)`
    : prompt;

  const raw = await callLLMWithRetry(userMessage, config, 2);
  const parsed = extractIngredientArray(raw);

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

function extractIngredientArray(raw: string): RawIngredient[] {
  let text = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // sometimes LLM wraps in extra text — try to find the array
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("LLM response contains no JSON array");
    data = JSON.parse(match[0]);
  }

  // handle object wrapper: { "ingredients": [...] }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const values = Object.values(data as Record<string, unknown>);
    const arr = values.find((v) => Array.isArray(v));
    if (arr) data = arr;
  }

  if (!Array.isArray(data)) {
    throw new Error("LLM response is not an array");
  }

  // validate each item has required fields
  return data.map((item: unknown, i: number) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid ingredient at index ${i}`);
    }
    const obj = item as Record<string, unknown>;
    if (typeof obj.name !== "string" || typeof obj.quantity !== "number" || typeof obj.unit !== "string") {
      throw new Error(`Ingredient at index ${i} missing required fields`);
    }
    return { name: obj.name, quantity: obj.quantity, unit: obj.unit };
  });
}

function inferCategory(name: string): IngredientCategory {
  const normalized = name.toLowerCase().replace(/\s+/g, "_");

  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(keyword)) return category;
  }

  return "other";
}

async function callLLMWithRetry(prompt: string, config: ParserConfig, retries: number): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callLLM(prompt, config);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI(prompt: string, config: ParserConfig): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
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

    return text;
  } finally {
    clearTimeout(timeout);
  }
}
