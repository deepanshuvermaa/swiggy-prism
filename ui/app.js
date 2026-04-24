const API_BASE = window.location.origin;

const EMOJI_MAP = {
  chicken: "🍗", paneer: "🧀", mutton: "🥩", fish: "🐟", egg: "🥚",
  prawn: "🦐", dal: "🫘", lentil: "🫘", rajma: "🫘", chole: "🫘", chana: "🫘",
  milk: "🥛", cream: "🍶", curd: "🥛", yogurt: "🥛", butter: "🧈",
  cheese: "🧀", ghee: "🫕",
  onion: "🧅", tomato: "🍅", potato: "🥔", garlic: "🧄", ginger: "🫚",
  capsicum: "🫑", carrot: "🥕", peas: "🫛", spinach: "🥬", palak: "🥬",
  cauliflower: "🥦", brinjal: "🍆", beans: "🫛", cabbage: "🥬",
  cucumber: "🥒", lemon: "🍋", mint: "🌿", coriander: "🌿",
  rice: "🍚", atta: "🌾", flour: "🌾", maida: "🌾", bread: "🍞",
  pasta: "🍝", noodle: "🍜", oats: "🥣", rava: "🌾",
  oil: "🫒", olive: "🫒", coconut: "🥥",
  salt: "🧂", turmeric: "✨", cumin: "✨", chili: "🌶️", chilli: "🌶️",
  pepper: "✨", masala: "✨", cinnamon: "✨", cardamom: "✨", kasuri: "🌿",
  biryani: "✨",
  sugar: "🍬", honey: "🍯", jaggery: "🍬",
  ketchup: "🍅", soy: "🫗", vinegar: "🫗",
};

function getEmoji(name) {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return "🛒";
}

let currentCart = null;
let currentIngredients = null;

// navigation
function navigateTo(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");

  if (screenId === "screen-cart" && currentCart) renderCart(currentCart);
  if (screenId === "screen-summary" && currentCart) renderSummary(currentCart);
}

// extract budget from prompt text
function extractBudget(text) {
  // look for ₹ or rs or rupees followed by number
  const match = text.match(/(?:₹|rs\.?|rupees?)\s*(\d[\d,]*)/i)
    || text.match(/(\d[\d,]*)\s*(?:₹|rs\.?|rupees?|budget)/i);
  if (match) return parseInt(match[1].replace(/,/g, ""), 10);

  // standalone large numbers likely budget
  const nums = text.match(/\b(\d{3,5})\b/g);
  if (nums) return parseInt(nums[nums.length - 1], 10);

  return 800; // sensible default
}

// ===== CHAT =====

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatBubble(text, "user");
  input.value = "";

  await processRecipeRequest(text);
}

async function processRecipeRequest(text) {
  const indicator = document.getElementById("parsing-indicator");
  indicator.classList.add("visible");
  resetParsingAnimation();

  addTypingIndicator();

  const budget = extractBudget(text);

  // step 1: parse
  let ingredients;
  try {
    const parseRes = await fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });
    const parseData = await parseRes.json();

    removeTypingIndicator();

    if (!parseData.success) {
      indicator.classList.remove("visible");
      addChatBubble(`Something went wrong: ${parseData.error}`, "bot");
      return;
    }

    ingredients = parseData.ingredients;
    currentIngredients = ingredients;

    const llmNote = parseData.usedLLM ? "AI-parsed" : "matched from recipe database";
    addChatBubble(
      `Found <strong>${ingredients.length} ingredients</strong> (${llmNote}). ` +
      `Searching Instamart for best-value SKUs...`,
      "bot"
    );
  } catch (err) {
    removeTypingIndicator();
    indicator.classList.remove("visible");
    addChatBubble("Could not reach the server. Make sure it's running on localhost:3000.", "bot");
    return;
  }

  // step 2: optimize
  addTypingIndicator();

  try {
    const optRes = await fetch(`${API_BASE}/api/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, budget }),
    });
    const optData = await optRes.json();

    removeTypingIndicator();
    indicator.classList.remove("visible");

    if (!optData.success) {
      addChatBubble(`Optimization failed: ${optData.error}`, "bot");
      return;
    }

    currentCart = formatCart(optData.cart, budget);
    addCartReadyBubble(currentCart);
  } catch (err) {
    removeTypingIndicator();
    indicator.classList.remove("visible");
    addChatBubble("Optimization request failed.", "bot");
  }
}

function formatCart(rawCart, budget) {
  return {
    budget: rawCart.budget,
    totalCost: rawCart.totalCost,
    budgetUtilization: rawCart.budgetUtilization,
    items: rawCart.items.map((item) => ({
      name: item.sku.name,
      brand: item.sku.brand,
      price: item.sku.price,
      count: item.count,
      priority: mapPriority(item.ingredient.priority),
      ingredient: item.ingredient.name,
      totalPrice: item.totalPrice,
    })),
    droppedItems: rawCart.droppedItems || [],
    meta: rawCart.meta,
  };
}

function mapPriority(p) {
  if (p === "essential") return "essential";
  if (p === "important") return "recipe";
  return "staple";
}

function addChatBubble(text, type) {
  const body = document.getElementById("chat-body");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;

  if (type === "bot") {
    bubble.innerHTML = `
      <div class="bot-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#FC8019"><polygon points="12,2 22,20 2,20"/></svg>
      </div>
      <div class="bubble-content">${text}</div>
    `;
  } else {
    bubble.innerHTML = `<div class="bubble-content">${text}</div>`;
  }

  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function addCartReadyBubble(cart) {
  const body = document.getElementById("chat-body");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot";

  const pct = Math.round(cart.budgetUtilization * 100);
  const dropped = cart.droppedItems.length > 0
    ? `<br><span style="font-size:12px;color:#666">${cart.droppedItems.length} item(s) dropped to fit budget.</span>`
    : "";

  bubble.innerHTML = `
    <div class="bot-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#FC8019"><polygon points="12,2 22,20 2,20"/></svg>
    </div>
    <div class="bubble-content">
      <strong>Cart optimized!</strong><br>
      ₹${cart.totalCost.toLocaleString()} / ₹${cart.budget.toLocaleString()} — ${cart.items.length} items (${pct}% utilized).
      ${dropped}<br><br>
      <span style="font-size:11px;color:#999">Optimized in ${cart.meta.optimizationTimeMs}ms | ${cart.meta.totalSkusEvaluated} SKUs evaluated</span><br><br>
      <button onclick="navigateTo('screen-cart')" style="
        background: #FC8019; color: white; border: none; padding: 8px 20px;
        border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer;
        font-family: inherit;
      ">View Optimized Cart →</button>
    </div>
  `;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function addTypingIndicator() {
  const body = document.getElementById("chat-body");
  if (body.querySelector(".typing-indicator")) return;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot typing-indicator";
  bubble.innerHTML = `
    <div class="bot-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#FC8019"><polygon points="12,2 22,20 2,20"/></svg>
    </div>
    <div class="bubble-content">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.querySelector(".typing-indicator");
  if (indicator) indicator.remove();
}

function resetParsingAnimation() {
  const fill = document.querySelector(".parsing-fill");
  fill.style.animation = "none";
  fill.offsetHeight;
  fill.style.animation = "parse 3s ease-in-out forwards";
}

// ===== CART RENDERING =====

function renderCart(cart) {
  document.getElementById("cart-total-badge").textContent = `₹${cart.totalCost.toLocaleString()}`;
  document.getElementById("cart-budget-badge").textContent = `₹${cart.budget.toLocaleString()}`;

  const badge = document.getElementById("budget-badge");
  badge.classList.toggle("over-budget", cart.totalCost > cart.budget);

  const pct = Math.round(cart.budgetUtilization * 100);
  document.getElementById("budget-bar").style.width = `${pct}%`;

  const essentials = cart.items.filter((i) => i.priority === "essential");
  const recipe = cart.items.filter((i) => i.priority === "recipe");
  const staples = cart.items.filter((i) => i.priority === "staple");

  renderSKUGrid("essentials-grid", essentials);
  renderSKUGrid("recipe-grid", recipe);
  renderSKUGrid("staples-grid", staples);

  // hide empty categories
  document.getElementById("essentials-grid").closest(".category-block").style.display = essentials.length ? "" : "none";
  document.getElementById("recipe-grid").closest(".category-block").style.display = recipe.length ? "" : "none";
  document.getElementById("staples-grid").closest(".category-block").style.display = staples.length ? "" : "none";
}

function renderSKUGrid(gridId, items) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "sku-card";
    card.innerHTML = `
      <div class="sku-check">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      <span class="sku-emoji">${getEmoji(item.ingredient)}</span>
      <div class="sku-name">${item.name}</div>
      <div class="sku-price">₹${item.totalPrice.toFixed(0)}</div>
    `;
    grid.appendChild(card);
  });
}

function togglePanel() {
  document.getElementById("value-panel").classList.toggle("visible");
}

// ===== SUMMARY =====

function renderSummary(cart) {
  document.getElementById("summary-total").textContent = `₹${cart.totalCost.toLocaleString()}`;

  const container = document.getElementById("summary-items");
  container.innerHTML = "";

  const showItems = cart.items.slice(0, 6);
  showItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <span class="summary-item-emoji">${getEmoji(item.ingredient)}</span>
      <div class="summary-item-info">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-detail">${item.brand} x${item.count}</div>
      </div>
      <span class="summary-item-price">₹${item.totalPrice.toFixed(0)}</span>
    `;
    container.appendChild(div);
  });

  if (cart.items.length > 6) {
    const more = document.createElement("div");
    more.className = "summary-item";
    more.innerHTML = `
      <span class="summary-item-emoji">📦</span>
      <div class="summary-item-info">
        <div class="summary-item-name">+${cart.items.length - 6} more items</div>
        <div class="summary-item-detail">View full cart</div>
      </div>
      <span class="summary-item-price"></span>
    `;
    container.appendChild(more);
  }

  // update share card savings
  const savings = Math.round((1 - cart.budgetUtilization) * 100);
  const shareText = document.querySelector(".share-text");
  if (shareText) {
    shareText.innerHTML = `I optimized my weekly<br>groceries by <strong>${savings > 0 ? savings : 2}%</strong> using<br>Swiggy Prism.`;
  }
}

function placeOrder() {
  const screen = document.getElementById("screen-summary");
  const overlay = document.createElement("div");
  overlay.className = "order-success";
  overlay.innerHTML = `
    <div class="success-check">
      <svg viewBox="0 0 24 24" fill="#39A06F"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    </div>
    <h2>Order Placed!</h2>
    <p>Your optimized cart is on its way via Swiggy MCP.</p>
  `;
  screen.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3000);
}

function shareStory() {
  const card = document.getElementById("share-card");
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "successPop 0.5s ease, cardFloat 3s ease-in-out 0.5s infinite";
}

// ===== VIDEO CAPTURE =====

const VIDEO_RECIPES = [
  {
    platform: "youtube",
    channel: "Ranveer Brar",
    title: "Restaurant Style Butter Chicken at Home",
    thumbnail: "",
    recipeText: "butter chicken for 4 people budget 800 rupees",
  },
  {
    platform: "youtube",
    channel: "Kunal Kapur",
    title: "Hyderabadi Chicken Biryani - Step by Step",
    thumbnail: "",
    title2: "Biryani",
    recipeText: "chicken biryani for 4 people budget 1200",
  },
  {
    platform: "instagram",
    channel: "cook_with_siddhi",
    title: "Quick Paneer Tikka in 15 Minutes!",
    thumbnail: "",
    recipeText: "paneer tikka for 3 people budget 600",
  },
  {
    platform: "youtube",
    channel: "Hebbars Kitchen",
    title: "Dal Tadka - Easy Comfort Food Recipe",
    thumbnail: "",
    recipeText: "dal tadka for 4 people budget 400",
  },
  {
    platform: "instagram",
    channel: "foodie_mumbai",
    title: "Chole Bhature - Street Style at Home",
    thumbnail: "",
    recipeText: "chole bhature for 4 people budget 500",
  },
  {
    platform: "youtube",
    channel: "Chef Sanjyot Keer",
    title: "Egg Fried Rice - 10 Minute Meal",
    thumbnail: "",
    recipeText: "egg fried rice for 3 people budget 350",
  },
];

function renderVideoFeed() {
  const feed = document.getElementById("video-feed");
  if (!feed) return;
  feed.innerHTML = "";

  VIDEO_RECIPES.forEach((video, idx) => {
    const card = document.createElement("div");
    card.className = "video-card";
    const icon = video.platform === "youtube"
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.8zM9.5 15.6V8.4L16 12l-6.5 3.6z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="#E4405F"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.5.2 5 1.7 5.1 5.1.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.2 3.4-1.7 5-5.1 5.1-1.3.1-1.6.1-4.8.1-3.2 0-3.6 0-4.8-.1-3.5-.2-5-1.7-5.1-5.1-.1-1.3-.1-1.6-.1-4.8 0-3.2 0-3.6.1-4.8C2.3 3.9 3.8 2.3 7.2 2.2c1.3 0 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z"/></svg>`;

    card.innerHTML = `
      <div class="video-thumbnail">
        <div class="video-play">▶</div>
      </div>
      <div class="video-info">
        <div class="video-platform">${icon} <span>${video.channel}</span></div>
        <div class="video-title">${video.title}</div>
      </div>
      <button class="video-capture-btn" onclick="captureFromVideo(${idx})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FC8019"><polygon points="12,2 22,20 2,20"/></svg>
        Send to Prism
      </button>
    `;
    feed.appendChild(card);
  });
}

async function captureFromVideo(idx) {
  const video = VIDEO_RECIPES[idx];

  // switch to chat screen
  navigateTo("screen-chat");

  // show the captured message
  addChatBubble(
    `<span style="font-size:11px;color:rgba(255,255,255,0.7)">📱 Captured from ${video.platform === "youtube" ? "YouTube" : "Instagram"} — ${video.channel}</span><br>${video.recipeText}`,
    "user"
  );

  // process it
  await processRecipeRequest(video.recipeText);
}

// ===== INIT =====

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  renderVideoFeed();
});
