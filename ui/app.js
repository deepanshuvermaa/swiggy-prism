// emoji map for SKU display — keeps it visual without needing image assets
const EMOJI_MAP = {
  chicken: "🍗", paneer: "🧀", mutton: "🥩", fish: "🐟", egg: "🥚",
  prawn: "🦐", dal: "🫘", lentil: "🫘", rajma: "🫘", chole: "🫘",
  milk: "🥛", cream: "🍶", curd: "🥛", yogurt: "🥛", butter: "🧈",
  cheese: "🧀", ghee: "🫕",
  onion: "🧅", tomato: "🍅", potato: "🥔", garlic: "🧄", ginger: "🫚",
  capsicum: "🫑", carrot: "🥕", peas: "🫛", spinach: "🥬", palak: "🥬",
  cauliflower: "🥦", brinjal: "🍆", beans: "🫛", cabbage: "🥬",
  cucumber: "🥒", lemon: "🍋", mint: "🌿", coriander: "🌿",
  rice: "🍚", atta: "🌾", flour: "🌾", bread: "🍞", pasta: "🍝",
  noodle: "🍜", oats: "🥣", rava: "🌾",
  oil: "🫒", coconut: "🥥",
  salt: "🧂", turmeric: "✨", cumin: "✨", chili: "🌶️", chilli: "🌶️",
  pepper: "✨", masala: "✨", cinnamon: "✨", cardamom: "✨",
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

// mock data — simulates what the backend pipeline produces
const MOCK_CART = {
  budget: 3000,
  totalCost: 2950,
  budgetUtilization: 0.98,
  items: [
    { name: "Milk Toned", brand: "Amul", price: 30, count: 4, priority: "essential", ingredient: "milk" },
    { name: "Brown Bread", brand: "Harvest Gold", price: 50, count: 2, priority: "essential", ingredient: "bread" },
    { name: "Eggs White", brand: "Fresho", price: 79, count: 3, priority: "essential", ingredient: "egg" },
    { name: "Basmati Rice", brand: "India Gate", price: 199, count: 2, priority: "essential", ingredient: "rice" },
    { name: "Chicken Curry Cut", brand: "Licious", price: 199, count: 3, priority: "essential", ingredient: "chicken" },
    { name: "Butter Chicken Masala", brand: "MDH", price: 48, count: 1, priority: "recipe", ingredient: "masala" },
    { name: "Fresh Cream", brand: "Amul", price: 45, count: 2, priority: "recipe", ingredient: "cream" },
    { name: "Onion", brand: "Fresho", price: 35, count: 2, priority: "recipe", ingredient: "onion" },
    { name: "Tomato", brand: "Fresho", price: 30, count: 2, priority: "recipe", ingredient: "tomato" },
    { name: "Ginger Garlic Paste", brand: "Sil", price: 45, count: 1, priority: "recipe", ingredient: "ginger" },
    { name: "Spinach", brand: "Fresho", price: 18, count: 2, priority: "staple", ingredient: "spinach" },
    { name: "Toor Dal", brand: "Tata Sampann", price: 135, count: 1, priority: "staple", ingredient: "dal" },
    { name: "Sunflower Oil", brand: "Fortune", price: 135, count: 1, priority: "staple", ingredient: "oil" },
    { name: "Curd", brand: "Mother Dairy", price: 42, count: 2, priority: "staple", ingredient: "curd" },
  ],
  droppedItems: [],
};

let currentCart = null;

// navigation
function navigateTo(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");

  if (screenId === "screen-cart" && currentCart) {
    renderCart(currentCart);
  }
  if (screenId === "screen-summary" && currentCart) {
    renderSummary(currentCart);
  }
}

// chat logic
const SAMPLE_RESPONSES = [
  "Got it! Parsing your intent — extracting ingredients, mapping to Instamart SKUs, and optimizing for your budget.",
  "I found 14 items across Essentials, Recipe Kit, and Staples. Running the Knapsack optimizer now...",
  "Your cart is ready! Budget-compliant at ₹2,950 out of ₹3,000. Tap to review.",
];

let messageStep = 0;

function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatBubble(text, "user");
  input.value = "";

  // show parsing indicator
  const indicator = document.getElementById("parsing-indicator");
  indicator.classList.add("visible");

  // reset animation
  const fill = indicator.querySelector(".parsing-fill");
  fill.style.animation = "none";
  fill.offsetHeight;
  fill.style.animation = "parse 2s ease-in-out forwards";

  // simulate bot responses
  setTimeout(() => {
    addTypingIndicator();
  }, 800);

  setTimeout(() => {
    removeTypingIndicator();
    addChatBubble(SAMPLE_RESPONSES[0], "bot");
  }, 1800);

  setTimeout(() => {
    addTypingIndicator();
  }, 2500);

  setTimeout(() => {
    removeTypingIndicator();
    indicator.classList.remove("visible");
    addChatBubble(SAMPLE_RESPONSES[1], "bot");
  }, 3500);

  setTimeout(() => {
    addTypingIndicator();
  }, 4000);

  setTimeout(() => {
    removeTypingIndicator();
    currentCart = MOCK_CART;
    addCartReadyBubble();
  }, 5000);
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

function addCartReadyBubble() {
  const body = document.getElementById("chat-body");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot";
  bubble.innerHTML = `
    <div class="bot-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#FC8019"><polygon points="12,2 22,20 2,20"/></svg>
    </div>
    <div class="bubble-content">
      <strong>Cart optimized!</strong><br>
      ₹2,950 / ₹3,000 — 14 items, budget-compliant.<br><br>
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
  const existing = body.querySelector(".typing-indicator");
  if (existing) return;

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

// enter key to send
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("chat-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});

// cart rendering
function renderCart(cart) {
  document.getElementById("cart-total-badge").textContent = `₹${cart.totalCost.toLocaleString()}`;
  document.getElementById("cart-budget-badge").textContent = `₹${cart.budget.toLocaleString()}`;

  const badge = document.getElementById("budget-badge");
  if (cart.totalCost > cart.budget) {
    badge.classList.add("over-budget");
  } else {
    badge.classList.remove("over-budget");
  }

  // budget bar
  const pct = Math.round(cart.budgetUtilization * 100);
  document.getElementById("budget-bar").style.width = `${pct}%`;

  const essentials = cart.items.filter((i) => i.priority === "essential");
  const recipe = cart.items.filter((i) => i.priority === "recipe");
  const staples = cart.items.filter((i) => i.priority === "staple");

  renderSKUGrid("essentials-grid", essentials);
  renderSKUGrid("recipe-grid", recipe);
  renderSKUGrid("staples-grid", staples);
}

function renderSKUGrid(gridId, items) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "sku-card";
    const unitPrice = item.price * item.count;
    card.innerHTML = `
      <div class="sku-check">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      </div>
      <span class="sku-emoji">${getEmoji(item.ingredient)}</span>
      <div class="sku-name">${item.name}</div>
      <div class="sku-price">₹${unitPrice.toFixed(2)}</div>
    `;
    grid.appendChild(card);
  });
}

function togglePanel() {
  const panel = document.getElementById("value-panel");
  panel.classList.toggle("visible");
}

// summary
function renderSummary(cart) {
  document.getElementById("summary-total").textContent = `₹${cart.totalCost.toLocaleString()}`;

  const container = document.getElementById("summary-items");
  container.innerHTML = "";

  cart.items.slice(0, 6).forEach((item) => {
    const div = document.createElement("div");
    div.className = "summary-item";
    const unitPrice = item.price * item.count;
    div.innerHTML = `
      <span class="summary-item-emoji">${getEmoji(item.ingredient)}</span>
      <div class="summary-item-info">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-detail">${item.brand} x${item.count}</div>
      </div>
      <span class="summary-item-price">₹${unitPrice}</span>
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
    <p>Your optimized cart is on its way via Swiggy.</p>
  `;
  screen.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
  }, 3000);
}

function shareStory() {
  const card = document.getElementById("share-card");
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "successPop 0.5s ease, cardFloat 3s ease-in-out 0.5s infinite";
}
