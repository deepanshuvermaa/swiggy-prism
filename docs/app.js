const API = window.location.origin;
let serverAvailable = null; // null = unknown, true/false after check
let swiggyConnected = false;

// ─── Console Logging ─────────────────────────────────────────────────────────
function prismLog(area, msg, data) {
  var prefix = '%c[Prism ' + area + ']';
  var style = 'color:#FC8019;font-weight:bold';
  if (data !== undefined) {
    console.log(prefix, style, msg, data);
  } else {
    console.log(prefix, style, msg);
  }
}

// Detect if running on GitHub Pages (static) vs local server
function isStaticDeploy() {
  var host = window.location.hostname;
  return host.includes('github.io') || host.includes('netlify') || host.includes('vercel');
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

function startWithSwiggy() {
  prismLog('Auth', 'Connect with Swiggy clicked');
  if (isStaticDeploy()) {
    prismLog('Auth', 'Static deploy detected — showing overlay');
    showConnectOverlay();
    return;
  }
  prismLog('Auth', 'Redirecting to /auth/start...');
  window.location.href = '/auth/start';
}

function startWithMock() {
  prismLog('Auth', 'Explore with Demo Data clicked');
  localStorage.setItem('prism_onboarded', 'mock');
  if (!userPersona) {
    prismLog('Auth', 'No persona set — routing to persona screen');
    navigateTo('screen-persona');
  } else {
    prismLog('Auth', 'Persona exists (' + userPersona + ') — routing to smart-search');
    navigateTo('screen-smart-search');
  }
}

function connectSwiggyFromApp() {
  prismLog('Auth', 'In-app Connect button clicked, swiggyConnected=' + swiggyConnected);
  if (swiggyConnected) {
    alert('Connected to Swiggy! All 35 MCP tools active.');
    return;
  }
  if (isStaticDeploy()) {
    prismLog('Auth', 'Static deploy — showing overlay');
    showConnectOverlay();
    return;
  }
  prismLog('Auth', 'Redirecting to /auth/start...');
  window.location.href = '/auth/start';
}

function showConnectOverlay() {
  // Remove existing overlay if any
  var existing = document.getElementById('connect-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'connect-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s';
  overlay.innerHTML = '<div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);animation:successPop 0.4s ease">'
    + '<div style="font-size:36px;margin-bottom:12px">🔌</div>'
    + '<h2 style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px">Live Server Required</h2>'
    + '<p style="font-size:13px;color:#666;line-height:1.6;margin-bottom:20px">Connecting to Swiggy requires the Prism backend server running locally. This demo runs on GitHub Pages (static).</p>'
    + '<div style="background:#F5F5F5;border-radius:12px;padding:14px;text-align:left;margin-bottom:20px">'
    + '<p style="font-size:11px;color:#999;margin-bottom:6px;font-weight:600">TO CONNECT FOR REAL:</p>'
    + '<code style="font-size:12px;color:#1a1a2e;font-family:monospace;line-height:1.8;display:block">git clone the repo<br>npm install<br>npm run dev<br>Open localhost:3000</code>'
    + '</div>'
    + '<button onclick="this.closest(\'#connect-overlay\').remove();startWithMock()" style="width:100%;padding:14px;background:#FC8019;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px">Continue with Demo Data</button>'
    + '<button onclick="this.closest(\'#connect-overlay\').remove()" style="width:100%;padding:12px;background:none;border:1.5px solid #e8e8e8;border-radius:12px;font-size:13px;color:#666;cursor:pointer;font-family:inherit">Close</button>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function updateConnectButton(connected) {
  swiggyConnected = connected;
  // Update ALL connect buttons across the app
  var btns = document.querySelectorAll('.topbar-connect-btn, .global-connect');
  btns.forEach(function(btn) {
    var dot = btn.querySelector('.connect-dot');
    var label = btn.querySelector('.connect-label-text') || btn.querySelector('#connect-label');
    if (connected) {
      btn.className = btn.className.replace(/\bconnected\b/g, '').trim() + ' connected';
      if (dot) dot.className = 'connect-dot live';
      if (label) label.textContent = 'Live';
    } else {
      btn.className = btn.className.replace(/\bconnected\b/g, '').trim();
      if (dot) dot.className = 'connect-dot';
      if (label) label.textContent = 'Connect';
    }
  });
}

// Check if user already onboarded or just came back from auth
(function checkOnboardState() {
  var onboarded = localStorage.getItem('prism_onboarded');
  var hasCode = window.location.search.includes('code=');
  prismLog('Boot', 'checkOnboardState — onboarded=' + onboarded + ', hasCode=' + hasCode + ', static=' + isStaticDeploy() + ', url=' + window.location.pathname);

  // If URL has auth callback params, user just authenticated
  if (hasCode) {
    prismLog('Boot', 'Auth code detected in URL — setting onboarded=live');
    localStorage.setItem('prism_onboarded', 'live');
    if (!isStaticDeploy()) {
      prismLog('Boot', 'Server deploy — letting server handle /auth/callback');
      return; // let the server handle the callback
    }
  }
  if (onboarded) {
    prismLog('Boot', 'Already onboarded (' + onboarded + ') — skipping landing, going to smart-search');
    // Skip onboarding, go straight to app
    setTimeout(function() {
      navigateTo('screen-smart-search');
      if (onboarded === 'live') {
        prismLog('Boot', 'Live mode — marking connect buttons as connected');
        updateConnectButton(true);
      }
    }, 50);
  } else {
    prismLog('Boot', 'Not onboarded — showing landing page');
  }
  // Check server auth status — only if server is expected
  if (!isStaticDeploy()) {
    prismLog('Boot', 'Checking server health...');
    fetch('/api/health').then(function(r) { return r.json(); }).then(function(h) {
      prismLog('Boot', 'Server health response:', h);
      if (h.authenticated && h.mcpMode === 'live') {
        prismLog('Boot', 'Server confirms live + authenticated — updating UI');
        updateConnectButton(true);
        localStorage.setItem('prism_onboarded', 'live');
        // If we're still on landing, navigate to app
        if (document.getElementById('screen-onboarding').classList.contains('active')) {
          prismLog('Boot', 'Still on landing — auto-navigating to smart-search');
          navigateTo('screen-smart-search');
        }
      }
    }).catch(function(err) {
      prismLog('Boot', 'Server health check failed:', err);
    });
  }
})();

async function checkServer() {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const r = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(1500) });
    const d = await r.json();
    serverAvailable = d.status === "ok";
    prismLog('Server', 'Health check: available=' + serverAvailable, d);
  } catch { serverAvailable = false; prismLog('Server', 'Health check: unavailable (using client engine)'); }
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
let userPersona = localStorage.getItem("prism_persona") || null;

// ===== Persona System =====

const PERSONA_CONFIG = {
  foodie: {
    emoji: "🍕", label: "Foodie",
    tagline: "Taste explorer — we find the most flavorful combos for you",
    suggestions: [
      { recipe: "butter chicken for 4, budget 900", name: "Butter Chicken", emoji: "🍗", reason: "Rich & creamy classic", tag: "trending", tagLabel: "Trending" },
      { recipe: "chicken biryani for 4, budget 1200", name: "Dum Biryani", emoji: "🍚", reason: "Layers of flavor", tag: "trending", tagLabel: "Must Try" },
      { recipe: "chole bhature for 4, budget 500", name: "Chole Bhature", emoji: "🫛", reason: "Street food vibes", tag: "trending", tagLabel: "Popular" },
      { recipe: "pasta for 3, budget 400", name: "Cheesy Pasta", emoji: "🍝", reason: "Comfort food hit", tag: "trending", tagLabel: "Comfort" },
      { recipe: "paneer tikka for 3, budget 600", name: "Paneer Tikka", emoji: "🧀", reason: "Smoky & bold", tag: "trending", tagLabel: "Favorite" },
    ],
  },
  gymfreak: {
    emoji: "💪", label: "Gym Freak",
    tagline: "High protein, clean macros — gains-friendly grocery runs",
    suggestions: [
      { recipe: "egg curry for 4, budget 400", name: "Egg Curry", emoji: "🥚", reason: "26g protein/serving", tag: "protein", tagLabel: "High Protein" },
      { recipe: "chicken biryani for 4, budget 1000", name: "Chicken & Rice", emoji: "🍗", reason: "Complete meal prep", tag: "protein", tagLabel: "Meal Prep" },
      { recipe: "palak paneer for 4, budget 500", name: "Palak Paneer", emoji: "🥬", reason: "Iron + protein combo", tag: "healthy", tagLabel: "Clean" },
      { recipe: "dal tadka for 4, budget 400", name: "Dal Tadka", emoji: "🫘", reason: "Plant-based protein", tag: "protein", tagLabel: "18g Protein" },
      { recipe: "omelette for 2, budget 200", name: "Protein Omelette", emoji: "🥚", reason: "Quick post-workout", tag: "protein", tagLabel: "Quick" },
    ],
  },
  balanced: {
    emoji: "⚖️", label: "Balanced",
    tagline: "Smart nutrition without overthinking — healthy defaults",
    suggestions: [
      { recipe: "dal tadka for 4, budget 400", name: "Dal Tadka", emoji: "🫘", reason: "Nutritious everyday meal", tag: "healthy", tagLabel: "Balanced" },
      { recipe: "palak paneer for 4, budget 500", name: "Palak Paneer", emoji: "🥬", reason: "Greens + protein", tag: "healthy", tagLabel: "Nutritious" },
      { recipe: "rajma for 4, budget 450", name: "Rajma Chawal", emoji: "🫘", reason: "Fiber-rich comfort", tag: "healthy", tagLabel: "Wholesome" },
      { recipe: "egg fried rice for 3, budget 350", name: "Fried Rice", emoji: "🍚", reason: "Quick balanced meal", tag: "healthy", tagLabel: "Easy" },
      { recipe: "aloo gobi for 4, budget 300", name: "Aloo Gobi", emoji: "🥔", reason: "Light yet filling", tag: "healthy", tagLabel: "Light" },
    ],
  },
  budget: {
    emoji: "💰", label: "Budget Saver",
    tagline: "Maximum nutrition per rupee — every paisa optimized",
    suggestions: [
      { recipe: "dal tadka for 4, budget 300", name: "Dal Tadka", emoji: "🫘", reason: "₹75/person, high protein", tag: "value", tagLabel: "Best Value" },
      { recipe: "aloo gobi for 4, budget 250", name: "Aloo Gobi", emoji: "🥔", reason: "₹62/person, filling", tag: "value", tagLabel: "₹62/head" },
      { recipe: "egg curry for 4, budget 300", name: "Egg Curry", emoji: "🥚", reason: "₹75/person, protein-rich", tag: "value", tagLabel: "Smart Buy" },
      { recipe: "maggi for 2, budget 100", name: "Loaded Maggi", emoji: "🍜", reason: "₹50/person, quick fix", tag: "value", tagLabel: "₹50/head" },
      { recipe: "rajma for 4, budget 350", name: "Rajma Chawal", emoji: "🫘", reason: "₹87/person, complete", tag: "value", tagLabel: "Value Meal" },
    ],
  },
};

function selectPersona(persona) {
  userPersona = persona;
  localStorage.setItem("prism_persona", persona);
  applyPersona();
  navigateTo("screen-smart-search");
}

function applyPersona() {
  if (!userPersona) return;
  const config = PERSONA_CONFIG[userPersona];
  if (!config) return;

  // show persona chip
  const chip = document.getElementById("persona-chip");
  chip.style.display = "flex";
  document.getElementById("persona-chip-emoji").textContent = config.emoji;
  document.getElementById("persona-chip-text").textContent = config.tagline;

  // render suggested for you
  const section = document.getElementById("suggested-section");
  section.style.display = "block";
  document.getElementById("suggested-title").textContent = `${config.emoji} Suggested for ${config.label}`;

  const scroll = document.getElementById("suggested-scroll");
  scroll.innerHTML = "";

  // add history-based suggestions first
  const history = JSON.parse(localStorage.getItem("prism_history") || "[]");
  const reordered = getSmartSuggestions(config.suggestions, history);

  reordered.forEach(s => {
    const card = document.createElement("div");
    card.className = "suggested-card";
    card.onclick = () => quickRecipe(s.recipe);
    card.innerHTML = `
      <span class="sc-emoji">${s.emoji}</span>
      <span class="sc-name">${s.name}</span>
      <span class="sc-reason">${s.reason}</span>
      <span class="sc-tag ${s.tag}">${s.tagLabel}</span>
    `;
    scroll.appendChild(card);
  });
}

function getSmartSuggestions(defaults, history) {
  if (history.length === 0) return defaults;

  // boost recipes user hasn't tried, deprioritize repeated ones
  const tried = new Set(history.map(h => h.recipe));
  const fresh = defaults.filter(d => !tried.has(d.name.toLowerCase()));
  const repeat = defaults.filter(d => tried.has(d.name.toLowerCase()));

  // add a "Try again?" label to repeats
  repeat.forEach(r => {
    r.tagLabel = "Order Again";
    r.tag = "trending";
  });

  return [...fresh, ...repeat];
}

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
  prismLog('Nav', '→ ' + id);
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "screen-cart" && currentCart) renderCart(currentCart);
  if (id === "screen-summary" && currentCart) renderSummary(currentCart);
  if (id === "screen-prism-hub") renderPrismHub();
  if (id === "screen-instamart" && userPersona) applyPersona();
  if (id === "screen-food-xray") renderFoodXRay();
  if (id === "screen-smart-search") {
    var persona = PERSONA_CONFIG[userPersona || "balanced"];
    var emojiEl = document.getElementById("smart-search-persona-emoji");
    if (emojiEl && persona) emojiEl.textContent = persona.emoji;
  }
}

function renderPrismHub() {
  const config = PERSONA_CONFIG[userPersona || "balanced"];
  const stats = getWrappedStats();

  var hubEmoji = document.getElementById("hub-persona-emoji");
  if (hubEmoji) hubEmoji.textContent = config.emoji;
  document.getElementById("hub-persona-label").textContent = config.tagline;
  document.getElementById("hub-savings").textContent = stats.savingsPct + "%";
  document.getElementById("hub-orders").textContent = stats.sessions + " orders";

  const list = document.getElementById("hub-reco-list");
  list.innerHTML = "";

  const history = JSON.parse(localStorage.getItem("prism_history") || "[]");
  const suggestions = getSmartSuggestions(config.suggestions, history);

  suggestions.forEach(s => {
    const item = document.createElement("div");
    item.className = "hub-reco-item";
    item.onclick = () => quickRecipe(s.recipe);
    item.innerHTML = `
      <span class="hri-emoji">${s.emoji}</span>
      <div class="hri-info"><span class="hri-name">${s.name}</span><span class="hri-reason">${s.reason}</span></div>
      <span class="hri-tag ${s.tag}">${s.tagLabel}</span>
    `;
    list.appendChild(item);
  });
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
  // hide the "tap share" guide
  document.querySelectorAll("#guide-yt-share, #guide-ig-share").forEach(g => g.style.display = "none");
  document.getElementById("share-sheet").classList.add("visible");
  // show the "tap prism" guide after a beat
  setTimeout(() => {
    const prismGuide = document.getElementById("guide-prism-tap");
    if (prismGuide) prismGuide.style.display = "block";
  }, 400);
}

function captureFromShare() {
  document.getElementById("share-sheet").classList.remove("visible");

  // Show the recipe banner on Instamart home
  var banner = document.getElementById("prism-recipe-banner");
  var bannerTitle = document.getElementById("banner-recipe-title");
  var bannerSub = document.getElementById("banner-recipe-sub");
  if (banner) {
    banner.style.display = "";
    if (currentPlatform === "instagram") {
      bannerTitle.textContent = "Prism found a recipe!";
      bannerSub.textContent = "Paneer Tikka from Instagram — Tap to build your cart";
    } else {
      bannerTitle.textContent = "Prism found a recipe!";
      bannerSub.textContent = "Butter Chicken from YouTube — Tap to build your cart";
    }
  }

  // show persona onboarding if first time, otherwise go straight to instamart
  setTimeout(() => {
    if (!userPersona) {
      navigateTo("screen-persona");
    } else {
      applyPersona();
      navigateTo("screen-instamart");
    }
  }, 300);
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
  prismLog('Pipeline', 'Start — "' + text + '"');
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
  prismLog('Pipeline', 'Using server=' + useServer + ', budget=' + budget);

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

  // persona-aware scoring — gym freaks care more about protein
  if (userPersona === "gymfreak") {
    const proteinBoost = Math.min(15, totals.protein / 5);
    score = Math.round(Math.min(100, score + proteinBoost));
  } else if (userPersona === "budget") {
    // budget users get a value score boost
    score = Math.round(Math.min(100, score + 5));
  }

  document.getElementById("health-score-num").textContent = score;

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

  // brief success flash, then go to post-order screen
  setTimeout(() => {
    overlay.classList.remove("visible");
    renderPostOrder();
    navigateTo("screen-post-order");
  }, 2000);
}

function renderPostOrder() {
  const stats = getWrappedStats();
  document.getElementById("po-savings").textContent = stats.savingsPct + "%";
  document.getElementById("po-budget-bar").style.width = "100%";
  document.getElementById("po-spent-bar").style.width = ((stats.totalSpent / stats.totalBudget) * 100) + "%";

  // persona-driven "what's next" recommendations
  const config = PERSONA_CONFIG[userPersona || "balanced"];
  const list = document.getElementById("po-reco-list");
  list.innerHTML = "";

  config.suggestions.slice(0, 3).forEach(s => {
    const item = document.createElement("div");
    item.className = "hub-reco-item";
    item.onclick = () => quickRecipe(s.recipe);
    item.innerHTML = `
      <span class="hri-emoji">${s.emoji}</span>
      <div class="hri-info"><span class="hri-name">${s.name}</span><span class="hri-reason">${s.reason}</span></div>
      <span class="hri-tag ${s.tag}">${s.tagLabel}</span>
    `;
    list.appendChild(item);
  });
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

  // apply saved persona on load
  if (userPersona) applyPersona();

  // Smart search enter key
  var smartInput = document.getElementById('smart-search-input');
  if (smartInput) smartInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') submitSmartSearch(); });
});

// ─── Decision Engine UI ──────────────────────────────────────────────────────────

var currentDecision = null;

function submitSmartSearch() {
  var input = document.getElementById('smart-search-input');
  var text = input ? input.value.trim() : '';
  if (!text) return;
  runDecisionPipeline(text);
}

function quickDecision(text) {
  // Set input value for context
  var input = document.getElementById('smart-search-input');
  if (input) input.value = text;
  // Make sure we're on the smart search screen
  if (!document.getElementById('screen-smart-search').classList.contains('active')) {
    navigateTo('screen-smart-search');
  }
  runDecisionPipeline(text);
}

async function runDecisionPipeline(text) {
  var persona = userPersona || 'balanced';
  prismLog('Decision', 'Pipeline start — query="' + text + '", persona=' + persona);

  var useServer = await checkServer();

  if (useServer) {
    // Server-side decision — uses real MCP + LLM when in live mode
    prismLog('Decision', 'Using SERVER pipeline (live MCP + Groq LLM)');
    try {
      var r = await fetch(API + '/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, persona: persona }),
      });
      var d = await r.json();
      if (d.success && d.result) {
        prismLog('Decision', 'Server result — ' + d.result.options.length + ' options, best=' + d.result.bestOption);
        currentDecision = d.result;
        var suggestions = document.getElementById('initial-suggestions');
        if (suggestions) suggestions.style.display = 'none';
        renderInlineResults(d.result);
        return;
      } else {
        prismLog('Decision', 'Server decision failed: ' + (d.error || 'unknown'), d);
      }
    } catch (err) {
      prismLog('Decision', 'Server decision error, falling back to client:', err);
    }
  }

  // Fallback: client-side decision (mock data)
  prismLog('Decision', 'Using CLIENT pipeline (mock data)');
  var intent = window.PrismEngine.parseIntent(text);
  prismLog('Decision', 'Intent parsed:', intent);
  var result = window.PrismEngine.decide(intent, persona);
  prismLog('Decision', 'Result — ' + result.options.length + ' options, best=' + result.bestOption);
  currentDecision = result;

  var suggestions = document.getElementById('initial-suggestions');
  if (suggestions) suggestions.style.display = 'none';

  renderInlineResults(result);
}

function renderInlineResults(result) {
  var container = document.getElementById('inline-results');
  if (!container) return;

  var channelConfig = {
    instamart: { icon: '🍳', name: 'Cook at Home', color: '#39A06F', accent: 'linear-gradient(135deg,#E8F5EE,#F0FFF4)', tag: 'Instamart', actionLabel: 'Build Cart' },
    food:      { icon: '🛵', name: 'Order Delivery', color: '#FC8019', accent: 'linear-gradient(135deg,#FFF3E8,#FFFFFF)', tag: 'Swiggy Food', actionLabel: 'Order Now' },
    dineout:   { icon: '🍽️', name: 'Dine Out', color: '#6B4EFF', accent: 'linear-gradient(135deg,#F0EEFF,#FFFFFF)', tag: 'Dineout', actionLabel: 'Book Table' },
  };

  var intent = result.intent;
  var html = '<div class="ir-header">';
  html += '<div class="ir-query">' + intent.dishName.charAt(0).toUpperCase() + intent.dishName.slice(1) + '</div>';
  html += '<div class="ir-meta">' + intent.servings + ' servings · ₹' + intent.budget + ' budget</div>';
  html += '</div>';

  for (var i = 0; i < result.options.length; i++) {
    var opt = result.options[i];
    var cfg = channelConfig[opt.channel];
    var isTop = opt.recommended;

    // Build card details
    var subtitle = '';
    var extraInfo = '';
    if (opt.details.type === 'cook') {
      subtitle = opt.details.recipeName.charAt(0).toUpperCase() + opt.details.recipeName.slice(1);
      extraInfo = opt.details.cookTimeMin + ' min cook + ' + opt.details.groceryDeliveryMin + ' min delivery';
    } else if (opt.details.type === 'order') {
      subtitle = opt.details.restaurant.name;
      extraInfo = opt.details.restaurant.rating + '★ · ' + opt.details.restaurant.distanceKm + ' km';
      if (opt.details.cart.discount > 0) extraInfo += ' · <span style="color:#39A06F">-₹' + opt.details.cart.discount + ' off</span>';
    } else if (opt.details.type === 'dineout') {
      subtitle = opt.details.venue.name + ' · ' + opt.details.venue.locality;
      extraInfo = opt.details.nextSlot.displayTime + ' tonight';
      if (opt.details.offerText) extraInfo += ' · <span style="color:#39A06F">' + opt.details.offerText + '</span>';
    }

    html += '<div class="ir-card' + (isTop ? ' ir-top' : '') + '" style="background:' + cfg.accent + ';border-left:3px solid ' + cfg.color + '">';
    if (isTop) html += '<div class="ir-best-badge" style="background:' + cfg.color + '">BEST MATCH</div>';
    html += '<div class="ir-card-row">';
    html += '<div class="ir-card-left">';
    html += '<div class="ir-card-title"><span class="ir-icon">' + cfg.icon + '</span> ' + cfg.name + '</div>';
    html += '<div class="ir-subtitle">' + subtitle + '</div>';
    html += '<div class="ir-extra">' + extraInfo + '</div>';
    html += '</div>';
    html += '<div class="ir-card-right">';
    html += '<div class="ir-price">₹' + opt.cost + '</div>';
    html += '<div class="ir-time">' + opt.timeMin + ' min</div>';
    html += '</div></div>';
    html += '<div class="ir-card-footer">';
    html += '<div class="ir-health"><span class="ir-health-bar" style="width:' + opt.healthScore + '%;background:' + (opt.healthScore >= 65 ? '#39A06F' : opt.healthScore >= 45 ? '#F5A623' : '#E04F5F') + '"></span><span class="ir-health-label">Health ' + opt.healthScore + '%</span></div>';
    html += '<button class="ir-action-btn" style="background:' + cfg.color + '" onclick="executeChannel(' + i + ')">' + cfg.actionLabel + '</button>';
    html += '</div></div>';
  }

  // Clear/new search link
  html += '<button class="ir-clear" onclick="clearInlineResults()">← New search</button>';

  container.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearInlineResults() {
  var container = document.getElementById('inline-results');
  if (container) container.innerHTML = '';
  var suggestions = document.getElementById('initial-suggestions');
  if (suggestions) suggestions.style.display = '';
  var input = document.getElementById('smart-search-input');
  if (input) { input.value = ''; input.focus(); }
}

function executeChannel(index) {
  if (!currentDecision || !currentDecision.options[index]) return;
  var opt = currentDecision.options[index];

  if (opt.details.type === 'cook') {
    if (opt.details.cart && opt.details.cart.items) {
      var rawCart = opt.details.cart;
      currentCart = {
        budget: rawCart.budget,
        totalCost: rawCart.totalCost,
        budgetUtilization: rawCart.budgetUtilization,
        items: rawCart.items.map(function(i) {
          return {
            name: i.sku ? i.sku.name : i.name || '',
            brand: i.sku ? i.sku.brand : i.brand || '',
            price: i.sku ? i.sku.price : i.price || 0,
            count: i.count,
            totalPrice: i.totalPrice,
            priority: i.ingredient ? i.ingredient.priority : i.priority || 'essential',
            ingredient: i.ingredient ? i.ingredient.name : i.name || '',
            ingredientQty: i.ingredient ? i.ingredient.quantity : 100,
            ingredientUnit: i.ingredient ? i.ingredient.unit : 'g',
          };
        }),
        droppedItems: rawCart.droppedItems || [],
        meta: rawCart.meta,
      };
      navigateTo('screen-cart');
    }
  } else if (opt.details.type === 'order') {
    showFoodActionSheet(opt.details);
  } else if (opt.details.type === 'dineout') {
    showDineoutActionSheet(opt.details);
  }
}

// ─── Action Sheet (bottom sheet) ──────────────────────────────────────────────

function openActionSheet(contentHtml) {
  var sheet = document.getElementById('action-sheet');
  var content = document.getElementById('action-sheet-content');
  if (sheet && content) {
    content.innerHTML = contentHtml;
    sheet.classList.add('open');
  }
}

function closeActionSheet() {
  var sheet = document.getElementById('action-sheet');
  if (sheet) sheet.classList.remove('open');
}

function showFoodActionSheet(details) {
  var r = details.restaurant;
  var cart = details.cart;
  var html = '<div class="as-header" style="background:linear-gradient(135deg,#FF6B35,#FC8019);color:white;padding:16px;border-radius:14px 14px 0 0;margin:-16px -16px 16px">';
  html += '<div style="font-size:18px;font-weight:700">' + r.name + '</div>';
  html += '<div style="font-size:13px;opacity:0.9">' + r.rating + '★ · ' + r.cuisine.join(', ') + ' · ' + r.deliveryTimeMin + ' min delivery</div>';
  html += '</div>';

  html += '<div class="as-items">';
  for (var i = 0; i < cart.items.length; i++) {
    var ci = cart.items[i];
    html += '<div class="as-item-row"><span>' + (ci.menuItem.isVeg ? '🟢' : '🔴') + ' ' + ci.menuItem.name + ' × ' + ci.quantity + '</span><span>₹' + ci.totalPrice + '</span></div>';
  }
  html += '</div>';

  html += '<div class="as-totals">';
  html += '<div class="as-total-row"><span>Subtotal</span><span>₹' + cart.subtotal + '</span></div>';
  html += '<div class="as-total-row"><span>Delivery</span><span>₹' + cart.deliveryFee + '</span></div>';
  if (cart.discount > 0) html += '<div class="as-total-row as-discount"><span>Discount' + (cart.appliedCoupon ? ' (' + cart.appliedCoupon.couponCode + ')' : '') + '</span><span>-₹' + cart.discount + '</span></div>';
  html += '<div class="as-total-row as-final"><span>Total</span><span>₹' + cart.total + '</span></div>';
  html += '</div>';

  html += '<button class="as-action-btn" style="background:#FC8019" onclick="confirmFoodOrder()">Place Order · ₹' + cart.total + '</button>';
  html += '<div class="as-note">Cash on delivery · Powered by Swiggy Food</div>';

  currentFoodOrder = details;
  openActionSheet(html);
}

function confirmFoodOrder() {
  closeActionSheet();
  saveDecisionOrder('food', currentDecision ? currentDecision.intent.dishName : 'Food', currentFoodOrder.cart.total);
  showOrderOverlay('Order Confirmed!', currentFoodOrder.restaurant.deliveryTimeMin + ' min delivery', 'via Swiggy Food · ' + currentFoodOrder.restaurant.name);
}

function showDineoutActionSheet(details) {
  var v = details.venue;
  var slot = details.nextSlot;
  var partySize = currentDecision ? currentDecision.intent.servings : 2;
  var bill = Math.round((v.costForTwo / 2) * partySize);
  var discPct = slot.deals && slot.deals[0] ? slot.deals[0].discountPercentage : 0;
  var discount = discPct > 0 ? Math.round(bill * discPct / 100) : 0;

  var html = '<div class="as-header" style="background:linear-gradient(135deg,#6B4EFF,#8B5CF6);color:white;padding:16px;border-radius:14px 14px 0 0;margin:-16px -16px 16px">';
  html += '<div style="font-size:18px;font-weight:700">' + v.name + '</div>';
  html += '<div style="font-size:13px;opacity:0.9">' + v.rating + '★ · ' + v.cuisine.join(', ') + ' · ' + v.locality + '</div>';
  if (details.offerText) html += '<div style="margin-top:6px;padding:4px 10px;background:rgba(255,255,255,0.2);border-radius:8px;font-size:12px;display:inline-block">' + details.offerText + '</div>';
  html += '</div>';

  html += '<div class="as-totals">';
  html += '<div class="as-total-row"><span>Date & Time</span><span>' + slot.dateStr + ' · ' + slot.displayTime + '</span></div>';
  html += '<div class="as-total-row"><span>Guests</span><span>' + partySize + '</span></div>';
  html += '<div class="as-total-row"><span>Est. Bill</span><span>₹' + bill + '</span></div>';
  if (discount > 0) html += '<div class="as-total-row as-discount"><span>' + discPct + '% off</span><span>-₹' + discount + '</span></div>';
  html += '<div class="as-total-row as-final"><span>You\'ll pay approx.</span><span>₹' + (bill - discount) + '</span></div>';
  html += '</div>';

  html += '<button class="as-action-btn" style="background:#6B4EFF" onclick="confirmDineoutBooking()">Book Table · ' + slot.displayTime + '</button>';
  html += '<div class="as-note">Free reservation · Powered by Swiggy Dineout</div>';

  currentDineout = details;
  dineoutPartySize = partySize;
  openActionSheet(html);
}

function confirmDineoutBooking() {
  closeActionSheet();
  var v = currentDineout.venue;
  var bill = Math.round((v.costForTwo / 2) * dineoutPartySize);
  saveDecisionOrder('dineout', currentDecision ? currentDecision.intent.dishName : 'Dineout', bill);
  showOrderOverlay('Table Booked!', currentDineout.nextSlot.displayTime + ' · ' + dineoutPartySize + ' guests', 'via Swiggy Dineout · ' + v.name);
}

// ─── Food Order Screen ────────────────────────────────────────────────────────

var currentFoodOrder = null;

function renderFoodOrder(details) {
  currentFoodOrder = details;
  var r = details.restaurant;
  var cart = details.cart;

  // Header
  var header = document.getElementById('food-restaurant-header');
  if (header) {
    header.innerHTML = '<div class="frh-name">' + r.name + '</div>' +
      '<div class="frh-meta"><span>' + r.rating + ' ★</span><span>' + r.distanceKm + ' km</span><span>' + r.deliveryTimeMin + ' min</span></div>' +
      '<div class="frh-cuisine">' + r.cuisine.join(' · ') + '</div>';
  }

  // Menu items
  var menuEl = document.getElementById('food-menu-items');
  if (menuEl) {
    var html = '';
    for (var i = 0; i < details.menuItems.length; i++) {
      var item = details.menuItems[i];
      var inCart = cart.items.find(function(ci) { return ci.menuItem.itemId === item.itemId; });
      var qty = inCart ? inCart.quantity : 0;
      html += '<div class="food-menu-item">';
      html += '<div class="fmi-info">';
      html += '<div class="fmi-name"><span class="fmi-veg-dot ' + (item.isVeg ? 'veg' : 'nonveg') + '"></span>' + item.name;
      if (item.isBestseller) html += ' <span class="fmi-bestseller">★ Bestseller</span>';
      html += '</div>';
      html += '<div class="fmi-price">₹' + item.price + '</div></div>';
      html += '<div class="fmi-qty-controls">';
      html += '<button class="fmi-qty-btn" onclick="updateFoodQty(\'' + item.itemId + '\',-1)">−</button>';
      html += '<span class="fmi-qty" id="fqty-' + item.itemId + '">' + qty + '</span>';
      html += '<button class="fmi-qty-btn" onclick="updateFoodQty(\'' + item.itemId + '\',1)">+</button>';
      html += '</div></div>';
    }
    menuEl.innerHTML = html;
  }

  // Cart summary
  updateFoodCartSummary();
}

function updateFoodQty(itemId, delta) {
  if (!currentFoodOrder) return;
  var cart = currentFoodOrder.cart;
  var existing = cart.items.find(function(ci) { return ci.menuItem.itemId === itemId; });

  if (existing) {
    existing.quantity = Math.max(0, existing.quantity + delta);
    existing.totalPrice = existing.menuItem.price * existing.quantity;
    if (existing.quantity === 0) {
      cart.items = cart.items.filter(function(ci) { return ci.menuItem.itemId !== itemId; });
    }
  } else if (delta > 0) {
    var menuItem = currentFoodOrder.menuItems.find(function(m) { return m.itemId === itemId; });
    if (menuItem) cart.items.push({ menuItem: menuItem, quantity: 1, totalPrice: menuItem.price });
  }

  // Update quantity display
  var qtyEl = document.getElementById('fqty-' + itemId);
  var item = cart.items.find(function(ci) { return ci.menuItem.itemId === itemId; });
  if (qtyEl) qtyEl.textContent = item ? item.quantity : '0';

  // Recalculate totals
  cart.subtotal = cart.items.reduce(function(s, i) { return s + i.totalPrice; }, 0);
  cart.total = Math.round(cart.subtotal + cart.deliveryFee - cart.discount);
  updateFoodCartSummary();
}

function updateFoodCartSummary() {
  if (!currentFoodOrder) return;
  var cart = currentFoodOrder.cart;
  var summary = document.getElementById('food-cart-summary');
  if (!summary) return;

  var html = '<div class="fcs-row"><span>Subtotal</span><span>₹' + cart.subtotal + '</span></div>';
  html += '<div class="fcs-row"><span>Delivery Fee</span><span>₹' + cart.deliveryFee + '</span></div>';
  if (cart.discount > 0) {
    html += '<div class="fcs-row fcs-discount"><span>Discount (' + (cart.appliedCoupon ? cart.appliedCoupon.couponCode : '') + ')</span><span>-₹' + cart.discount + '</span></div>';
  }
  html += '<div class="fcs-row total"><span>Total</span><span>₹' + cart.total + '</span></div>';
  html += '<button class="fcs-order-btn" onclick="placeFoodOrder()">Place Order · Swiggy Food</button>';
  summary.innerHTML = html;
}

function placeFoodOrder() {
  if (!currentFoodOrder) return;
  // Save to history
  saveDecisionOrder('food', currentDecision ? currentDecision.intent.dishName : 'Food Order', currentFoodOrder.cart.total);
  // Show overlay then post-order
  showOrderOverlay('Your order is being prepared!', currentFoodOrder.restaurant.deliveryTimeMin + ' min delivery', 'via Swiggy Food');
}

// ─── Dineout Screen ───────────────────────────────────────────────────────────

var currentDineout = null;
var dineoutPartySize = 2;

function renderDineoutFlow(details) {
  currentDineout = details;
  dineoutPartySize = currentDecision ? currentDecision.intent.servings : 2;
  var v = details.venue;

  // Header
  var header = document.getElementById('dineout-venue-header');
  if (header) {
    var html = '<div class="dvh-name">' + v.name + '</div>';
    html += '<div class="dvh-meta"><span>' + v.rating + ' ★</span><span>' + v.locality + '</span><span>₹' + v.costForTwo + ' for two</span></div>';
    html += '<div class="dvh-cuisine">' + v.cuisine.join(' · ') + '</div>';
    if (details.offerText) html += '<div class="dvh-offer">' + details.offerText + '</div>';
    header.innerHTML = html;
  }

  // Slot
  var slotsEl = document.getElementById('dineout-slots');
  if (slotsEl) {
    var slot = details.nextSlot;
    var html = '<div class="dineout-date-scroll">';
    html += '<button class="dineout-date-chip selected"><span class="ddc-day">Today</span><span class="ddc-date">' + slot.dateStr + '</span></button>';
    html += '</div>';
    html += '<div class="dineout-slots" style="margin-top:12px">';
    html += '<button class="slot-chip selected">' + slot.displayTime + '</button>';
    // Add a few more slots around it
    var otherTimes = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
    for (var i = 0; i < otherTimes.length; i++) {
      if (otherTimes[i] !== slot.displayTime) {
        html += '<button class="slot-chip">' + otherTimes[i] + '</button>';
      }
    }
    html += '</div>';
    slotsEl.innerHTML = html;
  }

  // Party size
  var partyEl = document.getElementById('dineout-party');
  if (partyEl) {
    partyEl.innerHTML = '<div class="dineout-party-row"><label>Guests</label>' +
      '<div class="party-stepper"><button onclick="changeDineoutParty(-1)">−</button>' +
      '<span class="party-count" id="party-count">' + dineoutPartySize + '</span>' +
      '<button onclick="changeDineoutParty(1)">+</button></div></div>';
  }

  updateDineoutSummary();
}

function changeDineoutParty(delta) {
  dineoutPartySize = Math.max(1, Math.min(20, dineoutPartySize + delta));
  var el = document.getElementById('party-count');
  if (el) el.textContent = dineoutPartySize;
  updateDineoutSummary();
}

function updateDineoutSummary() {
  if (!currentDineout) return;
  var v = currentDineout.venue;
  var slot = currentDineout.nextSlot;
  var estimatedBill = Math.round((v.costForTwo / 2) * dineoutPartySize);
  var discountPct = slot.deals && slot.deals[0] ? slot.deals[0].discountPercentage : 0;
  var discount = discountPct > 0 ? Math.round(estimatedBill * discountPct / 100) : 0;
  var total = estimatedBill - discount;

  var summary = document.getElementById('dineout-summary');
  if (!summary) return;

  var html = '<div class="dineout-booking-summary">';
  html += '<div class="dbs-row"><span>Venue</span><span>' + v.name + '</span></div>';
  html += '<div class="dbs-row"><span>Date & Time</span><span>' + slot.dateStr + ' · ' + slot.displayTime + '</span></div>';
  html += '<div class="dbs-row"><span>Guests</span><span>' + dineoutPartySize + '</span></div>';
  html += '<div class="dbs-row"><span>Est. Bill</span><span>₹' + estimatedBill + '</span></div>';
  if (discount > 0) {
    html += '<div class="dbs-row dbs-offer"><span>Discount (' + discountPct + '% off)</span><span>-₹' + discount + '</span></div>';
  }
  html += '<div class="dbs-row total"><span>You\'ll pay approx.</span><span>₹' + total + '</span></div>';
  html += '</div>';
  summary.innerHTML = html;
}

function bookDineoutTable() {
  if (!currentDineout) return;
  var v = currentDineout.venue;
  var estimatedBill = Math.round((v.costForTwo / 2) * dineoutPartySize);
  saveDecisionOrder('dineout', currentDecision ? currentDecision.intent.dishName : 'Dine Out', estimatedBill);
  showOrderOverlay('Table Booked!', currentDineout.nextSlot.displayTime + ' · ' + dineoutPartySize + ' guests', 'via Swiggy Dineout at ' + v.name);
}

// ─── Unified Order Overlay ────────────────────────────────────────────────────

function showOrderOverlay(title, subtitle, via) {
  var overlay = document.getElementById('order-overlay');
  if (overlay) {
    var card = overlay.querySelector('.order-success-card');
    if (card) {
      card.querySelector('h2').textContent = title;
      card.querySelector('p').innerHTML = subtitle;
      card.querySelector('.order-id').textContent = via;
    }
    overlay.classList.add('visible');
    setTimeout(function() {
      overlay.classList.remove('visible');
      // Update post-order screen
      var poTitle = document.querySelector('#screen-post-order .po-success h2');
      if (poTitle) poTitle.textContent = subtitle;
      var poSub = document.querySelector('#screen-post-order .po-sub');
      if (poSub) poSub.textContent = via;
      renderPostOrder();
      navigateTo('screen-post-order');
    }, 2000);
  }
}

// ─── History / Analytics ──────────────────────────────────────────────────────

function saveDecisionOrder(channel, dishName, cost) {
  var history = JSON.parse(localStorage.getItem('prism_v2_history') || '[]');
  history.push({
    id: 'dec_' + Date.now(),
    date: new Date().toISOString(),
    channel: channel,
    dishName: dishName,
    cost: cost,
    healthScore: Math.round(40 + Math.random() * 40),
    servings: currentDecision ? currentDecision.intent.servings : 2
  });
  if (history.length > 50) history = history.slice(-50);
  localStorage.setItem('prism_v2_history', JSON.stringify(history));
}

function getV2History() {
  return JSON.parse(localStorage.getItem('prism_v2_history') || '[]');
}

function renderFoodXRay() {
  var history = getV2History();
  if (history.length === 0) {
    var body = document.querySelector('#screen-food-xray .xray-body');
    if (body) body.innerHTML = '<div style="text-align:center;padding:40px 16px;color:var(--text-sec)"><p>No order history yet.</p><p style="margin-top:8px">Use Prism to make your first food decision!</p><button class="dc-choose-btn" style="max-width:200px;margin:16px auto" onclick="navigateTo(\'screen-smart-search\')">Get Started</button></div>';
    return;
  }

  var totalSpend = 0;
  var channels = { instamart: 0, food: 0, dineout: 0 };
  var channelCounts = { instamart: 0, food: 0, dineout: 0 };
  var avgHealth = 0;

  for (var i = 0; i < history.length; i++) {
    totalSpend += history[i].cost;
    channels[history[i].channel] = (channels[history[i].channel] || 0) + history[i].cost;
    channelCounts[history[i].channel] = (channelCounts[history[i].channel] || 0) + 1;
    avgHealth += history[i].healthScore;
  }
  avgHealth = Math.round(avgHealth / history.length);

  var cookPct = totalSpend > 0 ? Math.round((channels.instamart / totalSpend) * 100) : 33;
  var orderPct = totalSpend > 0 ? Math.round((channels.food / totalSpend) * 100) : 34;
  var dinePct = 100 - cookPct - orderPct;

  // Donut
  var donut = document.getElementById('xray-donut');
  if (donut) {
    donut.innerHTML = '<div class="xray-donut" style="background:conic-gradient(var(--green) 0% ' + cookPct + '%, var(--orange) ' + cookPct + '% ' + (cookPct + orderPct) + '%, #6B4EFF ' + (cookPct + orderPct) + '% 100%)"><div class="xray-donut-inner"><span class="xray-donut-total">₹' + totalSpend + '</span><span class="xray-donut-label">total spend</span></div></div>' +
      '<div class="xray-legend"><div class="xray-legend-item"><span class="xray-legend-dot" style="background:var(--green)"></span>Cook ₹' + channels.instamart + '</div>' +
      '<div class="xray-legend-item"><span class="xray-legend-dot" style="background:var(--orange)"></span>Order ₹' + channels.food + '</div>' +
      '<div class="xray-legend-item"><span class="xray-legend-dot" style="background:#6B4EFF"></span>Dine ₹' + channels.dineout + '</div></div>';
  }

  // Stats
  var stats = document.getElementById('xray-stats');
  if (stats) {
    stats.innerHTML = '<div class="xray-stat-card"><div class="xray-stat-value">' + history.length + '</div><div class="xray-stat-label">Total Decisions</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">' + avgHealth + '/100</div><div class="xray-stat-label">Avg Health Score</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">' + channelCounts.instamart + '</div><div class="xray-stat-label">Times Cooked</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">' + channelCounts.food + '</div><div class="xray-stat-label">Orders Placed</div></div>';
  }

  // Insight
  var insight = document.getElementById('xray-insight');
  if (insight && channelCounts.food > 0 && channels.instamart > 0) {
    var avgOrderCost = Math.round(channels.food / channelCounts.food);
    var avgCookCost = channels.instamart > 0 ? Math.round(channels.instamart / Math.max(1, channelCounts.instamart)) : Math.round(avgOrderCost * 0.5);
    var savings = (avgOrderCost - avgCookCost) * channelCounts.food;
    insight.innerHTML = '<h4>Savings Insight</h4><p>Your average food order costs ₹' + avgOrderCost +
      '. Cooking the same dishes would cost ~₹' + avgCookCost + ' each. ' +
      'Potential savings: <span class="savings-amount">₹' + Math.max(0, savings) + '/month</span></p>';
  }
}
