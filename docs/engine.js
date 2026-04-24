// Swiggy Prism Engine — self-contained browser bundle
// Ported from TypeScript sources: local-parser.ts, catalog.ts, optimizer.ts, mock.ts, units.ts
// No imports, no require — pure browser JS

(function () {
  "use strict";

  // ─── Unit Normalization (from utils/units.ts) ────────────────────────────────

  var TO_GRAMS = {
    g: 1, gm: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000,
  };

  var TO_ML = {
    ml: 1, milliliter: 1,
    l: 1000, liter: 1000, litre: 1000,
    cup: 240, tbsp: 15, tsp: 5,
  };

  var PIECE_UNITS = new Set(["pcs", "pc", "piece", "pieces", "nos", "no"]);

  function normalize(quantity, unit) {
    var u = unit.toLowerCase().trim();

    if (TO_GRAMS[u] !== undefined) {
      return { quantity: quantity * TO_GRAMS[u], unit: "g" };
    }
    if (TO_ML[u] !== undefined) {
      return { quantity: quantity * TO_ML[u], unit: "ml" };
    }
    if (PIECE_UNITS.has(u)) {
      return { quantity: quantity, unit: "pcs" };
    }
    return { quantity: quantity, unit: u };
  }

  // ─── Recipe Database (from core/local-parser.ts) ─────────────────────────────

  var RECIPE_DB = {
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

  // ─── Category & Priority Maps (from core/local-parser.ts) ────────────────────

  var CATEGORY_MAP = {
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

  var PRIORITY_MAP = {
    protein: "essential", grain: "essential", vegetable: "essential",
    dairy: "important", oil_fat: "important",
    spice: "optional", condiment: "optional", other: "optional",
  };

  function inferCategory(name) {
    var lower = name.toLowerCase().replace(/\s+/g, "_");
    var keys = Object.keys(CATEGORY_MAP);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1) return CATEGORY_MAP[keys[i]];
    }
    return "other";
  }

  // ─── Local Recipe Parser (from core/local-parser.ts) ─────────────────────────

  function localParseRecipe(prompt, servings) {
    var lower = prompt.toLowerCase();

    // find best matching recipe
    var bestMatch = null;
    var bestScore = 0;
    var recipeNames = Object.keys(RECIPE_DB);

    for (var r = 0; r < recipeNames.length; r++) {
      var recipeName = recipeNames[r];
      var tokens = recipeName.split(/\s+/);
      var score = 0;
      for (var t = 0; t < tokens.length; t++) {
        if (lower.indexOf(tokens[t]) !== -1) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = recipeName;
      }
    }

    // extract servings from prompt like "for 4" or "for 5 people"
    var servingsMatch = lower.match(/for\s+(\d+)/);
    var targetServings = servings != null ? servings : (servingsMatch ? parseInt(servingsMatch[1], 10) : 2);
    var baseServings = 2;
    var scale = targetServings / baseServings;

    var rawIngredients;

    if (bestMatch && bestScore > 0) {
      rawIngredients = RECIPE_DB[bestMatch].map(function (ing) {
        return {
          name: ing.name,
          quantity: Math.round(ing.quantity * scale),
          unit: ing.unit,
        };
      });
    } else {
      // fallback -- generic grocery list
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

    return rawIngredients.map(function (ing) {
      var category = inferCategory(ing.name);
      return {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: category,
        priority: PRIORITY_MAP[category],
      };
    });
  }

  // ─── Instamart Catalog (from mcp/catalog.ts) — 80+ SKUs ─────────────────────

  var INSTAMART_CATALOG = [
    // protein
    { skuId: "SKU-CHK-001", name: "chicken breast", brand: "FreshToHome", price: 249, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-CHK-002", name: "chicken curry cut", brand: "Licious", price: 199, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-CHK-003", name: "chicken thigh boneless", brand: "FreshToHome", price: 279, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-PNR-001", name: "paneer block", brand: "Amul", price: 90, quantity: 200, unit: "g", inStock: true },
    { skuId: "SKU-PNR-002", name: "paneer cubes", brand: "Mother Dairy", price: 110, quantity: 200, unit: "g", inStock: true },
    { skuId: "SKU-MTN-001", name: "mutton curry cut", brand: "Licious", price: 599, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-EGG-001", name: "eggs white", brand: "Fresho", price: 79, quantity: 6, unit: "pcs", inStock: true },
    { skuId: "SKU-EGG-002", name: "eggs brown country", brand: "Eggoz", price: 119, quantity: 6, unit: "pcs", inStock: true },
    { skuId: "SKU-FSH-001", name: "fish rohu steaks", brand: "FreshToHome", price: 219, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-DAL-001", name: "toor dal", brand: "Tata Sampann", price: 135, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-DAL-002", name: "moong dal yellow", brand: "Fortune", price: 125, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-DAL-003", name: "chana dal", brand: "Tata Sampann", price: 99, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-DAL-004", name: "masoor dal", brand: "Fortune", price: 89, quantity: 500, unit: "g", inStock: true },

    // dairy
    { skuId: "SKU-MLK-001", name: "milk toned", brand: "Amul", price: 30, quantity: 500, unit: "ml", inStock: true },
    { skuId: "SKU-MLK-002", name: "milk full cream", brand: "Amul", price: 35, quantity: 500, unit: "ml", inStock: true },
    { skuId: "SKU-CRM-001", name: "fresh cream", brand: "Amul", price: 45, quantity: 200, unit: "ml", inStock: true },
    { skuId: "SKU-CRD-001", name: "curd", brand: "Mother Dairy", price: 42, quantity: 400, unit: "g", inStock: true },
    { skuId: "SKU-CRD-002", name: "greek yogurt", brand: "Epigamia", price: 65, quantity: 200, unit: "g", inStock: true },
    { skuId: "SKU-BTR-001", name: "butter salted", brand: "Amul", price: 56, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-BTR-002", name: "butter unsalted", brand: "Amul", price: 56, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-CHS-001", name: "cheese slices", brand: "Amul", price: 120, quantity: 200, unit: "g", inStock: true },
    { skuId: "SKU-GHE-001", name: "ghee", brand: "Amul", price: 290, quantity: 500, unit: "ml", inStock: true },
    { skuId: "SKU-GHE-002", name: "cow ghee", brand: "Patanjali", price: 265, quantity: 500, unit: "ml", inStock: true },

    // vegetables
    { skuId: "SKU-ONI-001", name: "onion", brand: "Fresho", price: 35, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-TOM-001", name: "tomato", brand: "Fresho", price: 30, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-TOM-002", name: "tomato hybrid", brand: "Fresho", price: 40, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-POT-001", name: "potato", brand: "Fresho", price: 29, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-GRL-001", name: "garlic", brand: "Fresho", price: 15, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-GNG-001", name: "ginger", brand: "Fresho", price: 12, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-GPC-001", name: "green chili", brand: "Fresho", price: 10, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-COR-001", name: "coriander leaves", brand: "Fresho", price: 10, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-CPS-001", name: "capsicum green", brand: "Fresho", price: 22, quantity: 250, unit: "g", inStock: true },
    { skuId: "SKU-SPH-001", name: "spinach", brand: "Fresho", price: 18, quantity: 250, unit: "g", inStock: true },
    { skuId: "SKU-MNT-001", name: "mint leaves", brand: "Fresho", price: 10, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-LMN-001", name: "lemon", brand: "Fresho", price: 8, quantity: 4, unit: "pcs", inStock: true },
    { skuId: "SKU-CRY-001", name: "carrot", brand: "Fresho", price: 25, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-BNS-001", name: "beans french", brand: "Fresho", price: 29, quantity: 250, unit: "g", inStock: true },
    { skuId: "SKU-PEA-001", name: "green peas", brand: "Fresho", price: 45, quantity: 250, unit: "g", inStock: true },
    { skuId: "SKU-CAU-001", name: "cauliflower", brand: "Fresho", price: 30, quantity: 1, unit: "pcs", inStock: true },
    { skuId: "SKU-BRJ-001", name: "brinjal", brand: "Fresho", price: 22, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-LDY-001", name: "lady finger", brand: "Fresho", price: 25, quantity: 250, unit: "g", inStock: true },
    { skuId: "SKU-CUC-001", name: "cucumber", brand: "Fresho", price: 15, quantity: 500, unit: "g", inStock: true },

    // grains
    { skuId: "SKU-RCE-001", name: "basmati rice", brand: "India Gate", price: 199, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-RCE-002", name: "sona masoori rice", brand: "Daawat", price: 159, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-ATA-001", name: "whole wheat atta", brand: "Aashirvaad", price: 235, quantity: 5000, unit: "g", inStock: true },
    { skuId: "SKU-ATA-002", name: "multigrain atta", brand: "Aashirvaad", price: 275, quantity: 5000, unit: "g", inStock: true },
    { skuId: "SKU-BRD-001", name: "white bread", brand: "Harvest Gold", price: 40, quantity: 400, unit: "g", inStock: true },
    { skuId: "SKU-BRD-002", name: "brown bread", brand: "Harvest Gold", price: 50, quantity: 400, unit: "g", inStock: true },
    { skuId: "SKU-OAT-001", name: "rolled oats", brand: "Quaker", price: 120, quantity: 400, unit: "g", inStock: true },
    { skuId: "SKU-PST-001", name: "penne pasta", brand: "Barilla", price: 99, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-NDL-001", name: "noodles hakka", brand: "Ching's", price: 40, quantity: 150, unit: "g", inStock: true },
    { skuId: "SKU-RVA-001", name: "rava sooji", brand: "Pillsbury", price: 52, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-PST-002", name: "maida refined flour", brand: "Pillsbury", price: 38, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-BSN-001", name: "besan gram flour", brand: "Rajdhani", price: 70, quantity: 500, unit: "g", inStock: true },

    // oils
    { skuId: "SKU-OIL-001", name: "sunflower oil", brand: "Fortune", price: 135, quantity: 1000, unit: "ml", inStock: true },
    { skuId: "SKU-OIL-002", name: "mustard oil", brand: "Fortune", price: 165, quantity: 1000, unit: "ml", inStock: true },
    { skuId: "SKU-OIL-003", name: "olive oil extra virgin", brand: "Figaro", price: 349, quantity: 500, unit: "ml", inStock: true },
    { skuId: "SKU-OIL-004", name: "refined oil soybean", brand: "Fortune", price: 115, quantity: 1000, unit: "ml", inStock: true },
    { skuId: "SKU-COO-001", name: "coconut oil", brand: "Parachute", price: 112, quantity: 500, unit: "ml", inStock: true },

    // spices
    { skuId: "SKU-SLT-001", name: "salt iodized", brand: "Tata", price: 22, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-TRM-001", name: "turmeric powder", brand: "MDH", price: 45, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-RCH-001", name: "red chili powder", brand: "MDH", price: 55, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-CUM-001", name: "cumin seeds", brand: "MDH", price: 75, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-CUM-002", name: "cumin powder", brand: "Everest", price: 60, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-COR-002", name: "coriander powder", brand: "MDH", price: 42, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-GAR-001", name: "garam masala", brand: "MDH", price: 68, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-GAR-002", name: "garam masala", brand: "Everest", price: 72, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-BKC-001", name: "black pepper whole", brand: "Tata Sampann", price: 89, quantity: 50, unit: "g", inStock: true },
    { skuId: "SKU-MST-001", name: "mustard seeds", brand: "MDH", price: 28, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-CLV-001", name: "cloves", brand: "Tata Sampann", price: 95, quantity: 50, unit: "g", inStock: true },
    { skuId: "SKU-CRD-003", name: "cardamom green", brand: "Tata Sampann", price: 140, quantity: 50, unit: "g", inStock: true },
    { skuId: "SKU-BAY-001", name: "bay leaves", brand: "MDH", price: 30, quantity: 25, unit: "g", inStock: true },
    { skuId: "SKU-CIN-001", name: "cinnamon sticks", brand: "MDH", price: 65, quantity: 50, unit: "g", inStock: true },
    { skuId: "SKU-KSR-001", name: "kasuri methi", brand: "MDH", price: 35, quantity: 25, unit: "g", inStock: true },
    { skuId: "SKU-KMR-001", name: "kashmiri red chili powder", brand: "Everest", price: 68, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-FNS-001", name: "fennel seeds saunf", brand: "MDH", price: 38, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-AJW-001", name: "ajwain carom seeds", brand: "MDH", price: 32, quantity: 100, unit: "g", inStock: true },

    // condiments
    { skuId: "SKU-KTC-001", name: "tomato ketchup", brand: "Kissan", price: 99, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-SOY-001", name: "soy sauce", brand: "Ching's", price: 55, quantity: 200, unit: "ml", inStock: true },
    { skuId: "SKU-VNG-001", name: "white vinegar", brand: "Sil", price: 32, quantity: 200, unit: "ml", inStock: true },
    { skuId: "SKU-GGP-001", name: "ginger garlic paste", brand: "Sil", price: 45, quantity: 200, unit: "g", inStock: true },
    { skuId: "SKU-TCM-001", name: "tandoori chicken masala", brand: "MDH", price: 48, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-BCM-001", name: "butter chicken masala", brand: "MDH", price: 48, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-BPM-001", name: "biryani masala", brand: "MDH", price: 52, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-PMX-001", name: "pav bhaji masala", brand: "Everest", price: 45, quantity: 100, unit: "g", inStock: true },
    { skuId: "SKU-SGR-001", name: "sugar", brand: "Uttam", price: 44, quantity: 1000, unit: "g", inStock: true },
    { skuId: "SKU-JGR-001", name: "jaggery", brand: "Miltop", price: 75, quantity: 500, unit: "g", inStock: true },
    { skuId: "SKU-HNY-001", name: "honey", brand: "Dabur", price: 199, quantity: 500, unit: "g", inStock: true },
  ];

  // ─── Mock MCP Search (from mcp/mock.ts) ──────────────────────────────────────

  function searchSKUs(query, limit) {
    if (limit == null) limit = 10;

    var tokens = query.toLowerCase().split(/\s+/);
    var scored = [];

    for (var i = 0; i < INSTAMART_CATALOG.length; i++) {
      var sku = INSTAMART_CATALOG[i];
      if (!sku.inStock) continue;

      var skuText = (sku.name + " " + sku.brand).toLowerCase();
      var hits = 0;
      for (var t = 0; t < tokens.length; t++) {
        if (skuText.indexOf(tokens[t]) !== -1) hits++;
      }
      if (hits > 0) {
        scored.push({ sku: sku, score: hits });
      }
    }

    scored.sort(function (a, b) { return b.score - a.score; });
    var results = [];
    for (var j = 0; j < Math.min(scored.length, limit); j++) {
      results.push(scored[j].sku);
    }
    return results;
  }

  // ─── Optimizer internals (from core/optimizer.ts) ────────────────────────────

  var DEFAULT_CONFIG = {
    minBudget: 50,
    maxBudget: 50000,
    priorityWeights: {
      essential: 3,
      important: 2,
      optional: 1,
    },
  };

  function convertQuantity(ingredient, sku) {
    var need = normalize(ingredient.quantity, ingredient.unit);
    var have = normalize(sku.quantity, sku.unit);

    if (need.unit === have.unit) {
      return need.quantity / have.quantity;
    }
    // incompatible units (e.g., grams vs pcs) -- assume 1 unit needed
    return 1;
  }

  function findBestSKU(ingredient, skus) {
    if (skus.length === 0) return null;

    var bestSku = null;
    var bestScore = -1;

    for (var i = 0; i < skus.length; i++) {
      var sku = skus[i];
      if (!sku.inStock) continue;

      var score = 0;

      // name similarity
      var ingredientTokens = ingredient.name.toLowerCase().split(/\s+/);
      var skuTokens = sku.name.toLowerCase().split(/\s+/);
      var overlap = 0;
      for (var t = 0; t < ingredientTokens.length; t++) {
        if (skuTokens.indexOf(ingredientTokens[t]) !== -1) overlap++;
      }
      score += (overlap / ingredientTokens.length) * 50;

      // unit compatibility bonus
      var needUnit = normalize(1, ingredient.unit).unit;
      var skuUnit = normalize(1, sku.unit).unit;
      if (needUnit === skuUnit) score += 20;

      // value score
      var pricePerUnit = sku.price / sku.quantity;
      score += 30 / (1 + pricePerUnit);

      if (score > bestScore) {
        bestScore = score;
        bestSku = sku;
      }
    }

    return bestSku ? { sku: bestSku, score: bestScore } : null;
  }

  function computeValue(ingredient, matchScore, config) {
    var priorityWeight = config.priorityWeights[ingredient.priority];
    return matchScore * priorityWeight;
  }

  function knapsack(items, budget) {
    var n = items.length;
    if (n === 0) return [];

    // for large budgets, use coarser granularity to keep memory sane
    var scale = budget > 10000 ? 10 : 1;
    var W = Math.floor(budget / scale);

    var dp = [];
    for (var row = 0; row <= n; row++) {
      dp[row] = new Array(W + 1);
      for (var c = 0; c <= W; c++) dp[row][c] = 0;
    }

    for (var i = 1; i <= n; i++) {
      var cost = Math.ceil(items[i - 1].cost / scale);
      var val = items[i - 1].value;

      for (var w = 0; w <= W; w++) {
        dp[i][w] = dp[i - 1][w];
        if (cost <= w && dp[i - 1][w - cost] + val > dp[i][w]) {
          dp[i][w] = dp[i - 1][w - cost] + val;
        }
      }
    }

    var selected = [];
    var ww = W;

    for (var j = n; j > 0; j--) {
      if (dp[j][ww] !== dp[j - 1][ww]) {
        selected.push(items[j - 1]);
        ww -= Math.ceil(items[j - 1].cost / scale);
      }
    }

    return selected;
  }

  function _optimizeCart(ingredients, skuMap, budget, config) {
    if (!config) config = DEFAULT_CONFIG;

    if (budget < config.minBudget || budget > config.maxBudget) {
      throw new Error(
        "Budget must be between \u20B9" + config.minBudget + " and \u20B9" + config.maxBudget
      );
    }

    var startTime = performance.now();
    var totalSkusEvaluated = 0;

    var candidates = [];

    for (var i = 0; i < ingredients.length; i++) {
      var ingredient = ingredients[i];
      var skus = skuMap.get(ingredient.name) || [];
      totalSkusEvaluated += skus.length;

      var bestMatch = findBestSKU(ingredient, skus);
      if (!bestMatch) continue;

      var neededQty = convertQuantity(ingredient, bestMatch.sku);
      var count = Math.max(1, Math.ceil(neededQty));
      var cost = bestMatch.sku.price * count;
      var value = computeValue(ingredient, bestMatch.score, config);

      candidates.push({
        ingredient: ingredient,
        sku: bestMatch.sku,
        matchScore: bestMatch.score,
        count: count,
        cost: cost,
        value: value,
      });
    }

    var selected = knapsack(candidates, budget);

    var selectedNames = new Set(selected.map(function (s) { return s.ingredient.name; }));
    var droppedItems = ingredients.filter(function (ing) { return !selectedNames.has(ing.name); });

    var items = selected.map(function (s) {
      return {
        ingredient: s.ingredient,
        sku: s.sku,
        matchScore: s.matchScore,
        count: s.count,
        totalPrice: s.cost,
      };
    });

    var totalCost = 0;
    for (var k = 0; k < items.length; k++) {
      totalCost += items[k].totalPrice;
    }

    return {
      items: items,
      totalCost: totalCost,
      budget: budget,
      budgetUtilization: Math.round((totalCost / budget) * 100) / 100,
      droppedItems: droppedItems,
      meta: {
        algorithmUsed: "knapsack",
        optimizationTimeMs: Math.round(performance.now() - startTime),
        totalSkusEvaluated: totalSkusEvaluated,
      },
    };
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  window.PrismEngine = {
    /**
     * Parse a recipe prompt into an array of ingredient objects.
     * Same output format as POST /api/parse  -> response.ingredients
     *
     * @param {string} prompt - e.g. "butter chicken for 4"
     * @param {number} [servings] - optional override
     * @returns {{ name, quantity, unit, category, priority }[]}
     */
    parseRecipe: function (prompt, servings) {
      return localParseRecipe(prompt, servings);
    },

    /**
     * Optimize a cart given ingredients and budget.
     * Handles SKU search internally using the embedded catalog.
     * Same output format as POST /api/optimize -> response.cart
     *
     * @param {Array} ingredients - array from parseRecipe()
     * @param {number} budget - budget in INR
     * @returns {OptimizedCart} { items, totalCost, budget, budgetUtilization, droppedItems, meta }
     */
    optimizeCart: function (ingredients, budget) {
      // build SKU map by searching the catalog for each ingredient
      var skuMap = new Map();
      for (var i = 0; i < ingredients.length; i++) {
        var ing = ingredients[i];
        var skus = searchSKUs(ing.name);
        skuMap.set(ing.name, skus);
      }
      return _optimizeCart(ingredients, skuMap, budget);
    },

    // expose internals for advanced usage / debugging
    _searchSKUs: searchSKUs,
    _catalog: INSTAMART_CATALOG,
    _recipeDB: RECIPE_DB,
  };
})();
