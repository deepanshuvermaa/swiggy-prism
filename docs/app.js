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
    // Check if auth just completed and persona is needed
    var needsPersona = localStorage.getItem('prism_needs_persona');
    if (needsPersona && !localStorage.getItem('prism_persona')) {
      prismLog('Boot', 'Auth complete but no persona — showing persona screen');
      localStorage.removeItem('prism_needs_persona');
      setTimeout(function() {
        navigateTo('screen-persona');
        if (onboarded === 'live') updateConnectButton(true);
      }, 50);
    } else {
      prismLog('Boot', 'Already onboarded (' + onboarded + ') — skipping landing, going to smart-search');
      localStorage.removeItem('prism_needs_persona');
      setTimeout(function() {
        navigateTo('screen-smart-search');
        if (onboarded === 'live') {
          prismLog('Boot', 'Live mode — marking connect buttons as connected');
          updateConnectButton(true);
        }
      }, 50);
    }
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

  // In live mode, fetch user's go-to Instamart items to enhance suggestions
  if (localStorage.getItem('prism_onboarded') === 'live' && !isStaticDeploy()) {
    prismLog('Persona', 'Live mode — fetching your_go_to_items from Instamart MCP');
    fetch(API + '/api/go-to-items').then(function(r) { return r.json(); }).then(function(d) {
      if (d.success && d.items && d.items.length > 0) {
        prismLog('Persona', 'Got ' + d.items.length + ' go-to items from Instamart');
        localStorage.setItem('prism_goto_items', JSON.stringify(d.items));
      }
    }).catch(function() { /* ignore */ });
  }
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

var _navHistory = [];

function navigateBack() {
  // Skip transient screens (processing, overlay) in back stack
  var skip = ['screen-processing'];
  var prev = _navHistory.pop();
  while (prev && skip.indexOf(prev) !== -1) prev = _navHistory.pop();
  if (prev) navigateTo(prev);
  else navigateTo('screen-smart-search');
}

function navigateTo(id) {
  // Track navigation history for back button context
  var current = document.querySelector('.screen.active');
  if (current && current.id !== id) _navHistory.push(current.id);
  if (_navHistory.length > 10) _navHistory.shift();

  prismLog('Nav', '→ ' + id);
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  var target = document.getElementById(id);
  if (target) {
    target.classList.add("active");
    target.scrollTop = 0; // scroll to top on every navigation
  }
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
      skuQtyDesc: i.sku.quantity ? i.sku.quantity + (i.sku.unit || '') : '',
      skuId: i.sku.skuId || '',
      imageUrl: i.sku.imageUrl || '',
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
      const imgHtml = item.imageUrl
        ? `<img class="cart-item-img" src="${item.imageUrl}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          + `<span class="cart-item-emoji" style="display:none">${getEmoji(item.ingredient)}</span>`
        : `<span class="cart-item-emoji">${getEmoji(item.ingredient)}</span>`;
      var itemIdx = cart.items.indexOf(item);
      row.innerHTML = `
        ${imgHtml}
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-brand">${item.brand || ''}${item.skuQtyDesc ? ' · ' + item.skuQtyDesc : ''}</div>
        </div>
        <div class="cart-item-stepper">
          <button class="qty-btn" onclick="adjustCartQty(${itemIdx},-1)">−</button>
          <span class="qty-val">${item.count}</span>
          <button class="qty-btn" onclick="adjustCartQty(${itemIdx},1)">+</button>
        </div>
        <div class="cart-item-price">₹${item.totalPrice}</div>
      `;
      body.appendChild(row);
    });
  }

  // compute nutrition
  computeNutrition(cart);
}

function computeNutrition(cart) {
  if (!cart || !cart.items || cart.items.length === 0) return;
  let totals = { cal: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

  cart.items.forEach(item => {
    try {
      const n = getNutrition(item.ingredient || item.name || '', item.ingredientQty || 100);
      if (n) {
        totals.cal += n.cal || 0;
        totals.protein += n.protein || 0;
        totals.carbs += n.carbs || 0;
        totals.fats += n.fats || 0;
        totals.fiber += n.fiber || 0;
      }
    } catch(e) { /* skip item if nutrition lookup fails */ }
  });

  const maxMacro = Math.max(totals.protein, totals.carbs, totals.fats, 1);

  var el;
  if (el = document.getElementById("macro-protein")) el.style.width = (totals.protein / maxMacro * 100) + "%";
  if (el = document.getElementById("macro-carbs")) el.style.width = (totals.carbs / maxMacro * 100) + "%";
  if (el = document.getElementById("macro-fats")) el.style.width = (totals.fats / maxMacro * 100) + "%";
  if (el = document.getElementById("macro-fiber")) el.style.width = Math.min(100, totals.fiber / maxMacro * 100) + "%";

  if (el = document.getElementById("macro-protein-val")) el.textContent = totals.protein + "g";
  if (el = document.getElementById("macro-carbs-val")) el.textContent = totals.carbs + "g";
  if (el = document.getElementById("macro-fats-val")) el.textContent = totals.fats + "g";
  if (el = document.getElementById("macro-fiber-val")) el.textContent = totals.fiber + "g";
  if (el = document.getElementById("total-calories")) el.textContent = totals.cal + " kcal";

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

function adjustCartQty(idx, delta) {
  if (!currentCart || !currentCart.items[idx]) return;
  var item = currentCart.items[idx];
  item.count = Math.max(0, item.count + delta);
  item.totalPrice = item.price * item.count;
  if (item.count === 0) {
    currentCart.items.splice(idx, 1);
  }
  currentCart.totalCost = currentCart.items.reduce(function(s, i) { return s + i.totalPrice; }, 0);
  renderCart(currentCart);
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
    const imgHtml = item.imageUrl
      ? `<img class="si-img" src="${item.imageUrl}" alt="" onerror="this.outerHTML='<span class=si-emoji>${getEmoji(item.ingredient)}</span>'">`
      : `<span class="si-emoji">${getEmoji(item.ingredient)}</span>`;
    div.innerHTML = `
      ${imgHtml}
      <div class="si-info"><div class="si-name">${item.name}</div><div class="si-detail">${item.brand} x${item.count}</div></div>
      <span class="si-price">₹${item.totalPrice}</span>
    `;
    container.appendChild(div);
  });

  if (cart.items.length > 5) {
    const moreCount = cart.items.length - 5;
    const moreDiv = document.createElement("div");
    moreDiv.className = "summary-item";
    moreDiv.style.cursor = "pointer";
    moreDiv.innerHTML = `<span class="si-emoji">📦</span><div class="si-info"><div class="si-name" style="color:var(--orange)">+${moreCount} more items ▾</div></div><span class="si-price"></span>`;
    moreDiv.onclick = function() {
      // Expand to show all remaining items
      moreDiv.remove();
      cart.items.slice(5).forEach(function(item) {
        var div = document.createElement("div");
        div.className = "summary-item";
        div.innerHTML = '<span class="si-emoji">' + getEmoji(item.ingredient) + '</span><div class="si-info"><div class="si-name">' + item.name + '</div><div class="si-detail">' + (item.brand || '') + ' x' + item.count + '</div></div><span class="si-price">₹' + item.totalPrice + '</span>';
        container.appendChild(div);
      });
    };
    container.appendChild(moreDiv);
  }

  // wrapped — pull from localStorage history
  const stats = getWrappedStats();
  document.getElementById("wrapped-savings").textContent = stats.savingsPct + "%";
  document.getElementById("wrapped-budget-bar").style.width = "100%";
  document.getElementById("wrapped-spent-bar").style.width = ((stats.totalSpent / stats.totalBudget) * 100) + "%";
}

async function placeOrder() {
  if (!currentCart) return;
  var confirmed = confirm('This will place a REAL Instamart order for ₹' + currentCart.totalCost + '. Proceed?');
  if (!confirmed) return;

  if (currentCart) saveSession(currentCart);

  // Track pantry usage — items that were skipped because user had them
  var pantryUsed = getPantryItemsUsedInRecipe(currentCart.items.map(function(i) { return { name: i.ingredient }; }));
  if (pantryUsed.length > 0) {
    var depleted = trackPantryUsage(pantryUsed);
    if (depleted.length > 0) {
      prismLog('Pantry', 'Items likely depleted after multiple uses: ' + depleted.join(', '));
    }
  }

  // Try real MCP checkout
  try {
    var useServer = await checkServer();
    if (useServer && localStorage.getItem('prism_onboarded') === 'live') {
      prismLog('Order', 'Placing REAL Instamart order via MCP...');
      var r = await fetch(API + '/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentCart.items.map(function(i) { return { skuId: i.skuId, quantity: i.count }; }) })
      });
      var d = await r.json();
      if (d.success) prismLog('Order', 'Real Instamart order placed!');
    }
  } catch (err) { prismLog('Order', 'MCP checkout failed:', err); }

  const overlay = document.getElementById("order-overlay");
  overlay.classList.add("visible");

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

var _skeletonInterval = null;

function showSkeletonLoading() {
  var container = document.getElementById('inline-results');
  if (!container) return;
  var suggestions = document.getElementById('initial-suggestions');
  if (suggestions) suggestions.style.display = 'none';

  var html = '<div class="skeleton-status"><span id="skeleton-dots">Searching 3 channels</span></div>';
  for (var i = 0; i < 3; i++) {
    var colors = ['#39A06F', '#FC8019', '#6B4EFF'];
    html += '<div class="skeleton-card" style="border-left-color:' + colors[i] + '">';
    html += '<div class="skeleton-bar" style="width:60%;height:14px;margin-bottom:8px"></div>';
    html += '<div class="skeleton-bar" style="width:80%;height:10px;margin-bottom:6px"></div>';
    html += '<div class="skeleton-bar" style="width:40%;height:10px"></div>';
    html += '</div>';
  }
  container.innerHTML = html;

  // Animate dots
  var dotEl = document.getElementById('skeleton-dots');
  var dots = 0;
  if (_skeletonInterval) clearInterval(_skeletonInterval);
  _skeletonInterval = setInterval(function() {
    dots = (dots + 1) % 4;
    if (dotEl) dotEl.textContent = 'Searching 3 channels' + '.'.repeat(dots);
  }, 400);
}

function clearSkeletonLoading() {
  if (_skeletonInterval) { clearInterval(_skeletonInterval); _skeletonInterval = null; }
}

async function runDecisionPipeline(text) {
  var persona = userPersona || 'balanced';
  prismLog('Decision', 'Pipeline start — query="' + text + '", persona=' + persona);

  // Show loading skeleton immediately
  showSkeletonLoading();

  var useServer = await checkServer();
  var serverFailed = false;

  if (useServer) {
    prismLog('Decision', 'Using SERVER pipeline (live MCP + Groq LLM)');
    try {
      var r = await fetch(API + '/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, persona: persona, pantryItems: loadPantry(), dietaryPrefs: loadDietary() }),
      });
      var d = await r.json();
      if (d.success && d.result) {
        prismLog('Decision', 'Server result — ' + d.result.options.length + ' options, best=' + d.result.bestOption);
        currentDecision = d.result;
        clearSkeletonLoading();
        renderInlineResults(d.result);
        return;
      } else {
        prismLog('Decision', 'Server decision failed: ' + (d.error || 'unknown'), d);
        serverFailed = true;
      }
    } catch (err) {
      prismLog('Decision', 'Server decision error, falling back to client:', err);
      serverFailed = true;
    }
  }

  // Fallback: client-side decision (mock data)
  prismLog('Decision', 'Using CLIENT pipeline (mock data)');
  var intent = window.PrismEngine.parseIntent(text);
  prismLog('Decision', 'Intent parsed:', intent);
  var result = window.PrismEngine.decide(intent, persona);
  prismLog('Decision', 'Result — ' + result.options.length + ' options, best=' + result.bestOption);
  currentDecision = result;

  clearSkeletonLoading();
  renderInlineResults(result, serverFailed);
}

function renderInlineResults(result, serverFailed) {
  var container = document.getElementById('inline-results');
  if (!container) return;

  var channelConfig = {
    instamart: { icon: '🍳', name: 'Cook at Home', color: '#39A06F', accent: 'linear-gradient(135deg,#E8F5EE,#F0FFF4)', tag: 'Instamart', actionLabel: 'Build Cart' },
    food:      { icon: '🛵', name: 'Order Delivery', color: '#FC8019', accent: 'linear-gradient(135deg,#FFF3E8,#FFFFFF)', tag: 'Swiggy Food', actionLabel: 'Order Now' },
    dineout:   { icon: '🍽️', name: 'Dine Out', color: '#6B4EFF', accent: 'linear-gradient(135deg,#F0EEFF,#FFFFFF)', tag: 'Dineout', actionLabel: 'Book Table' },
  };

  var intent = result.intent;
  var html = '';
  if (serverFailed) {
    html += '<div class="error-banner">⚠ Couldn\'t reach Swiggy servers. Showing estimated results.</div>';
  }
  html += '<div class="ir-header">';
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
      subtitle = (opt.details.restaurant.name || '').replace(/\s*\(Ad\)\s*/g, '');
      extraInfo = opt.details.restaurant.rating + '★ · ' + opt.details.restaurant.distanceKm + ' km';
      if (opt.details.cart.discount > 0) extraInfo += ' · <span style="color:#39A06F">-₹' + opt.details.cart.discount + ' off</span>';
      var rOffer = opt.details.restaurant.offer;
      if (rOffer && typeof rOffer === 'string') extraInfo += ' · <span style="color:#39A06F">' + rOffer + '</span>';
    } else if (opt.details.type === 'dineout') {
      subtitle = (opt.details.venue.name || '') + ' · ' + (opt.details.venue.locality || '');
      extraInfo = opt.details.nextSlot.displayTime + ' tonight';
      var dOffer = opt.details.offerText;
      if (dOffer && typeof dOffer === 'string') extraInfo += ' · <span style="color:#39A06F">' + dOffer + '</span>';
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

  // Savings calculator (F2)
  html += renderSavingsCalculator(result);

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
            imageUrl: i.sku ? i.sku.imageUrl || '' : i.imageUrl || '',
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
  html += '<div style="font-size:13px;opacity:0.9">' + r.rating + '★ · ' + (r.cuisine || []).join(', ') + ' · ' + r.deliveryTimeMin + ' min delivery</div>';
  if (r.offer) html += '<div style="margin-top:6px;padding:4px 10px;background:rgba(255,255,255,0.2);border-radius:8px;font-size:11px;display:inline-block">' + r.offer + '</div>';
  html += '</div>';

  // Show items if available
  if (cart.items && cart.items.length > 0) {
    html += '<div class="as-items">';
    for (var i = 0; i < cart.items.length; i++) {
      var ci = cart.items[i];
      var itemName = ci.menuItem ? ci.menuItem.name : ci.name || 'Item';
      var isVeg = ci.menuItem ? ci.menuItem.isVeg : true;
      html += '<div class="as-item-row"><span>' + (isVeg ? '🟢' : '🔴') + ' ' + itemName + ' × ' + (ci.quantity || 1) + '</span><span>₹' + (ci.totalPrice || ci.price || 0) + '</span></div>';
    }
    html += '</div>';
  }

  // Coupon input
  html += '<div style="margin:12px 0;display:flex;gap:8px">';
  html += '<input type="text" id="coupon-input" placeholder="Enter coupon code" style="flex:1;padding:10px 14px;border:1.5px solid #e8e8e8;border-radius:10px;font-size:13px;font-family:inherit;outline:none">';
  html += '<button onclick="applyCouponCode()" style="padding:10px 16px;background:#FC8019;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Apply</button>';
  html += '</div>';
  html += '<div id="coupon-status" style="font-size:11px;color:var(--green);margin-bottom:8px"></div>';

  html += '<div class="as-totals">';
  html += '<div class="as-total-row"><span>Subtotal</span><span>₹' + cart.subtotal + '</span></div>';
  html += '<div class="as-total-row"><span>Delivery</span><span>₹' + cart.deliveryFee + '</span></div>';
  if (cart.discount > 0) html += '<div class="as-total-row as-discount"><span>Discount' + (cart.appliedCoupon ? ' (' + cart.appliedCoupon.couponCode + ')' : '') + '</span><span>-₹' + cart.discount + '</span></div>';
  html += '<div class="as-total-row as-final"><span>Total</span><span id="food-total-display">₹' + cart.total + '</span></div>';
  html += '</div>';

  html += '<button class="as-action-btn" style="background:#FC8019" onclick="confirmFoodOrder()">Place Order · ₹' + cart.total + '</button>';
  html += '<div class="as-note">Cash on delivery · Powered by Swiggy Food</div>';

  currentFoodOrder = details;
  openActionSheet(html);
}

function applyCouponCode() {
  var input = document.getElementById('coupon-input');
  var status = document.getElementById('coupon-status');
  if (!input || !status) return;
  var code = input.value.trim().toUpperCase();
  if (!code) { status.textContent = 'Enter a coupon code'; status.style.color = '#E04F5F'; return; }

  // Simulate coupon application (real flow would call fetch_food_coupons + apply_food_coupon via server)
  status.textContent = 'Applying ' + code + '...';
  status.style.color = '#666';

  // Mock discount for demo — in live mode this would call the MCP
  setTimeout(function() {
    if (currentFoodOrder && currentFoodOrder.cart) {
      var discount = Math.round(currentFoodOrder.cart.subtotal * 0.1); // 10% off
      currentFoodOrder.cart.discount = discount;
      currentFoodOrder.cart.total = Math.max(0, currentFoodOrder.cart.subtotal + currentFoodOrder.cart.deliveryFee - discount);
      currentFoodOrder.cart.appliedCoupon = { couponCode: code };
      status.textContent = '✓ ' + code + ' applied! You save ₹' + discount;
      status.style.color = '#39A06F';
      var totalEl = document.getElementById('food-total-display');
      if (totalEl) totalEl.textContent = '₹' + currentFoodOrder.cart.total;
      // Update button
      var btn = document.querySelector('.as-action-btn');
      if (btn) btn.textContent = 'Place Order · ₹' + currentFoodOrder.cart.total;
    }
  }, 500);
}

async function confirmFoodOrder() {
  if (!currentFoodOrder) return;
  var confirmed = confirm('This will place a REAL order on your Swiggy account for ₹' + currentFoodOrder.cart.total + ' from ' + currentFoodOrder.restaurant.name + '. Proceed?');
  if (!confirmed) { closeActionSheet(); return; }

  closeActionSheet();
  // Try real MCP order placement
  try {
    var useServer = await checkServer();
    if (useServer && localStorage.getItem('prism_onboarded') === 'live') {
      prismLog('Order', 'Placing REAL food order via MCP...');
      var r = await fetch(API + '/api/place-food-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: currentFoodOrder.restaurant.restaurantId })
      });
      var d = await r.json();
      if (d.success) {
        prismLog('Order', 'Real order placed! ID: ' + (d.orderId || 'N/A'));
      }
    }
  } catch (err) { prismLog('Order', 'MCP order failed (demo fallback):', err); }

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

async function confirmDineoutBooking() {
  if (!currentDineout) return;
  var v = currentDineout.venue;
  var bill = Math.round((v.costForTwo / 2) * dineoutPartySize);
  var confirmed = confirm('This will book a REAL table at ' + v.name + ' for ' + dineoutPartySize + ' guests at ' + currentDineout.nextSlot.displayTime + '. Proceed?');
  if (!confirmed) { closeActionSheet(); return; }

  closeActionSheet();
  try {
    var useServer = await checkServer();
    if (useServer && localStorage.getItem('prism_onboarded') === 'live') {
      prismLog('Booking', 'Booking REAL table via MCP...');
      var r = await fetch(API + '/api/book-table', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: v.restaurantId, guestCount: dineoutPartySize, slot: currentDineout.nextSlot })
      });
      var d = await r.json();
      if (d.success) prismLog('Booking', 'Real booking confirmed! ID: ' + (d.bookingId || 'N/A'));
    }
  } catch (err) { prismLog('Booking', 'MCP booking failed:', err); }

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

async function renderFoodXRay() {
  var body = document.querySelector('#screen-food-xray .xray-body');

  // Try fetching real order history from server
  var serverHistory = null;
  try {
    var useServer = await checkServer();
    if (useServer) {
      var r = await fetch(API + '/api/order-history');
      var d = await r.json();
      if (d.success && d.orderCount > 0) {
        serverHistory = d;
        prismLog('XRay', 'Loaded real order history: ' + d.orderCount + ' orders, ₹' + d.totalSpent + ' spent');
      }
    }
  } catch(e) { prismLog('XRay', 'Server history failed, using local:', e); }

  // If we have server history, render it
  if (serverHistory) {
    renderXRayFromServer(serverHistory);
    return;
  }

  // Fall back to local decision history
  var history = getV2History();
  if (history.length === 0) {
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

function renderXRayFromServer(data) {
  var foodOrders = data.food || [];
  var imOrders = data.instamart || [];
  var totalSpend = data.totalSpent || 0;
  var foodSpend = 0, imSpend = 0;
  for (var i = 0; i < foodOrders.length; i++) foodSpend += foodOrders[i].total || foodOrders[i].amount || foodOrders[i].orderTotal || 0;
  for (var j = 0; j < imOrders.length; j++) imSpend += imOrders[j].total || imOrders[j].amount || imOrders[j].orderTotal || 0;
  if (totalSpend === 0) totalSpend = foodSpend + imSpend;

  var cookPct = totalSpend > 0 ? Math.round((imSpend / totalSpend) * 100) : 50;
  var orderPct = totalSpend > 0 ? Math.round((foodSpend / totalSpend) * 100) : 50;

  var donut = document.getElementById('xray-donut');
  if (donut) {
    donut.innerHTML = '<div class="xray-donut" style="background:conic-gradient(var(--green) 0% ' + cookPct + '%, var(--orange) ' + cookPct + '% ' + (cookPct + orderPct) + '%, #6B4EFF ' + (cookPct + orderPct) + '% 100%)"><div class="xray-donut-inner"><span class="xray-donut-total">₹' + totalSpend + '</span><span class="xray-donut-label">total spend</span></div></div>' +
      '<div class="xray-legend"><div class="xray-legend-item"><span class="xray-legend-dot" style="background:var(--green)"></span>Instamart ₹' + imSpend + '</div>' +
      '<div class="xray-legend-item"><span class="xray-legend-dot" style="background:var(--orange)"></span>Food ₹' + foodSpend + '</div></div>';
  }

  var stats = document.getElementById('xray-stats');
  if (stats) {
    stats.innerHTML = '<div class="xray-stat-card"><div class="xray-stat-value">' + (foodOrders.length + imOrders.length) + '</div><div class="xray-stat-label">Total Orders</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">₹' + (totalSpend > 0 ? Math.round(totalSpend / Math.max(1, foodOrders.length + imOrders.length)) : 0) + '</div><div class="xray-stat-label">Avg Order Value</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">' + foodOrders.length + '</div><div class="xray-stat-label">Food Orders</div></div>' +
      '<div class="xray-stat-card"><div class="xray-stat-value">' + imOrders.length + '</div><div class="xray-stat-label">Instamart Orders</div></div>';
  }

  var insight = document.getElementById('xray-insight');
  if (insight && foodOrders.length > 0) {
    var avgFood = Math.round(foodSpend / Math.max(1, foodOrders.length));
    insight.innerHTML = '<h4>Real Spending Insight</h4><p>Your average Swiggy Food order is ₹' + avgFood +
      '. You\'ve placed ' + foodOrders.length + ' food orders and ' + imOrders.length + ' Instamart orders. ' +
      '<span class="savings-amount">Prism can save you 30-40% by switching some orders to cooking.</span></p>';
  }
}

// ─── F6: Pantry Awareness ─────────────────────────────────────────────────────

function loadPantry() {
  try { return JSON.parse(localStorage.getItem('prism_pantry') || '[]'); } catch { return []; }
}

function savePantry(items) {
  localStorage.setItem('prism_pantry', JSON.stringify(items));
}

// Smart pantry tracking — track usage, suggest replenishment
function loadPantryUsage() {
  try { return JSON.parse(localStorage.getItem('prism_pantry_usage') || '{}'); } catch { return {}; }
}

function trackPantryUsage(usedItems) {
  var usage = loadPantryUsage();
  var pantry = loadPantry();
  var depleted = [];

  usedItems.forEach(function(item) {
    var key = item.toLowerCase();
    if (!usage[key]) usage[key] = { count: 0, lastUsed: null };
    usage[key].count++;
    usage[key].lastUsed = new Date().toISOString();

    // After 3 uses, suggest replenishment (pantry item likely depleted)
    if (usage[key].count >= 3) {
      depleted.push(key);
      // Remove from pantry — it's probably used up
      var idx = pantry.indexOf(key);
      if (idx >= 0) {
        pantry.splice(idx, 1);
        prismLog('Pantry', 'Auto-removed "' + key + '" after ' + usage[key].count + ' uses — likely depleted');
      }
      usage[key].count = 0; // reset counter
    }
  });

  localStorage.setItem('prism_pantry_usage', JSON.stringify(usage));
  if (depleted.length > 0) {
    savePantry(pantry);
    initPantryChips();
  }
  return depleted;
}

function getPantryItemsUsedInRecipe(ingredients) {
  var pantry = loadPantry();
  if (pantry.length === 0 || !ingredients) return [];
  var used = [];
  pantry.forEach(function(p) {
    var pLower = p.toLowerCase();
    for (var i = 0; i < ingredients.length; i++) {
      var ingName = (ingredients[i].name || ingredients[i] || '').toLowerCase();
      if (ingName.includes(pLower) || pLower.includes(ingName)) {
        used.push(pLower);
        break;
      }
    }
  });
  return used;
}

function togglePantry(item) {
  var pantry = loadPantry();
  var idx = pantry.indexOf(item);
  if (idx >= 0) { pantry.splice(idx, 1); } else { pantry.push(item); }
  savePantry(pantry);
  // Update chip UI
  var chips = document.querySelectorAll('.pantry-chip');
  chips.forEach(function(c) {
    var name = c.textContent.trim().split(' ').pop().toLowerCase();
    if (pantry.indexOf(name) >= 0) c.classList.add('active');
    else c.classList.remove('active');
  });
  prismLog('Pantry', 'Updated pantry: ' + pantry.join(', '));
}

function initPantryChips() {
  var pantry = loadPantry();
  var chips = document.querySelectorAll('.pantry-chip');
  chips.forEach(function(c) {
    var words = c.textContent.trim().split(' ');
    var name = words[words.length - 1].toLowerCase();
    if (pantry.indexOf(name) >= 0) c.classList.add('active');
  });
}

// ─── F8: Dietary Compliance ───────────────────────────────────────────────────

var DIETARY_RULES = {
  veg: { exclude: ['chicken','mutton','fish','prawn','meat','beef','pork','lamb','keema','bacon','salami','sausage'], label: 'Veg' },
  nonveg: { exclude: [], label: 'Non-Veg' },
  eggetarian: { exclude: ['chicken','mutton','fish','prawn','meat','beef','pork','lamb','keema','bacon','salami','sausage'], label: 'Eggetarian' },
  keto: { exclude: ['rice','atta','bread','sugar','potato','maida','noodle','pasta','rava','oats','jaggery'], label: 'Keto' },
  vegan: { exclude: ['chicken','paneer','egg','fish','mutton','prawn','milk','cream','curd','butter','cheese','ghee','honey'], label: 'Vegan' },
  jain: { exclude: ['onion','garlic','potato','ginger','carrot','beet','turnip','egg','chicken','mutton','fish','prawn'], label: 'Jain' },
  diabetic: { exclude: ['sugar','jaggery','honey','maida','rice'], label: 'Diabetic' },
  glutenfree: { exclude: ['atta','maida','bread','pasta','noodle','rava','oats'], label: 'Gluten-free' },
};

function loadDietary() {
  try { return JSON.parse(localStorage.getItem('prism_dietary') || '[]'); } catch { return []; }
}

function toggleDietary(diet) {
  var prefs = loadDietary();
  var idx = prefs.indexOf(diet);
  if (idx >= 0) { prefs.splice(idx, 1); } else { prefs.push(diet); }
  localStorage.setItem('prism_dietary', JSON.stringify(prefs));
  // Update chip UI
  document.querySelectorAll('.dietary-chip').forEach(function(c) {
    if (prefs.indexOf(c.dataset.diet) >= 0) c.classList.add('active');
    else c.classList.remove('active');
  });
  prismLog('Dietary', 'Updated dietary: ' + prefs.join(', '));
}

function initDietaryChips() {
  var prefs = loadDietary();
  document.querySelectorAll('.dietary-chip').forEach(function(c) {
    if (prefs.indexOf(c.dataset.diet) >= 0) c.classList.add('active');
  });
}

function getDietaryExclusions() {
  var prefs = loadDietary();
  var excludes = [];
  prefs.forEach(function(p) {
    if (DIETARY_RULES[p]) excludes = excludes.concat(DIETARY_RULES[p].exclude);
  });
  return [...new Set(excludes)];
}

// ─── F2: Savings Calculator ──────────────────────────────────────────────────

function renderSavingsCalculator(result) {
  var cookOpt = result.options.find(function(o) { return o.channel === 'instamart'; });
  var orderOpt = result.options.find(function(o) { return o.channel === 'food'; });
  if (!cookOpt || !orderOpt || cookOpt.cost <= 0) return '';

  var diff = orderOpt.cost - cookOpt.cost;
  if (diff <= 0) return '';

  var freqDefaults = { foodie: 2, gymfreak: 4, balanced: 3, budget: 5 };
  var freq = freqDefaults[userPersona] || 3;
  var monthly = diff * freq * 4;

  return '<div class="savings-calc">' +
    '<h4>Cook vs Order Savings</h4>' +
    '<p>You save <span class="savings-big">₹' + diff + '</span> per meal by cooking at home</p>' +
    '<div class="savings-freq">' +
    '<span>If you cook</span>' +
    '<input type="number" id="savings-freq" value="' + freq + '" min="1" max="7" onchange="updateSavings(' + diff + ')">' +
    '<span>times/week = <strong style="color:var(--green)">₹' + monthly + '/month saved</strong></span>' +
    '</div></div>';
}

function updateSavings(diff) {
  var freq = parseInt(document.getElementById('savings-freq').value) || 3;
  var monthly = diff * freq * 4;
  var container = document.querySelector('.savings-freq strong');
  if (container) container.textContent = '₹' + monthly + '/month saved';
}

// ─── F7: Price Alerts ─────────────────────────────────────────────────────────

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem('prism_alerts') || '[]'); } catch { return []; }
}

function createPriceAlert(dish, channel, currentPrice) {
  var alerts = loadAlerts();
  if (alerts.length >= 5) { alert('Maximum 5 alerts allowed'); return; }
  var targetPrice = prompt('Alert me when "' + dish + '" drops below ₹', Math.round(currentPrice * 0.8));
  if (!targetPrice) return;
  alerts.push({ dish: dish, channel: channel, targetPrice: parseInt(targetPrice), currentPrice: currentPrice, created: Date.now(), active: true });
  localStorage.setItem('prism_alerts', JSON.stringify(alerts));
  prismLog('Alert', 'Created alert: ' + dish + ' < ₹' + targetPrice);
}

async function checkPriceAlerts() {
  var alerts = loadAlerts().filter(function(a) { return a.active; });
  if (alerts.length === 0) return;

  var items = alerts.map(function(a) { return a.dish; }).join(',');
  var prices = [];

  try {
    var useServer = await checkServer();
    if (useServer) {
      var r = await fetch(API + '/api/check-prices?items=' + encodeURIComponent(items));
      var d = await r.json();
      if (d.success) prices = d.prices;
    } else {
      // Mock: add random variance
      alerts.forEach(function(a) {
        prices.push({ dish: a.dish, price: Math.round(a.currentPrice * (0.85 + Math.random() * 0.3)), restaurant: 'Local' });
      });
    }
  } catch { return; }

  // Check for triggered alerts
  for (var i = 0; i < alerts.length; i++) {
    var priceInfo = prices.find(function(p) { return p.dish === alerts[i].dish; });
    if (priceInfo && priceInfo.price > 0 && priceInfo.price <= alerts[i].targetPrice) {
      showAlertBanner(alerts[i].dish, priceInfo.price, priceInfo.restaurant);
      break; // show one at a time
    }
  }
}

function showAlertBanner(dish, price, restaurant) {
  var banner = document.getElementById('alert-banner');
  if (!banner) return;
  banner.innerHTML = '🔔 ' + dish + ' dropped to ₹' + price + (restaurant ? ' at ' + restaurant : '') + '! Tap to order' +
    '<button class="alert-dismiss" onclick="dismissAlert()">×</button>';
  banner.style.display = 'flex';
  banner.onclick = function(e) { if (e.target.tagName !== 'BUTTON') { dismissAlert(); quickDecision(dish); } };
}

function dismissAlert() {
  var banner = document.getElementById('alert-banner');
  if (banner) banner.style.display = 'none';
}

// ─── F3: Meal Planning ────────────────────────────────────────────────────────

async function generateMealPlan() {
  var budget = parseInt(document.getElementById('mp-budget').value) || 3500;
  var persona = userPersona || 'balanced';
  var grid = document.getElementById('mp-grid');
  var summary = document.getElementById('mp-summary');
  if (!grid) return;

  grid.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-sec)">Generating your meal plan...</div>';

  var plan = null;
  try {
    var useServer = await checkServer();
    if (useServer) {
      var r = await fetch(API + '/api/meal-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: persona, weeklyBudget: budget, servings: 2, dietaryPrefs: loadDietary() })
      });
      var d = await r.json();
      if (d.success) plan = d;
    }
  } catch { /* fall back to client */ }

  if (!plan) {
    // Client-side generation
    plan = generateClientMealPlan(persona, budget);
  }

  renderMealPlanGrid(plan, grid, summary);
}

function generateClientMealPlan(persona, budget) {
  var BREAKFAST = ['🥞 Dosa','🍳 Omelette','🫓 Paratha','🥣 Poha','🍞 Sandwich','🥣 Upma','🧇 Idli'];
  var LUNCH = ['🫘 Dal Tadka','🫘 Rajma Chawal','🍚 Biryani','🍛 Thali','🍚 Fried Rice','🥬 Palak Paneer','🫛 Chole'];
  var DINNER = ['🍗 Butter Chicken','🧀 Paneer Tikka','🍝 Pasta','🍜 Noodles','🫛 Chole Bhature','🥚 Egg Curry','🥔 Aloo Gobi'];

  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var plan = [];
  var bBudget = Math.round(budget * 0.2 / 7);
  var lBudget = Math.round(budget * 0.35 / 7);
  var dBudget = Math.round(budget * 0.45 / 7);

  for (var d = 0; d < 7; d++) {
    var bCh = 'instamart', lCh = d % 3 === 0 ? 'food' : 'instamart', dCh = d % 7 === 5 ? 'dineout' : d % 2 === 0 ? 'food' : 'instamart';
    plan.push(
      { day: days[d], meal: 'breakfast', dish: BREAKFAST[d % BREAKFAST.length], channel: bCh, cost: Math.round(bBudget * (0.7 + Math.random() * 0.6)) },
      { day: days[d], meal: 'lunch', dish: LUNCH[d % LUNCH.length], channel: lCh, cost: Math.round(lBudget * (0.7 + Math.random() * 0.6)) },
      { day: days[d], meal: 'dinner', dish: DINNER[d % DINNER.length], channel: dCh, cost: Math.round(dBudget * (0.7 + Math.random() * 0.6)) }
    );
  }
  var totalCost = plan.reduce(function(s,p){return s+p.cost},0);
  var cookCount = plan.filter(function(p){return p.channel==='instamart'}).length;
  var orderCount = plan.filter(function(p){return p.channel==='food'}).length;
  var dineCount = plan.filter(function(p){return p.channel==='dineout'}).length;
  return { plan:plan, totalCost:totalCost, weeklyBudget:budget, channelSplit:{cook:cookCount,order:orderCount,dine:dineCount} };
}

function renderMealPlanGrid(data, grid, summary) {
  var channelNames = { instamart:'🍳 Cook', food:'🛵 Order', dineout:'🍽️ Dine' };
  var mealLabels = { breakfast:'☀️', lunch:'☀️', dinner:'🌙' };
  var html = '';

  // Group by day
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  for (var d = 0; d < days.length; d++) {
    var dayMeals = data.plan.filter(function(p) { return p.day === days[d]; });
    if (dayMeals.length === 0) {
      // Old format — single meal per day
      var p = data.plan[d];
      if (!p) continue;
      html += '<div class="mp-day ch-' + p.channel + '">';
      html += '<div class="mp-day-label">' + p.day + '</div>';
      html += '<div class="mp-day-info"><div class="mp-day-dish">' + p.dish + '</div><div class="mp-day-channel">' + (channelNames[p.channel]||p.channel) + '</div></div>';
      html += '<div class="mp-day-cost">₹' + p.cost + '</div>';
      html += '<button class="mp-day-swap" onclick="swapMealDay(' + d + ')">Swap</button>';
      html += '</div>';
      continue;
    }

    // New format — breakfast/lunch/dinner per day
    html += '<div class="mp-day-group">';
    html += '<div class="mp-day-header">' + days[d] + '</div>';
    for (var m = 0; m < dayMeals.length; m++) {
      var meal = dayMeals[m];
      var idx = data.plan.indexOf(meal);
      html += '<div class="mp-meal ch-' + meal.channel + '">';
      html += '<div class="mp-meal-type">' + (mealLabels[meal.meal] || '') + ' ' + (meal.meal || '').charAt(0).toUpperCase() + (meal.meal || '').slice(1) + '</div>';
      html += '<div class="mp-meal-dish">' + meal.dish + '</div>';
      html += '<div class="mp-meal-meta">' + (channelNames[meal.channel]||meal.channel) + '</div>';
      html += '<div class="mp-meal-cost">₹' + meal.cost + '</div>';
      html += '<button class="mp-day-swap" onclick="swapMealDay(' + idx + ')">↻</button>';
      html += '<button class="mp-day-order" onclick="orderMealItem(\'' + meal.dish.replace(/[^\w\s]/g, '').trim() + '\')">→</button>';
      html += '</div>';
    }
    html += '</div>';
  }
  grid.innerHTML = html;

  if (summary) {
    var split = data.channelSplit || {};
    var overBudget = data.totalCost > data.weeklyBudget;
    summary.innerHTML = '<div class="mp-summary-row"><span>Total</span><span class="mp-summary-total">₹' + data.totalCost + '</span></div>' +
      '<div class="mp-summary-row"><span>Budget</span><span>₹' + data.weeklyBudget + '</span></div>' +
      '<div class="mp-summary-row"><span>Split</span><span>Cook ' + (split.cook||0) + ' · Order ' + (split.order||0) + ' · Dine ' + (split.dine||0) + '</span></div>' +
      (overBudget ? '<div style="color:#E04F5F;font-size:11px;margin-top:6px">⚠ Over budget by ₹' + (data.totalCost - data.weeklyBudget) + '</div>' : '<div style="color:var(--green);font-size:11px;margin-top:6px">✓ Within budget</div>');
  }

  // Cache plan
  localStorage.setItem('prism_meal_plan', JSON.stringify(data));
}

function orderMealItem(dish) {
  navigateTo('screen-smart-search');
  quickDecision(dish + ' for 2, budget 500');
}

function swapMealDay(idx) {
  var cached = localStorage.getItem('prism_meal_plan');
  if (!cached) return;
  var data = JSON.parse(cached);
  var POOLS = {
    breakfast: ['🥞 Dosa','🍳 Omelette','🫓 Paratha','🥣 Poha','🍞 Sandwich','🥣 Upma','🧇 Idli','🥞 Cheela','🍳 Egg Bhurji'],
    lunch: ['🫘 Dal Tadka','🫘 Rajma Chawal','🍚 Biryani','🍛 Thali','🍚 Fried Rice','🥬 Palak Paneer','🫛 Chole','🍛 Kadhi Chawal'],
    dinner: ['🍗 Butter Chicken','🧀 Paneer Tikka','🍝 Pasta','🍜 Noodles','🫛 Chole Bhature','🥚 Egg Curry','🥔 Aloo Gobi','🍗 Tandoori Chicken']
  };
  var meal = data.plan[idx];
  var pool = POOLS[meal.meal] || POOLS.dinner;
  meal.dish = pool[Math.floor(Math.random() * pool.length)];
  meal.cost = Math.round(meal.cost * (0.8 + Math.random() * 0.4));
  data.totalCost = data.plan.reduce(function(s, p) { return s + p.cost; }, 0);
  localStorage.setItem('prism_meal_plan', JSON.stringify(data));
  renderMealPlanGrid(data, document.getElementById('mp-grid'), document.getElementById('mp-summary'));
}

// ─── F4: Social Sharing / Prism Wrapped ───────────────────────────────────────

function shareWrapped() {
  var canvas = document.getElementById('wrapped-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stats = getWrappedStats();
  var persona = PERSONA_CONFIG[userPersona || 'balanced'];

  // Draw branded card
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 400, 600);

  // Gradient accent
  var grad = ctx.createLinearGradient(0, 0, 400, 200);
  grad.addColorStop(0, '#FC8019');
  grad.addColorStop(1, '#FF6B35');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 180);

  // Title
  ctx.fillStyle = 'white';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Swiggy Prism', 200, 60);
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('Your Monthly Food Story', 200, 85);

  // Persona
  ctx.font = '40px sans-serif';
  ctx.fillText(persona ? persona.emoji : '⚖️', 200, 145);
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(persona ? persona.label : 'Balanced', 200, 170);

  // Savings
  ctx.fillStyle = '#FC8019';
  ctx.font = 'bold 64px Inter, sans-serif';
  ctx.fillText(stats.savingsPct + '%', 200, 280);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('saved on food this month', 200, 310);

  // Stats
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px Inter, sans-serif';
  ctx.fillText(stats.sessions + ' orders · ₹' + stats.totalSpent + ' spent · ₹' + stats.totalBudget + ' budget', 200, 370);

  // Budget bar
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(40, 400, 320, 8);
  ctx.fillStyle = '#FC8019';
  var pct = Math.min(1, stats.totalSpent / Math.max(1, stats.totalBudget));
  ctx.fillRect(40, 400, 320 * pct, 8);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Inter, sans-serif';
  ctx.fillText('Powered by Swiggy Prism · ' + new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), 200, 560);

  // Show share modal
  var preview = document.getElementById('share-preview');
  if (preview) preview.innerHTML = '<img src="' + canvas.toDataURL('image/png') + '" alt="Prism Wrapped">';
  var modal = document.getElementById('share-modal');
  if (modal) modal.style.display = 'flex';
}

function downloadWrapped() {
  var canvas = document.getElementById('wrapped-canvas');
  if (!canvas) return;
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'prism-wrapped-' + new Date().toISOString().split('T')[0] + '.png';
  a.click();
}

function shareToWhatsApp() {
  var text = 'Check out my Swiggy Prism Wrapped! I saved ' + getWrappedStats().savingsPct + '% on food this month 🔥';
  if (navigator.share) {
    var canvas = document.getElementById('wrapped-canvas');
    canvas.toBlob(function(blob) {
      var file = new File([blob], 'prism-wrapped.png', { type: 'image/png' });
      navigator.share({ text: text, files: [file] }).catch(function() {});
    });
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
}

function closeShareModal() {
  var modal = document.getElementById('share-modal');
  if (modal) modal.style.display = 'none';
}

// ─── F5: Group Ordering ───────────────────────────────────────────────────────

async function generateGroupOrder() {
  var guests = parseInt(document.getElementById('group-guests').value) || 8;
  var budget = parseInt(document.getElementById('group-budget').value) || 3000;
  var container = document.getElementById('group-result');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-sec)">Planning your party...</div>';

  var result = null;
  try {
    var useServer = await checkServer();
    if (useServer) {
      var r = await fetch(API + '/api/group-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings: guests, budget: budget, persona: userPersona || 'balanced' })
      });
      var d = await r.json();
      if (d.success) result = d;
    }
  } catch { /* fall back */ }

  if (!result) {
    result = generateClientGroupOrder(guests, budget);
  }

  renderGroupOrder(result, container);
}

function generateClientGroupOrder(guests, budget) {
  var appetBudget = Math.round(budget * 0.3);
  var mainBudget = Math.round(budget * 0.5);
  var dessertBudget = Math.round(budget * 0.2);

  var POOLS = {
    appetizer: ['Paneer Tikka','Aloo Tikki','Masala Papad','Samosa','Hara Bhara Kebab','Spring Roll','Dahi Vada','Papdi Chaat'],
    main: ['Butter Chicken + Naan','Dal Makhani + Roti','Rajma Chawal','Chole Bhature','Kadhai Paneer + Naan','Veg Biryani','Chicken Biryani','Thali'],
    dessert: ['Gulab Jamun','Rasmalai','Gajar Halwa','Ice Cream','Jalebi','Kheer']
  };
  function pick(arr, n) { var s=[].concat(arr); for(var i=s.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=s[i];s[i]=s[j];s[j]=t;} return s.slice(0,n); }

  var appItems = pick(POOLS.appetizer, 3).map(function(n,i) { return { name:n, channel:'instamart', cost:Math.round(appetBudget*[0.4,0.35,0.25][i]), type:'appetizer' }; });
  var mainItems = pick(POOLS.main, 2).map(function(n,i) { return { name:n, channel:'food', cost:Math.round(mainBudget*[0.6,0.4][i]), type:'main' }; });
  var dessItems = pick(POOLS.dessert, 2).map(function(n,i) { return { name:n, channel:i===0?'food':'instamart', cost:Math.round(dessertBudget*0.5), type:'dessert' }; });
  var items = appItems.concat(mainItems).concat(dessItems);
  var totalCost = items.reduce(function(s,i){return s+i.cost},0);
  var foodTotal = items.filter(function(i){return i.channel==='food'}).reduce(function(s,i){return s+i.cost},0);
  return { items:items, totalCost:totalCost, perPerson:Math.round(totalCost/guests), budget:budget, servings:guests,
    overBudget:totalCost>budget, foodCartWarning:foodTotal>1000?'Food cart exceeds ₹1000 limit':null,
    split:{appetizers:appetBudget,mains:mainBudget,desserts:dessertBudget} };
}

function orderGroupItem(dish, guests) {
  navigateTo('screen-smart-search');
  quickDecision(dish + ' for ' + guests + ', budget ' + Math.round(guests * 150));
}

function getGroupEmoji(name) {
  var n = (name || '').toLowerCase();
  if (n.indexOf('paneer') !== -1) return '🧀';
  if (n.indexOf('tikki') !== -1) return '🥔';
  if (n.indexOf('papad') !== -1) return '🫓';
  if (n.indexOf('chicken') !== -1) return '🍗';
  if (n.indexOf('biryani') !== -1) return '🍚';
  if (n.indexOf('naan') !== -1) return '🫓';
  if (n.indexOf('gulab') !== -1) return '🍮';
  if (n.indexOf('ice cream') !== -1) return '🍨';
  if (n.indexOf('dal') !== -1) return '🫘';
  if (n.indexOf('rice') !== -1) return '🍚';
  return '🍽️';
}

function renderGroupOrder(result, container) {
  var channelLabels = { instamart:'Cook', food:'Order' };
  var types = { appetizer:'🍢 Appetizers (Cook at Home)', main:'🍛 Main Course (Order Delivery)', dessert:'🍮 Desserts' };
  var html = '';

  ['appetizer','main','dessert'].forEach(function(type) {
    var typeItems = result.items.filter(function(i){return i.type===type});
    if (typeItems.length === 0) return;
    html += '<div class="group-course"><div class="group-course-label">' + (types[type]||type) + '</div>';
    typeItems.forEach(function(item) {
      var chClass = item.channel === 'instamart' ? 'ch-cook' : 'ch-order';
      var emoji = getGroupEmoji(item.name);
      var dishName = item.name.replace(/\s*\+\s*\w+$/, ''); // "Butter Chicken + Naan" → "Butter Chicken"
      var guests = result.servings || 4;
      html += '<div class="group-item" onclick="orderGroupItem(\'' + dishName.replace(/'/g, "\\'") + '\',' + guests + ')" style="cursor:pointer">';
      html += '<span style="font-size:20px;flex-shrink:0">' + emoji + '</span><div class="group-item-name">' + item.name + '</div>';
      html += '<span class="group-item-channel ' + chClass + '">' + (channelLabels[item.channel]||item.channel) + '</span>';
      html += '<div class="group-item-cost">₹' + item.cost + '</div>';
      html += '<span style="font-size:12px;color:var(--orange);flex-shrink:0">→</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  html += '<div class="group-summary">';
  html += '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700"><span>Total</span><span>₹' + result.totalCost + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-sec);margin-top:4px"><span>' + result.servings + ' guests</span><span>₹' + result.perPerson + '/person</span></div>';
  if (result.overBudget) html += '<div style="color:var(--red);font-size:11px;margin-top:6px">⚠ Over budget by ₹' + (result.totalCost - result.budget) + '</div>';
  else html += '<div style="color:var(--green);font-size:11px;margin-top:6px">✓ Within ₹' + result.budget + ' budget</div>';
  html += '</div>';

  if (result.foodCartWarning) html += '<div class="group-warning">⚠ ' + result.foodCartWarning + '</div>';

  container.innerHTML = html;
}

// ─── F4: YouTube Recipe URL Parsing ───────────────────────────────────────────

async function parseVideoUrl() {
  var input = document.getElementById('video-url-input');
  var status = document.getElementById('video-parse-status');
  if (!input || !status) return;
  var url = input.value.trim();
  if (!url) { status.textContent = 'Paste a YouTube URL'; status.style.color = '#E04F5F'; return; }

  status.textContent = 'Extracting recipe from video...';
  status.style.color = 'var(--orange)';

  try {
    var useServer = await checkServer();
    if (useServer) {
      var r = await fetch(API + '/api/parse-video?url=' + encodeURIComponent(url));
      var d = await r.json();
      if (d.success && d.recipe) {
        status.innerHTML = '<span style="color:var(--green)">Found: ' + d.recipe + '</span>';
        // Auto-search with the extracted recipe
        setTimeout(function() { navigateTo('screen-smart-search'); quickDecision(d.recipe); }, 1000);
        return;
      } else {
        status.textContent = d.error || 'Could not extract recipe from this video';
        status.style.color = '#E04F5F';
      }
    } else {
      // Mock: extract dish name from URL
      var mockDish = 'butter chicken';
      if (url.toLowerCase().indexOf('biryani') !== -1) mockDish = 'biryani';
      else if (url.toLowerCase().indexOf('paneer') !== -1) mockDish = 'paneer tikka';
      else if (url.toLowerCase().indexOf('dal') !== -1) mockDish = 'dal tadka';
      status.innerHTML = '<span style="color:var(--green)">Found: ' + mockDish + ' recipe</span>';
      setTimeout(function() { navigateTo('screen-smart-search'); quickDecision(mockDish + ' for 4, budget 800'); }, 1000);
    }
  } catch(e) {
    status.textContent = 'Error: ' + (e.message || 'Failed to parse');
    status.style.color = '#E04F5F';
  }
}

// ─── Init all new features ───────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function() {
  initPantryChips();
  initDietaryChips();
  checkPriceAlerts();
});
