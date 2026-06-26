/**
 * Real Swiggy Instamart MCP client.
 * Endpoint: POST mcp.swiggy.com/im
 * 13 tools — see verified API contract in plan.
 *
 * Key constraints:
 * - Items use spinId (variant-level identifier)
 * - update_cart REPLACES entire cart contents
 * - Minimum order ₹99
 * - COD only in v1
 * - Cart binds to address — clear_cart before address change
 * - checkout is NOT idempotent
 */

import type { SKU, MCPResponse } from "../types/index.js";
import type { InstamartProvider } from "./adapter.js";
import { MCPTransport } from "./mcp-transport.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const INSTAMART_ENDPOINT = "https://mcp.swiggy.com/im";

export class MCPInstamartClient implements InstamartProvider {
  private transport: MCPTransport;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(INSTAMART_ENDPOINT, auth);
  }

  async authenticate(_clientId: string, _clientSecret: string): Promise<void> {
    // Auth is handled by PKCEAuthManager, not per-provider
    // This method exists for interface compatibility
  }

  async searchSKUs(query: string, limit = 10): Promise<SKU[]> {
    const res = await this.transport.callTool({
      name: "search_products",
      arguments: { addressId: "addr_home", query, offset: 0 },
    });

    const products = (res.data as any)?.products ?? [];
    const skus: SKU[] = [];
    for (const product of products) {
      // Each product may have variants with their own spinId
      const variants = product.variants ?? [product];
      for (const variant of variants) {
        skus.push({
          skuId: variant.spinId ?? variant.id ?? product.id,
          name: variant.name ?? product.name,
          brand: variant.brand ?? product.brand ?? "",
          price: variant.price ?? product.price ?? 0,
          quantity: variant.quantity ?? product.quantity ?? 1,
          unit: variant.unit ?? product.unit ?? "pcs",
          inStock: variant.inStock ?? true,
        });
      }
      if (skus.length >= limit) break;
    }
    return skus.slice(0, limit);
  }

  async addToCart(items: Array<{ skuId: string; quantity: number }>): Promise<void> {
    // Instamart update_cart REPLACES entire cart, uses selectedAddressId + items with spinId
    await this.transport.callTool({
      name: "update_cart",
      arguments: {
        selectedAddressId: "addr_home",
        items: items.map(i => ({ spinId: i.skuId, quantity: i.quantity })),
      },
    });
  }

  async getCartSummary(): Promise<MCPResponse> {
    const res = await this.transport.callTool({
      name: "get_cart",
      arguments: {},
    });
    return { success: true, data: res.data };
  }
}
