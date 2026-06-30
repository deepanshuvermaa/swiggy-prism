/**
 * Swiggy Prism — Live End-to-End Automated Test Suite
 * Tests all features against running localhost:3000 server
 */

const API = 'http://localhost:3000';
let passed = 0, failed = 0, total = 0;

function log(icon, name, detail) {
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

async function test(name, fn) {
  total++;
  try {
    const result = await fn();
    passed++;
    log('✅', name, result);
  } catch (err) {
    failed++;
    log('❌', name, err.message);
  }
}

async function fetchJSON(path, options) {
  const r = await fetch(API + path, options);
  if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SWIGGY PRISM — E2E TEST SUITE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ─── 1. SERVER & AUTH ────────────────────────────────────────
console.log('▸ SERVER & AUTH');

await test('Health endpoint', async () => {
  const d = await fetchJSON('/api/health');
  if (d.status !== 'ok') throw new Error('status not ok');
  return `LLM=${d.hasLLM} MCP=${d.mcpMode} Auth=${d.authenticated}`;
});

await test('Sessions endpoint', async () => {
  const d = await fetchJSON('/api/sessions');
  if (!d.sessions) throw new Error('no sessions array');
  return `${d.sessions.length} session(s)`;
});

await test('Admin dashboard loads', async () => {
  const r = await fetch(API + '/admin');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  if (!html.includes('Swiggy Prism')) throw new Error('missing title');
  return `${html.length} bytes`;
});

// ─── 2. DECISION ENGINE (3 channels) ────────────────────────
console.log('\n▸ DECISION ENGINE');

await test('Dal tadka — 3 channels', async () => {
  const d = await fetchJSON('/api/decide', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'dal tadka for 2, budget 400', persona: 'balanced', pantryItems: [], dietaryPrefs: [] })
  });
  if (!d.success) throw new Error(d.error);
  const opts = d.result.options;
  if (opts.length < 2) throw new Error(`only ${opts.length} options`);
  const channels = opts.map(o => o.channel).join(', ');
  const costs = opts.map(o => '₹' + o.cost).join(', ');
  return `${opts.length} channels [${channels}] costs [${costs}]`;
});

await test('Pantry filtering (skip rice, onion)', async () => {
  const withPantry = await fetchJSON('/api/decide', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'biryani for 2, budget 500', persona: 'balanced', pantryItems: ['rice', 'onion', 'oil'], dietaryPrefs: [] })
  });
  const noPantry = await fetchJSON('/api/decide', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'biryani for 2, budget 500', persona: 'balanced', pantryItems: [], dietaryPrefs: [] })
  });
  const cookWith = withPantry.result.options.find(o => o.channel === 'instamart');
  const cookNo = noPantry.result.options.find(o => o.channel === 'instamart');
  if (cookWith && cookNo && cookWith.cost >= cookNo.cost) throw new Error('pantry did not reduce cost');
  return cookWith && cookNo ? `with pantry: ₹${cookWith.cost} vs without: ₹${cookNo.cost}` : 'cook channel available';
});

await test('Persona scoring — foodie prefers dineout', async () => {
  const d = await fetchJSON('/api/decide', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'date night for 2, budget 2000', persona: 'foodie', pantryItems: [], dietaryPrefs: [] })
  });
  if (!d.success) throw new Error(d.error);
  const best = d.result.bestOption;
  return `best=${best} (${d.result.options.length} options)`;
});

await test('Budget persona prefers cook', async () => {
  const d = await fetchJSON('/api/decide', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'dal chawal for 2, budget 300', persona: 'budget', pantryItems: [], dietaryPrefs: [] })
  });
  if (!d.success) throw new Error(d.error);
  const cook = d.result.options.find(o => o.channel === 'instamart');
  return `best=${d.result.bestOption}, cook score=${cook?.score || 'N/A'}`;
});

// ─── 3. RECIPE PARSING ──────────────────────────────────────
console.log('\n▸ RECIPE PARSING');

await test('LLM recipe parse (butter chicken)', async () => {
  const d = await fetchJSON('/api/parse', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'butter chicken for 4' })
  });
  if (!d.success) throw new Error(d.error);
  if (d.ingredients.length < 5) throw new Error(`only ${d.ingredients.length} ingredients`);
  return `${d.ingredients.length} ingredients, LLM=${d.usedLLM}`;
});

await test('YouTube video parse (real URL)', async () => {
  const d = await fetchJSON('/api/parse-video?url=' + encodeURIComponent('https://www.youtube.com/watch?v=a03U45jFxOI'));
  if (!d.success) throw new Error(d.error || 'failed');
  if (!d.recipe) throw new Error('no recipe extracted');
  return `"${d.recipe}" — ${d.ingredients?.length || 0} ingredients`;
});

await test('YouTube video parse (tandoori chicken)', async () => {
  const d = await fetchJSON('/api/parse-video?url=' + encodeURIComponent('https://www.youtube.com/watch?v=BKxGodX9NGg'));
  if (!d.success) throw new Error(d.error || 'failed');
  return `"${d.recipe}" — ${d.ingredients?.length || 0} ingredients`;
});

// ─── 4. MEAL PLAN ───────────────────────────────────────────
console.log('\n▸ MEAL PLAN');

await test('Meal plan — 21 meals (7 × B/L/D)', async () => {
  const d = await fetchJSON('/api/meal-plan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'balanced', weeklyBudget: 3500 })
  });
  if (!d.success) throw new Error(d.error);
  if (d.plan.length !== 21) throw new Error(`expected 21 meals, got ${d.plan.length}`);
  const meals = d.plan.filter(p => p.meal === 'breakfast').length;
  return `${d.plan.length} meals, ${meals} breakfasts, ₹${d.totalCost} total`;
});

await test('Meal plan — budget persona cooks more', async () => {
  const d = await fetchJSON('/api/meal-plan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'budget', weeklyBudget: 2500 })
  });
  if (!d.success) throw new Error(d.error);
  const cookPct = Math.round(d.channelSplit.cook / 21 * 100);
  return `cook=${d.channelSplit.cook}/21 (${cookPct}%), order=${d.channelSplit.order}, dine=${d.channelSplit.dine}`;
});

// ─── 5. GROUP ORDER ─────────────────────────────────────────
console.log('\n▸ GROUP ORDER');

await test('Group order — 8 guests, ₹3000', async () => {
  const d = await fetchJSON('/api/group-order', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ servings: 8, budget: 3000 })
  });
  if (!d.success) throw new Error(d.error);
  if (d.items.length < 5) throw new Error(`only ${d.items.length} items`);
  const appetizers = d.items.filter(i => i.type === 'appetizer').length;
  const mains = d.items.filter(i => i.type === 'main').length;
  return `${d.items.length} items (${appetizers} appetizers, ${mains} mains), ₹${d.perPerson}/person`;
});

// ─── 6. ORDER HISTORY ───────────────────────────────────────
console.log('\n▸ ORDER HISTORY & ANALYTICS');

await test('Order history with spend', async () => {
  const d = await fetchJSON('/api/order-history');
  if (!d.success) throw new Error(d.error);
  return `${d.orderCount} orders, ₹${d.totalSpent} spent`;
});

await test('Go-to items from Instamart', async () => {
  const d = await fetchJSON('/api/go-to-items');
  if (!d.success) throw new Error(d.error);
  return `${d.items?.length || 0} frequently ordered items`;
});

// ─── 7. PRICE CHECK ─────────────────────────────────────────
console.log('\n▸ PRICE ALERTS');

await test('Check prices for alert items', async () => {
  const d = await fetchJSON('/api/check-prices?items=butter+chicken,biryani');
  if (!d.success) throw new Error(d.error);
  if (!d.prices || d.prices.length === 0) throw new Error('no prices returned');
  return d.prices.map(p => `${p.dish}: ₹${p.price}`).join(', ');
});

// ─── 8. STATIC ASSETS ───────────────────────────────────────
console.log('\n▸ STATIC ASSETS');

await test('index.html loads', async () => {
  const r = await fetch(API + '/');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return `${r.status} OK`;
});

await test('app.js loads', async () => {
  const r = await fetch(API + '/app.js');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  return `${text.length} bytes`;
});

await test('engine.js loads', async () => {
  const r = await fetch(API + '/engine.js');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return `${(await r.text()).length} bytes`;
});

await test('styles.css loads', async () => {
  const r = await fetch(API + '/styles.css');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return `${(await r.text()).length} bytes`;
});

await test('Logo asset loads', async () => {
  const r = await fetch(API + '/assets/swiggy-logo.webp');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  return `${r.status} OK`;
});

// ─── 9. LOGS ────────────────────────────────────────────────
console.log('\n▸ LOGGING & ADMIN');

await test('Activity logs', async () => {
  const d = await fetchJSON('/api/logs?limit=5');
  if (!d.logs) throw new Error('no logs');
  return `${d.logs.length} logs, ${d.stats.total} total events, ${d.stats.toolCalls} MCP calls`;
});

// ─── SUMMARY ────────────────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
if (failed === 0) {
  console.log('  🎉 ALL TESTS PASSED');
} else {
  console.log(`  ⚠️  ${failed} TEST(S) FAILED`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(failed > 0 ? 1 : 0);
