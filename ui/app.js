const API = window.location.origin;
let serverAvailable = null; // null = unknown, true/false after check

async function checkServer() {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(1500) });
    const d = await r.json();
    serverAvailable = d.status === "ok";
  } catch { serverAvailable = false; }
  return serverAvailable;
}

const EMOJI = {
  chicken:"🍗",paneer:"🧀",mutton:"🥩",fish:"🐟",egg:"🥚",prawn:"🦐",
  dal:"🫘",lentil:"🫘",rajma:"🫘",chole:"🫘",chana:"🫘",
  milk:"🥛",cream:"🍶",curd:"🥛",yogurt:"🥛",butter:"🧈",cheese:"🧀",ghee:"🫕",
  onion:"🧅",tomato:"🍅",potato:"🥔",garlic:"🧄",ginger:"🫚",
  capsicum:"🫑",carrot:"🥕",peas:"🫛",spinach:"🥬",palak:"🥬",
  cauliflower:"🥦",brinjal:"🍆",beans:"🫛",cabbage:"🥬",
  cucumber:"🥒",lemon:"🍋",mint:"🌿",coriander:"🌿",
  rice:"🍚",atta:"🌾",flour:"🌾",maida:"🌾",bread:"🍞",
  pasta:"🍝",noodle:"🍜",oats:"🥣",rava:"🌾",
  oil:"🫒",olive:"🫒",coconut:"🥥",
  salt:"🧂",turmeric:"✨",cumin:"✨",chili:"🌶️",chilli:"🌶️",
  pepper:"✨",masala:"✨",cinnamon:"✨",cardamom:"✨",kasuri:"🌿",biryani:"✨",
  sugar:"🍬",honey:"🍯",jaggery:"🍬",ketchup:"🍅",soy:"🫗",vinegar:"🫗",
};

// rough per-100g nutrition data
const NUTRITION = {
  chicken:{cal:239,protein:27,carbs:0,fats:14,fiber:0},
  paneer:{cal:265,protein:18,carbs:1,fats:21,fiber:0},
  egg:{cal:155,protein:13,carbs:1,fats:11,fiber:0},
  fish:{cal:206,protein:22,carbs:0,fats:12,fiber:0},
  mutton:{cal:294,protein:25,carbs:0,fats:21,fiber:0},
  dal:{cal:116,protein:9,carbs:20,fats:0.4,fiber:8},
  milk:{cal:42,protein:3.4,carbs:5,fats:1,fiber:0},
  cream:{cal:195,protein:2,carbs:3,fats:20,fiber:0},
  curd:{cal:60,protein:3,carbs:5,fats:3,fiber:0},
  butter:{cal:717,protein:0.9,carbs:0.1,fats:81,fiber:0},
  cheese:{cal:350,protein:25,carbs:1,fats:27,fiber:0},
  ghee:{cal:900,protein:0,carbs:0,fats:100,fiber:0},
  onion:{cal:40,protein:1,carbs:9,fats:0.1,fiber:1.7},
  tomato:{cal:18,protein:0.9,carbs:3.9,fats:0.2,fiber:1.2},
  potato:{cal:77,protein:2,carbs:17,fats:0.1,fiber:2.2},
  rice:{cal:130,protein:2.7,carbs:28,fats:0.3,fiber:0.4},
  bread:{cal:265,protein:9,carbs:49,fats:3.2,fiber:2.7},
  spinach:{cal:23,protein:2.9,carbs:3.6,fats:0.4,fiber:2.2},
  capsicum:{cal:20,protein:0.9,carbs:4.6,fats:0.2,fiber:1.7},
  carrot:{cal:41,protein:0.9,carbs:10,fats:0.2,fiber:2.8},
  oil:{cal:884,protein:0,carbs:0,fats:100,fiber:0},
  pasta:{cal:131,protein:5,carbs:25,fats:1.1,fiber:1.8},
  atta:{cal:340,protein:12,carbs:72,fats:1.7,fiber:11},
};

function getEmoji(n) {
  const l = n.toLowerCase();
  for (const [k, e] of Object.entries(EMOJI)) { if (l.includes(k)) return e; }
  return "🛒";
}

function getNutrition(name, qty) {
  const l = name.toLowerCase();
  for (const [k, n] of Object.entries(NUTRITION)) {
    if (l.includes(k)) {
      const scale = qty / 100;
      return { cal: Math.round(n.cal * scale), protein: Math.round(n.protein * scale), carbs: Math.round(n.carbs * scale), fats: Math.round(n.fats * scale), fiber: Math.round(n.fiber * scale) };
    }
  }
  return { cal: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
}

let currentCart = null;
let currentPlatform = "youtube";
let currentDiet = "all";

// ===== Platform Switching =====

function switchPlatform(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".ptab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.ptab[onclick*="${platform}"]`).classList.add("active");
  document.querySelectorAll(".platform-view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${platform}`).classList.add("active");
}

// ===== Diet Filter =====

function setDiet(diet) {
  currentDiet = diet;
  document.querySelectorAll(".diet-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.diet-btn[data-diet="${diet}"]`).classList.add("active");

  document.querySelectorAll(".recipe-pill").forEach(pill => {
    const pillDiet = pill.dataset.diet;
    if (diet === "all" || pillDiet === diet) {
      pill.classList.remove("hidden");
    } else {
      pill.classList.add("hidden");
    }
  });
}

// ===== Wrapped with localStorage =====

function saveSession(cart) {
  const history = JSON.parse(localStorage.getItem("prism_history") || "[]");
  history.push({
    date: new Date().toISOString(),
    totalCost: cart.totalCost,
    budget: cart.budget,
    items: cart.items.length,
    recipe: cart.items[0]?.ingredient || "unknown",
  });
  // keep last 20 sessions
  if (history.length > 20) history.shift();
  localStorage.setItem("prism_history", JSON.stringify(history));
}

function getWrappedStats() {
  const history = JSON.parse(localStorage.getItem("prism_history") || "[]");
  if (history.length === 0) {
    return { totalBudget: 3000, totalSpent: 2640, sessions: 3, savingsPct: 12 };
  }

  const totalBudget = history.reduce((s, h) => s + h.budget, 0);
  const totalSpent = history.reduce((s, h) => s + h.totalCost, 0);
  const savingsPct = Math.max(1, Math.round((1 - totalSpent / totalBudget) * 100));
  return { totalBudget, totalSpent, sessions: history.length, savingsPct };
}

function navigateTo(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "screen-cart" && currentCart) renderCart(currentCart);
  if (id === "screen-summary" && currentCart) renderSummary(currentCart);
}

function extractBudget(text) {
  const m = text.match(/(?:₹|rs\.?|rupees?|budget)\s*(\d[\d,]*)/i) || text.match(/(\d[\d,]*)\s*(?:₹|rs|rupees?|budget)/i);
  if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  const nums = text.match(/\b(\d{3,5})\b/g);
  if (nums) return parseInt(nums[nums.length - 1], 10);
  return 800;
}

// ===== Share Sheet =====

function showShareSheet() {
  document.getElementById("share-sheet").classList.add("visible");
}

function captureFromShare() {
  document.getElementById("share-sheet").classList.remove("visible");

  // update banner based on platform
  const bannerText = document.querySelector(".prism-banner-text span");
  if (currentPlatform === "instagram") {
    bannerText.textContent = "Paneer Tikka from Instagram — Tap to build your cart";
  } else {
    bannerText.textContent = "Butter Chicken from YouTube — Tap to build your cart";
  }

  setTimeout(() => navigateTo("screen-instamart"), 300);
}

// ===== Prism Flow =====

function startPrismFlow() {
  const recipe = currentPlatform === "instagram"
    ? "paneer tikka for 3 people, budget 600 rupees"
    : "butter chicken for 4 people, budget 800 rupees";
  runPipeline(recipe);
}

function quickRecipe(text) {
  runPipeline(text);
}

function submitRecipeInput() {
  const input = document.getElementById("prism-recipe-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  runPipeline(text);
}

async function runPipeline(text) {
  navigateTo("screen-processing");

  const steps = ["step-parse", "step-search", "step-optimize", "step-health"];
  const fill = document.getElementById("proc-fill");

  // reset
  steps.forEach(s => {
    const el = document.getElementById(s);
    el.classList.remove("done", "active");
  });
  fill.style.width = "0%";

  const budget = extractBudget(text);

  const useServer = await checkServer();

  // step 1: parse
  setStep(steps, 0, fill, 10);
  let ingredients;
  try {
    if (useServer) {
      const r = await fetch(`${API}/api/parse`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      ingredients = d.ingredients;
    } else {
      await delay(300);
      ingredients = window.PrismEngine.parseRecipe(text);
    }

    const detail = document.getElementById("step-parse-detail");
    detail.textContent = `Found ${ingredients.length} ingredients`;
  } catch (err) {
    alert("Parse failed: " + (err.message || err));
    navigateTo("screen-instamart");
    return;
  }

  // step 2: search
  await delay(400);
  setStep(steps, 1, fill, 40);
  await delay(600);

  // step 3: optimize
  setStep(steps, 2, fill, 70);

  let cart;
  try {
    if (useServer) {
      const r = await fetch(`${API}/api/optimize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, budget }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error);
      cart = d.cart;
    } else {
      await delay(300);
      cart = window.PrismEngine.optimizeCart(ingredients, budget);
    }
  } catch (err) {
    alert("Optimize failed: " + (err.message || err));
    navigateTo("screen-instamart");
    return;
  }

  // step 4: health
  await delay(400);
  setStep(steps, 3, fill, 100);
  await delay(500);

  // done — go to cart
  currentCart = {
    budget: cart.budget,
    totalCost: cart.totalCost,
    budgetUtilization: cart.budgetUtilization,
    items: cart.items.map(i => ({
      name: i.sku.name,
      brand: i.sku.brand,
      price: i.sku.price,
      count: i.count,
      totalPrice: i.totalPrice,
      priority: i.ingredient.priority,
      ingredient: i.ingredient.name,
      ingredientQty: i.ingredient.quantity,
      ingredientUnit: i.ingredient.unit,
    })),
    droppedItems: cart.droppedItems || [],
    meta: cart.meta,
  };

  navigateTo("screen-cart");
}

function setStep(steps, idx, fill, pct) {
  for (let i = 0; i < steps.length; i++) {
    const el = document.getElementById(steps[i]);
    if (i < idx) { el.classList.add("done"); el.classList.remove("active"); }
    else if (i === idx) { el.classList.add("active"); el.classList.remove("done"); }
    else { el.classList.remove("done", "active"); }
  }
  // mark current as done after a beat
  setTimeout(() => {
    document.getElementById(steps[idx]).classList.add("done");
    document.getElementById(steps[idx]).classList.remove("active");
  }, 300);
  fill.style.width = pct + "%";
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== Cart Rendering =====

function renderCart(cart) {
  document.getElementById("cart-total-badge").textContent = `₹${cart.totalCost.toLocaleString()}`;
  document.getElementById("cart-budget-badge").textContent = `₹${cart.budget.toLocaleString()}`;
  document.getElementById("cb-total").textContent = `₹${cart.totalCost.toLocaleString()}`;
  document.getElementById("cb-items").textContent = `${cart.items.length} items in cart`;

  const badge = document.getElementById("budget-badge");
  badge.className = "budget-badge " + (cart.totalCost <= cart.budget ? "green" : "red");

  const body = document.getElementById("cart-items-body");
  body.innerHTML = "";

  // group by priority
  const groups = { essential: [], important: [], optional: [] };
  cart.items.forEach(i => {
    const g = groups[i.priority] || groups.essential;
    g.push(i);
  });

  const labels = { essential: "Essentials", important: "Recipe Kit", optional: "Spices & Extras" };

  for (const [prio, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const label = document.createElement("div");
    label.className = "cart-category-label";
    label.textContent = labels[prio] || prio;
    body.appendChild(label);

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <span class="cart-item-emoji">${getEmoji(item.ingredient)}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-brand">${item.brand}</div>
        </div>
        <div class="cart-item-qty">${item.count}</div>
        <div class="cart-item-price">₹${item.totalPrice}</div>
      `;
      body.appendChild(row);
    });
  }

  // compute nutrition
  computeNutrition(cart);
}

function computeNutrition(cart) {
  let totals = { cal: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

  cart.items.forEach(item => {
    const n = getNutrition(item.ingredient, item.ingredientQty || 100);
    totals.cal += n.cal;
    totals.protein += n.protein;
    totals.carbs += n.carbs;
    totals.fats += n.fats;
    totals.fiber += n.fiber;
  });

  const maxMacro = Math.max(totals.protein, totals.carbs, totals.fats, 1);

  document.getElementById("macro-protein").style.width = (totals.protein / maxMacro * 100) + "%";
  document.getElementById("macro-carbs").style.width = (totals.carbs / maxMacro * 100) + "%";
  document.getElementById("macro-fats").style.width = (totals.fats / maxMacro * 100) + "%";
  document.getElementById("macro-fiber").style.width = Math.min(100, totals.fiber / maxMacro * 100) + "%";

  document.getElementById("macro-protein-val").textContent = totals.protein + "g";
  document.getElementById("macro-carbs-val").textContent = totals.carbs + "g";
  document.getElementById("macro-fats-val").textContent = totals.fats + "g";
  document.getElementById("macro-fiber-val").textContent = totals.fiber + "g";
  document.getElementById("total-calories").textContent = totals.cal + " kcal";

  // health score: penalize high fat ratio, reward protein + fiber
  const totalMacro = totals.protein + totals.carbs + totals.fats + 1;
  const proteinRatio = totals.protein / totalMacro;
  const fatsRatio = totals.fats / totalMacro;
  const fiberBonus = Math.min(10, totals.fiber / 2);
  const score = Math.round(Math.min(100, (proteinRatio * 120 - fatsRatio * 40 + fiberBonus + 50)));

  document.getElementById("health-score-num").textContent = score;

  // update ring
  const ring = document.getElementById("health-ring");
  const circumference = 2 * Math.PI * 42;
  ring.setAttribute("stroke-dashoffset", String(circumference - (score / 100) * circumference));
  ring.setAttribute("stroke", score > 65 ? "#39A06F" : score > 40 ? "#F7C948" : "#E04F5F");
}

function toggleHealthPanel() {
  document.getElementById("health-panel").classList.toggle("visible");
}

// ===== Summary =====

function renderSummary(cart) {
  document.getElementById("summary-total").textContent = `₹${cart.totalCost.toLocaleString()}`;

  const savings = Math.round((1 - cart.budgetUtilization) * cart.budget);
  document.getElementById("summary-saved").textContent = `You saved ₹${savings} vs full budget`;

  const container = document.getElementById("summary-items");
  container.innerHTML = "";

  cart.items.slice(0, 5).forEach(item => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <span class="si-emoji">${getEmoji(item.ingredient)}</span>
      <div class="si-info"><div class="si-name">${item.name}</div><div class="si-detail">${item.brand} x${item.count}</div></div>
      <span class="si-price">₹${item.totalPrice}</span>
    `;
    container.appendChild(div);
  });

  if (cart.items.length > 5) {
    const more = document.createElement("div");
    more.className = "summary-item";
    more.innerHTML = `<span class="si-emoji">📦</span><div class="si-info"><div class="si-name">+${cart.items.length - 5} more items</div></div><span class="si-price"></span>`;
    container.appendChild(more);
  }

  // wrapped — pull from localStorage history
  const stats = getWrappedStats();
  document.getElementById("wrapped-savings").textContent = stats.savingsPct + "%";
  document.getElementById("wrapped-budget-bar").style.width = "100%";
  document.getElementById("wrapped-spent-bar").style.width = ((stats.totalSpent / stats.totalBudget) * 100) + "%";
}

function placeOrder() {
  if (currentCart) saveSession(currentCart);
  const overlay = document.getElementById("order-overlay");
  overlay.classList.add("visible");
  setTimeout(() => overlay.classList.remove("visible"), 3000);
}

function shareWrapped() {
  const card = document.getElementById("wrapped-card");
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "successPop 0.5s ease";
}

// ===== Init =====

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("prism-recipe-input");
  if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") submitRecipeInput(); });
});
