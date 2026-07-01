# Kravr

**Should you cook it, order it, or dine out? Kravr decides.**

> Cross-channel food decision engine powered by Swiggy MCP. Compares cooking at home (Instamart), ordering delivery (Food), and dining out (Dineout) — optimized for your budget, time, health, and persona.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20it%20now-FC8019?style=for-the-badge&logo=googlechrome&logoColor=white)](https://deepanshuvermaa.github.io/swiggy-prism/)

## What it does

Type "butter chicken for 4, budget ₹800" and Kravr instantly shows:

- **Cook at Home** — Instamart grocery cart with real products, images, prices, and Knapsack budget optimization
- **Order Delivery** — Best restaurant on Swiggy Food with ratings, delivery time, and auto-applied coupons
- **Dine Out** — Table reservation on Swiggy Dineout with available slots and deals

All using **real data from your Swiggy account** via 35 MCP tools across 3 servers.

## Features

| Feature | Description |
|---|---|
| **3-Channel Decision Engine** | Compare Cook vs Order vs Dine Out for any dish |
| **YouTube Recipe Capture** | Paste a video URL → Groq LLM extracts recipe → Instamart cart built |
| **Persona-Driven Scoring** | Foodie, Gym Freak, Balanced, Budget Saver — each gets different recommendations |
| **Veg/Non-Veg/Dietary Filters** | Keto, Vegan, Jain, Diabetic, Gluten-free compliance |
| **Pantry Awareness** | Mark items you have at home — Kravr skips them in your cart |
| **Smart Pantry Tracking** | Auto-removes depleted pantry items after 3 uses |
| **Meal Planning** | 7-day plan with Breakfast/Lunch/Dinner, persona-weighted channel split |
| **Group Ordering** | Party mode — splits between cooking appetizers + ordering mains |
| **Cook vs Order Savings** | "Save ₹X/month by cooking 3x/week" calculator |
| **Price Alerts** | Set target prices, get notified when dishes drop |
| **Health Scoring** | Nutrition breakdown (protein, carbs, fats, fiber) per cart |
| **Kravr Wrapped** | Monthly spending story — shareable via WhatsApp |
| **Real Order History** | Fetches actual Swiggy orders for Food X-Ray analytics |
| **OAuth 2.1 PKCE** | Secure Swiggy authentication, token persists across restarts |
| **Admin Dashboard** | MCP tool usage, connected users, activity logs |

## Tech Stack

- **Frontend**: Vanilla JS SPA (no framework), mobile-first phone-frame UI
- **Backend**: Node.js HTTP server with TypeScript
- **LLM**: Groq (Llama 3.3 70B) for recipe ingredient extraction
- **MCP**: Swiggy Food (14 tools), Instamart (13 tools), Dineout (8 tools)
- **Auth**: OAuth 2.1 PKCE with token persistence
- **Optimizer**: Knapsack algorithm for budget-constrained cart building

## Setup

```bash
git clone https://github.com/deepanshuvermaa/swiggy-prism.git
cd swiggy-prism
npm install
```

Create `.env`:
```
MCP_MODE=live
GROQ_API_KEY=your_groq_key
```

```bash
npm run dev        # Start server on localhost:3000
npm run build      # Compile TypeScript
npm start          # Production mode
npm test           # Run tests
```

Open `http://localhost:3000` → Click "Connect with Swiggy" → Authenticate with OTP → All 35 MCP tools go live.

## Architecture

```
docs/           → Frontend (index.html, app.js, engine.js, styles.css)
src/core/       → Decision engine, scorer, optimizer, parsers
src/mcp/        → Food, Instamart, Dineout MCP clients
src/server.ts   → HTTP server with 15+ API endpoints
```

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/decide` | 3-channel decision with persona scoring |
| POST | `/api/parse` | LLM recipe ingredient extraction |
| POST | `/api/optimize` | Knapsack cart optimization |
| POST | `/api/meal-plan` | 7-day B/L/D meal plan |
| POST | `/api/group-order` | Multi-channel party plan |
| GET | `/api/parse-video` | YouTube URL → recipe extraction |
| GET | `/api/order-history` | Real Swiggy order history |
| GET | `/api/go-to-items` | Frequently ordered Instamart items |
| GET | `/api/check-prices` | Price check for alerts |
| GET | `/api/addresses` | User's saved delivery addresses |
| GET | `/api/health` | Server + auth status |
| GET | `/admin` | Admin dashboard |

## Swiggy MCP Compliance

- **"Powered by Swiggy"** attribution on all surfaces showing Swiggy data
- Swiggy orange (#FF5200) not used as primary palette
- Swiggy logo displayed only for attribution, not modified
- No implied partnership beyond Builders Club integration
- DPDP 2023 compliant — no analytics or advertising use of Swiggy data

## Author

**Deepanshu Verma** — [Portfolio](https://deepanshuverma.site/portfolio) · [GitHub](https://github.com/deepanshuvermaa)

## License

MIT
