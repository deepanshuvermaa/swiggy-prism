import type { SKU, MCPResponse } from "../types/index.js";
import { INSTAMART_CATALOG } from "./catalog.js";

interface CartEntry {
  skuId: string;
  quantity: number;
}

export class MockMCPClient {
  private cart: CartEntry[] = [];
  private authenticated = false;

  async authenticate(_clientId: string, _clientSecret: string): Promise<void> {
    // simulate a small network delay
    await delay(50);
    this.authenticated = true;
  }

  async searchSKUs(query: string, limit = 10): Promise<SKU[]> {
    await delay(30);

    const tokens = query.toLowerCase().split(/\s+/);
    const scored = INSTAMART_CATALOG
      .filter((sku) => sku.inStock)
      .map((sku) => {
        const skuText = `${sku.name} ${sku.brand}`.toLowerCase();
        const hits = tokens.filter((t) => skuText.includes(t)).length;
        return { sku, score: hits };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((s) => s.sku);
  }

  async addToCart(items: CartEntry[]): Promise<void> {
    await delay(20);

    for (const item of items) {
      const sku = INSTAMART_CATALOG.find((s) => s.skuId === item.skuId);
      if (!sku) throw new Error(`SKU not found: ${item.skuId}`);
      if (!sku.inStock) throw new Error(`SKU out of stock: ${item.skuId}`);

      const existing = this.cart.find((c) => c.skuId === item.skuId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        this.cart.push({ ...item });
      }
    }
  }

  async getCartSummary(): Promise<MCPResponse> {
    await delay(20);

    const items = this.cart.map((entry) => {
      const sku = INSTAMART_CATALOG.find((s) => s.skuId === entry.skuId)!;
      return {
        ...sku,
        cartQuantity: entry.quantity,
        lineTotal: sku.price * entry.quantity,
      };
    });

    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return {
      success: true,
      data: { items, total, itemCount: this.cart.length },
    };
  }

  clearCart(): void {
    this.cart = [];
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
