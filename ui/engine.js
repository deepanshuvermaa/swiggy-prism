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

  // ─── Food Catalog (matches search_restaurants / get_restaurant_menu responses) ─

  var FOOD_RESTAURANTS = [
    { restaurantId:"rest_001", name:"Punjab Grill", cuisine:["North Indian","Mughlai"], rating:4.3, ratingCount:1240, deliveryTimeMin:28, deliveryFee:30, distanceKm:2.1, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_002", name:"Biryani Blues", cuisine:["Biryani","Hyderabadi"], rating:4.4, ratingCount:2100, deliveryTimeMin:35, deliveryFee:25, distanceKm:3.2, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_003", name:"Moti Mahal Delux", cuisine:["Mughlai","North Indian"], rating:4.2, ratingCount:890, deliveryTimeMin:32, deliveryFee:30, distanceKm:2.8, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_004", name:"Sagar Ratna", cuisine:["South Indian","Vegetarian"], rating:4.1, ratingCount:1560, deliveryTimeMin:25, deliveryFee:20, distanceKm:1.5, availabilityStatus:"OPEN", isVeg:true },
    { restaurantId:"rest_005", name:"Haldiram's", cuisine:["Street Food","Chaat"], rating:4.0, ratingCount:3200, deliveryTimeMin:20, deliveryFee:15, distanceKm:1.2, availabilityStatus:"OPEN", isVeg:true },
    { restaurantId:"rest_006", name:"Domino's Pizza", cuisine:["Pizza","Italian"], rating:3.9, ratingCount:4500, deliveryTimeMin:30, deliveryFee:0, distanceKm:2.0, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_007", name:"Pasta La Vista", cuisine:["Italian","Continental"], rating:4.2, ratingCount:670, deliveryTimeMin:35, deliveryFee:35, distanceKm:3.5, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_008", name:"Chinese Wok", cuisine:["Chinese","Asian"], rating:4.0, ratingCount:1890, deliveryTimeMin:25, deliveryFee:20, distanceKm:2.3, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_009", name:"The Egg Factory", cuisine:["Egg Specialties","Breakfast"], rating:4.1, ratingCount:560, deliveryTimeMin:22, deliveryFee:20, distanceKm:1.8, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_010", name:"Chaayos", cuisine:["Beverages","Snacks"], rating:3.8, ratingCount:2300, deliveryTimeMin:18, deliveryFee:15, distanceKm:1.0, availabilityStatus:"OPEN", isVeg:true },
    { restaurantId:"rest_011", name:"Wow! Momo", cuisine:["Momos","Street Food"], rating:4.0, ratingCount:1780, deliveryTimeMin:20, deliveryFee:15, distanceKm:1.5, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_012", name:"Behrouz Biryani", cuisine:["Biryani","Mughlai"], rating:4.5, ratingCount:3400, deliveryTimeMin:40, deliveryFee:40, distanceKm:4.0, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_013", name:"Faasos", cuisine:["Wraps","Indian"], rating:3.9, ratingCount:2800, deliveryTimeMin:25, deliveryFee:20, distanceKm:2.0, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_014", name:"Burger King", cuisine:["Burgers","Fast Food"], rating:3.7, ratingCount:4100, deliveryTimeMin:22, deliveryFee:0, distanceKm:1.8, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_015", name:"Subway", cuisine:["Subs","Healthy"], rating:3.8, ratingCount:2900, deliveryTimeMin:20, deliveryFee:0, distanceKm:1.5, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_016", name:"Karim's", cuisine:["Mughlai","Kebabs"], rating:4.4, ratingCount:1100, deliveryTimeMin:38, deliveryFee:35, distanceKm:3.8, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_017", name:"Saravana Bhavan", cuisine:["South Indian","Vegetarian"], rating:4.3, ratingCount:2600, deliveryTimeMin:28, deliveryFee:25, distanceKm:2.2, availabilityStatus:"OPEN", isVeg:true },
    { restaurantId:"rest_018", name:"Barbeque Nation", cuisine:["Grills","Buffet"], rating:4.2, ratingCount:1450, deliveryTimeMin:35, deliveryFee:40, distanceKm:3.0, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_019", name:"Local Dhaba", cuisine:["Home Style","North Indian"], rating:3.6, ratingCount:340, deliveryTimeMin:18, deliveryFee:10, distanceKm:0.8, availabilityStatus:"OPEN", isVeg:false },
    { restaurantId:"rest_020", name:"Cafe Delhi Heights", cuisine:["Continental","Cafe"], rating:4.1, ratingCount:920, deliveryTimeMin:30, deliveryFee:30, distanceKm:2.5, availabilityStatus:"OPEN", isVeg:false },
  ];

  var FOOD_MENU = [
    { itemId:"item_001", restaurantId:"rest_001", name:"Butter Chicken", price:320, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_002", restaurantId:"rest_001", name:"Dal Makhani", price:220, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_003", restaurantId:"rest_001", name:"Paneer Tikka", price:280, isVeg:true, isBestseller:false, category:"Starters" },
    { itemId:"item_004", restaurantId:"rest_001", name:"Chicken Biryani", price:350, isVeg:false, isBestseller:true, category:"Rice" },
    { itemId:"item_005", restaurantId:"rest_001", name:"Naan", price:50, isVeg:true, isBestseller:false, category:"Breads" },
    { itemId:"item_007", restaurantId:"rest_002", name:"Chicken Biryani", price:299, isVeg:false, isBestseller:true, category:"Biryani" },
    { itemId:"item_008", restaurantId:"rest_002", name:"Mutton Biryani", price:449, isVeg:false, isBestseller:true, category:"Biryani" },
    { itemId:"item_009", restaurantId:"rest_002", name:"Veg Biryani", price:199, isVeg:true, isBestseller:false, category:"Biryani" },
    { itemId:"item_012", restaurantId:"rest_003", name:"Butter Chicken", price:340, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_014", restaurantId:"rest_003", name:"Dal Tadka", price:180, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_015", restaurantId:"rest_003", name:"Paneer Butter Masala", price:260, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_017", restaurantId:"rest_004", name:"Masala Dosa", price:160, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_020", restaurantId:"rest_004", name:"Rajma Chawal", price:180, isVeg:true, isBestseller:true, category:"Thali" },
    { itemId:"item_021", restaurantId:"rest_004", name:"Chole Bhature", price:170, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_022", restaurantId:"rest_005", name:"Chole Bhature", price:150, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_024", restaurantId:"rest_005", name:"Palak Paneer", price:200, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_025", restaurantId:"rest_005", name:"Dal Tadka", price:160, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_029", restaurantId:"rest_006", name:"Pasta", price:169, isVeg:true, isBestseller:false, category:"Pasta" },
    { itemId:"item_030", restaurantId:"rest_007", name:"Pasta Arrabiata", price:260, isVeg:true, isBestseller:true, category:"Pasta" },
    { itemId:"item_033", restaurantId:"rest_008", name:"Veg Fried Rice", price:180, isVeg:true, isBestseller:true, category:"Rice" },
    { itemId:"item_034", restaurantId:"rest_008", name:"Chicken Fried Rice", price:220, isVeg:false, isBestseller:true, category:"Rice" },
    { itemId:"item_037", restaurantId:"rest_008", name:"Chilli Chicken", price:250, isVeg:false, isBestseller:true, category:"Starters" },
    { itemId:"item_038", restaurantId:"rest_009", name:"Egg Curry", price:180, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_039", restaurantId:"rest_009", name:"Omelette", price:90, isVeg:false, isBestseller:true, category:"Breakfast" },
    { itemId:"item_042", restaurantId:"rest_010", name:"Maggi", price:99, isVeg:true, isBestseller:true, category:"Snacks" },
    { itemId:"item_043", restaurantId:"rest_010", name:"Sandwich", price:120, isVeg:true, isBestseller:false, category:"Snacks" },
    { itemId:"item_046", restaurantId:"rest_012", name:"Chicken Biryani", price:349, isVeg:false, isBestseller:true, category:"Biryani" },
    { itemId:"item_056", restaurantId:"rest_016", name:"Butter Chicken", price:360, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_057", restaurantId:"rest_016", name:"Mutton Rogan Josh", price:420, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_060", restaurantId:"rest_017", name:"Masala Dosa", price:140, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_062", restaurantId:"rest_017", name:"Palak Paneer", price:190, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_067", restaurantId:"rest_019", name:"Dal Tadka", price:110, isVeg:true, isBestseller:true, category:"Main Course" },
    { itemId:"item_068", restaurantId:"rest_019", name:"Egg Curry", price:130, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_069", restaurantId:"rest_019", name:"Aloo Gobi", price:100, isVeg:true, isBestseller:false, category:"Main Course" },
    { itemId:"item_070", restaurantId:"rest_019", name:"Rajma Chawal", price:120, isVeg:true, isBestseller:true, category:"Thali" },
    { itemId:"item_071", restaurantId:"rest_019", name:"Butter Chicken", price:200, isVeg:false, isBestseller:true, category:"Main Course" },
    { itemId:"item_073", restaurantId:"rest_020", name:"Pasta", price:280, isVeg:true, isBestseller:true, category:"Pasta" },
    { itemId:"item_075", restaurantId:"rest_020", name:"Sandwich", price:240, isVeg:false, isBestseller:false, category:"Snacks" },
  ];

  var FOOD_COUPONS = [
    { couponCode:"WELCOME50", description:"Flat ₹50 off", discountType:"flat", discountValue:50, minOrderValue:199, maxDiscount:50 },
    { couponCode:"PARTY20", description:"20% off up to ₹100", discountType:"percentage", discountValue:20, minOrderValue:500, maxDiscount:100 },
    { couponCode:"SWIGGYIT", description:"10% off up to ₹50", discountType:"percentage", discountValue:10, minOrderValue:149, maxDiscount:50 },
    { couponCode:"FEAST15", description:"15% off up to ₹75", discountType:"percentage", discountValue:15, minOrderValue:400, maxDiscount:75 },
    { couponCode:"MEGA", description:"25% off up to ₹125", discountType:"percentage", discountValue:25, minOrderValue:600, maxDiscount:125 },
  ];

  // ─── Dineout Catalog (matches search_restaurants_dineout responses) ────────────

  var DINEOUT_VENUES = [
    { restaurantId:"din_001", name:"The Great Kabab Factory", cuisine:["Mughlai","North Indian"], rating:4.5, locality:"Connaught Place", costForTwo:1800, offers:["Flat 20% off food bill"], highlights:["Fine Dining","Family"] },
    { restaurantId:"din_002", name:"Farzi Cafe", cuisine:["Modern Indian","Fusion"], rating:4.3, locality:"Cyber Hub", costForTwo:2200, offers:["Complimentary dessert"], highlights:["Trendy","Date Night"] },
    { restaurantId:"din_003", name:"Dhaba by Claridges", cuisine:["North Indian","Punjabi"], rating:4.4, locality:"Connaught Place", costForTwo:1600, offers:["Flat 15% off"], highlights:["Themed","Family"] },
    { restaurantId:"din_004", name:"Mamagoto", cuisine:["Pan Asian","Japanese"], rating:4.2, locality:"Khan Market", costForTwo:1400, offers:[], highlights:["Casual","Friends"] },
    { restaurantId:"din_005", name:"Indian Accent", cuisine:["Fine Indian","Contemporary"], rating:4.7, locality:"The Lodhi", costForTwo:5000, offers:[], highlights:["Premium","Date Night"] },
    { restaurantId:"din_006", name:"Burma Burma", cuisine:["Burmese","Vegetarian"], rating:4.4, locality:"Cyber Hub", costForTwo:1200, offers:["10% off on weekdays"], highlights:["Veg","Casual"] },
    { restaurantId:"din_007", name:"Pind Balluchi", cuisine:["North Indian","Punjabi"], rating:4.0, locality:"Multiple Outlets", costForTwo:1000, offers:["Flat 25% off"], highlights:["Family","Value"] },
    { restaurantId:"din_012", name:"Barbeque Nation", cuisine:["Grill","Buffet"], rating:4.2, locality:"Multiple Outlets", costForTwo:1500, offers:["Kids eat free"], highlights:["Family","Party"] },
    { restaurantId:"din_014", name:"Sattvik", cuisine:["Pure Veg","North Indian"], rating:4.1, locality:"Sector 17", costForTwo:800, offers:["20% off weekday lunch"], highlights:["Veg","Family"] },
    { restaurantId:"din_015", name:"1947", cuisine:["North Indian","Mughlai"], rating:4.3, locality:"Sector 26", costForTwo:1400, offers:["10% off for tables of 4+"], highlights:["Family","Celebrations"] },
  ];

  // ─── Cook Time DB ──────────────────────────────────────────────────────────────

  var COOK_TIME = {
    "butter chicken":45, "paneer tikka":30, biryani:60, "chicken biryani":60,
    "veg biryani":50, "dal tadka":25, "dal makhani":40, "chole bhature":40,
    "aloo gobi":30, "egg curry":25, "palak paneer":30, rajma:35,
    sandwich:10, pasta:20, "fried rice":20, omelette:10, maggi:10,
  };

  var DISH_HEALTH = {
    "butter chicken":55, biryani:50, "chicken biryani":50, "veg biryani":58,
    "dal tadka":72, "dal makhani":60, "paneer tikka":62, "palak paneer":68,
    "chole bhature":45, "aloo gobi":65, "egg curry":60, rajma:70,
    sandwich:55, pasta:50, "fried rice":48, omelette:65, maggi:35,
    pizza:40, burger:38, momos:45, dosa:60,
  };

  // ─── Intent Parser ─────────────────────────────────────────────────────────────

  var KNOWN_DISHES = [
    "butter chicken","paneer tikka","biryani","chicken biryani","veg biryani",
    "dal tadka","dal makhani","chole bhature","aloo gobi","egg curry",
    "palak paneer","rajma","sandwich","pasta","fried rice","omelette","maggi",
    "paneer butter masala","kadhai paneer","chicken tikka","mutton rogan josh",
    "fish curry","pizza","burger","momos","noodles","dosa","idli","thali","kebab",
  ];

  function parseIntent(text) {
    var lower = text.toLowerCase().trim();
    var dishName = "butter chicken";
    var bestLen = 0;
    for (var i = 0; i < KNOWN_DISHES.length; i++) {
      if (lower.indexOf(KNOWN_DISHES[i]) !== -1 && KNOWN_DISHES[i].length > bestLen) {
        dishName = KNOWN_DISHES[i]; bestLen = KNOWN_DISHES[i].length;
      }
    }

    var servings = 2;
    var m = lower.match(/(?:for\s+)?(\d+)\s*(?:people|persons?|pax|guests?|servings?)/);
    if (m) servings = parseInt(m[1]);
    else { m = lower.match(/for\s+(\d+)/); if (m) servings = parseInt(m[1]); }

    var budget = 800;
    m = lower.match(/(?:₹|rs\.?\s*|rupees?\s*|budget\s*[:=]?\s*|under\s+)(\d{2,5})/i);
    if (m) budget = parseInt(m[1]);

    var timeConstraintMin = null;
    m = lower.match(/(\d+)\s*(?:min(?:utes?)?)/);
    if (m) timeConstraintMin = parseInt(m[1]);

    var occasion = "casual";
    if (/\b(date|romantic)\b/.test(lower)) occasion = "date";
    else if (/\b(party|group)\b/.test(lower)) occasion = "party";
    else if (/\b(family|kids)\b/.test(lower)) occasion = "family";
    else if (/\b(quick|fast|hurry)\b/.test(lower)) occasion = "quick";

    return { dishName:dishName, servings:servings, budget:budget, timeConstraintMin:timeConstraintMin, occasion:occasion };
  }

  // ─── Token Score Helper ────────────────────────────────────────────────────────

  function _tokenScore(query, target) {
    var qt = query.toLowerCase().split(/\s+/);
    var tt = target.toLowerCase().split(/\s+/);
    var hits = 0;
    for (var i = 0; i < qt.length; i++) {
      for (var j = 0; j < tt.length; j++) {
        if (tt[j].indexOf(qt[i]) !== -1 || qt[i].indexOf(tt[j]) !== -1) { hits++; break; }
      }
    }
    return qt.length > 0 ? hits / qt.length : 0;
  }

  // ─── Decision Engine (browser-side) ────────────────────────────────────────────

  function getDishHealthScore(name) {
    var lower = name.toLowerCase();
    for (var k in DISH_HEALTH) { if (lower.indexOf(k) !== -1 || k.indexOf(lower) !== -1) return DISH_HEALTH[k]; }
    return 55;
  }

  function getCookTime(name) {
    var lower = name.toLowerCase();
    for (var k in COOK_TIME) { if (lower.indexOf(k) !== -1 || k.indexOf(lower) !== -1) return COOK_TIME[k]; }
    return 40;
  }

  function queryCookIt(intent) {
    var ingredients = localParseRecipe(intent.dishName, intent.servings);
    if (ingredients.length === 0) return null;
    var skuMap = new Map();
    for (var i = 0; i < ingredients.length; i++) {
      skuMap.set(ingredients[i].name, searchSKUs(ingredients[i].name));
    }
    var cart = _optimizeCart(ingredients, skuMap, intent.budget);
    var cookTime = getCookTime(intent.dishName);
    return {
      channel:"instamart", available:true, score:0,
      cost: cart.totalCost, timeMin: cookTime + 10,
      healthScore: Math.min(100, getDishHealthScore(intent.dishName) + 15),
      details: { type:"cook", cart:cart, cookTimeMin:cookTime, groceryDeliveryMin:10, recipeName:intent.dishName },
      recommended:false, reasonShort:""
    };
  }

  function queryOrderIt(intent) {
    var dish = intent.dishName.toLowerCase();
    // Find restaurants with matching menu items
    var matches = [];
    for (var i = 0; i < FOOD_RESTAURANTS.length; i++) {
      var r = FOOD_RESTAURANTS[i];
      if (r.availabilityStatus !== "OPEN") continue;
      var menuItems = FOOD_MENU.filter(function(m) { return m.restaurantId === r.restaurantId; });
      var dishItems = menuItems.filter(function(m) { return m.name.toLowerCase().indexOf(dish) !== -1 || dish.indexOf(m.name.toLowerCase()) !== -1; });
      if (dishItems.length === 0) {
        // try cuisine match
        var cuisineScore = 0;
        for (var c = 0; c < r.cuisine.length; c++) {
          cuisineScore = Math.max(cuisineScore, _tokenScore(dish, r.cuisine[c]));
        }
        if (cuisineScore > 0.3) dishItems = menuItems.slice(0, 2);
      }
      if (dishItems.length > 0) matches.push({ restaurant:r, items:dishItems, menu:menuItems });
    }
    if (matches.length === 0) return null;

    // Pick best match (most relevant items, then by rating)
    matches.sort(function(a,b) { return b.items.length - a.items.length || b.restaurant.rating - a.restaurant.rating; });
    var best = matches[0];
    var mainItem = best.items[0];
    var qty = Math.max(1, Math.ceil(intent.servings / 2));
    var subtotal = mainItem.price * qty;
    var deliveryFee = best.restaurant.deliveryFee;

    // Find best coupon
    var discount = 0;
    var appliedCoupon = null;
    for (var ci = 0; ci < FOOD_COUPONS.length; ci++) {
      var cp = FOOD_COUPONS[ci];
      if (subtotal < cp.minOrderValue) continue;
      var d = cp.discountType === "flat" ? cp.discountValue : Math.min(subtotal * cp.discountValue / 100, cp.maxDiscount);
      if (d > discount) { discount = d; appliedCoupon = cp; }
    }

    var total = Math.round(subtotal + deliveryFee - discount);
    return {
      channel:"food", available:true, score:0,
      cost: total, timeMin: best.restaurant.deliveryTimeMin,
      healthScore: getDishHealthScore(intent.dishName),
      details: {
        type:"order", restaurant:best.restaurant,
        menuItems: best.items.slice(0, 5),
        cart: {
          restaurantId:best.restaurant.restaurantId, restaurantName:best.restaurant.name,
          items:[{menuItem:mainItem, quantity:qty, totalPrice:subtotal}],
          subtotal:subtotal, deliveryFee:deliveryFee,
          appliedCoupon:appliedCoupon, discount:Math.round(discount),
          total:total, estimatedDeliveryMin:best.restaurant.deliveryTimeMin
        },
        deliveryMin: best.restaurant.deliveryTimeMin
      },
      recommended:false, reasonShort:""
    };
  }

  function queryDineOut(intent) {
    var dish = intent.dishName.toLowerCase();
    // Search venues by cuisine match
    var scored = [];
    for (var i = 0; i < DINEOUT_VENUES.length; i++) {
      var v = DINEOUT_VENUES[i];
      var score = 0;
      for (var c = 0; c < v.cuisine.length; c++) {
        score = Math.max(score, _tokenScore(dish, v.cuisine[c]));
      }
      score += _tokenScore(dish, v.name) * 0.5;
      for (var h = 0; h < v.highlights.length; h++) {
        if (intent.occasion && v.highlights[h].toLowerCase().indexOf(intent.occasion) !== -1) score += 0.3;
      }
      if (score > 0) scored.push({ venue:v, score:score });
    }
    scored.sort(function(a,b) { return b.score - a.score; });
    if (scored.length === 0) scored = DINEOUT_VENUES.slice(0, 3).map(function(v) { return {venue:v, score:0.1}; });

    var venue = scored[0].venue;
    var estimatedBill = Math.round((venue.costForTwo / 2) * intent.servings);
    var travelMin = 10; // ~2.5km avg

    // Generate a mock next slot (today evening)
    var now = new Date();
    var slotDate = new Date(now);
    slotDate.setHours(19, 30, 0, 0);
    if (slotDate < now) slotDate.setDate(slotDate.getDate() + 1);

    var nextSlot = {
      dateStr: slotDate.toISOString().split("T")[0],
      reservationTime: slotDate.getTime(),
      displayTime: "7:30 PM",
      slotGroupName: "Dinner",
      deals: [{ slotId: 12345, itemId: venue.restaurantId + "-1001", title:"Free Reservation", bookingPrice:0, isFree:true, discountPercentage:0 }]
    };

    // Apply venue discount to deal
    if (venue.offers.length > 0) {
      var pctMatch = venue.offers[0].match(/(\d+)%/);
      if (pctMatch) nextSlot.deals[0].discountPercentage = parseInt(pctMatch[1]);
    }

    return {
      channel:"dineout", available:true, score:0,
      cost: estimatedBill, timeMin: travelMin,
      healthScore: getDishHealthScore(intent.dishName),
      details: {
        type:"dineout", venue:venue, nextSlot:nextSlot,
        estimatedBill:estimatedBill, travelMin:travelMin,
        offerText: venue.offers.length > 0 ? venue.offers[0] : null
      },
      recommended:false, reasonShort:""
    };
  }

  // ─── Scorer ────────────────────────────────────────────────────────────────────

  var PERSONA_WEIGHTS = {
    foodie:   { cost:0.15, time:0.20, health:0.15, experience:0.50 },
    gymfreak: { cost:0.15, time:0.15, health:0.55, experience:0.15 },
    balanced: { cost:0.25, time:0.25, health:0.25, experience:0.25 },
    budget:   { cost:0.50, time:0.15, health:0.15, experience:0.20 },
  };

  function scoreOption(option, intent, persona) {
    var w = PERSONA_WEIGHTS[persona] || PERSONA_WEIGHTS.balanced;
    var maxTime = intent.timeConstraintMin || 120;

    var costScore = Math.max(0, Math.min(100, 100 - (option.cost / intent.budget) * 100));
    var timeScore = Math.max(0, Math.min(100, 100 - (option.timeMin / maxTime) * 100));
    var healthScore = option.healthScore;

    var expScore = 50;
    if (option.details.type === "cook") expScore = 40;
    else if (option.details.type === "order") expScore = Math.min(100, 60 + option.details.restaurant.rating * 5);
    else if (option.details.type === "dineout") expScore = Math.min(100, 80 + option.details.venue.rating * 4);

    if (intent.occasion === "quick" && option.details.type === "cook") expScore = Math.max(0, expScore - 20);
    if (intent.occasion === "date" && option.details.type === "dineout") expScore = Math.min(100, expScore + 20);
    if (intent.occasion === "party" && intent.servings > 6 && option.details.type === "cook") expScore = Math.max(0, expScore - 15);

    var score = Math.round(costScore * w.cost + timeScore * w.time + healthScore * w.health + expScore * w.experience);

    var reason = "";
    if (option.details.type === "cook") reason = "Cook at home";
    else if (option.details.type === "order") reason = "Order delivery";
    else reason = "Dine out";

    if (costScore >= timeScore && costScore >= 60) reason += " — best value";
    else if (timeScore >= 60) reason += " — fastest";
    else if (healthScore >= 65) reason += " — healthiest";
    else reason += " — good balance";

    option.score = score;
    option.reasonShort = reason;
    return option;
  }

  function decideAll(intent, persona) {
    var options = [];
    var cook = queryCookIt(intent);
    var order = queryOrderIt(intent);
    var dineout = queryDineOut(intent);
    if (cook) options.push(cook);
    if (order) options.push(order);
    if (dineout) options.push(dineout);

    for (var i = 0; i < options.length; i++) scoreOption(options[i], intent, persona);
    options.sort(function(a,b) { return b.score - a.score; });
    for (var j = 0; j < options.length; j++) options[j].recommended = (j === 0);

    return {
      intent: intent,
      options: options,
      bestOption: options.length > 0 ? options[0].channel : "food",
      timestamp: new Date().toISOString()
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────────

  window.PrismEngine = {
    parseRecipe: function (prompt, servings) {
      return localParseRecipe(prompt, servings);
    },

    optimizeCart: function (ingredients, budget) {
      var skuMap = new Map();
      for (var i = 0; i < ingredients.length; i++) {
        var ing = ingredients[i];
        var skus = searchSKUs(ing.name);
        skuMap.set(ing.name, skus);
      }
      return _optimizeCart(ingredients, skuMap, budget);
    },

    parseIntent: parseIntent,
    decide: decideAll,

    _searchSKUs: searchSKUs,
    _catalog: INSTAMART_CATALOG,
    _recipeDB: RECIPE_DB,
    _restaurants: FOOD_RESTAURANTS,
    _foodMenu: FOOD_MENU,
    _dineoutVenues: DINEOUT_VENUES,
  };
})();
