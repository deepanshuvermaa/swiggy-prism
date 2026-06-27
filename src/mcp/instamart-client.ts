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
import { MCPTransport, extractMCPData } from "./mcp-transport.js";
import { parseInstamartProductText } from "./text-parsers.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const INSTAMART_ENDPOINT = "https://mcp.swiggy.com/im";

export class MCPInstamartClient implements InstamartProvider {
  private transport: MCPTransport;
  private cachedAddressId: string | null = null;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(INSTAMART_ENDPOINT, auth);
  }

  async authenticate(_clientId: string, _clientSecret: string): Promise<void> {
    // Auth is handled by PKCEAuthManager, not per-provider
  }

  private async getAddressId(): Promise<string> {
    if (this.cachedAddressId) return this.cachedAddressId;
    try {
      const res = await this.transport.callTool({ name: "get_addresses", arguments: {} });
      const data = extractMCPData(res);
      console.log('[Instamart] get_addresses raw type:', typeof data, typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200));

      // MCP returns addresses as text string: "Found N saved addresses:\n1. [Label] Name: ... (ID: abc123)"
      // Or as JSON array. Handle both.
      let addressId: string | null = null;

      if (typeof data === 'string') {
        // Parse ID from text like "(ID: d66o4v0535snvbkgje6g)"
        const idMatch = data.match(/\(ID:\s*([a-zA-Z0-9_-]+)\)/);
        if (idMatch) addressId = idMatch[1];
      } else {
        const addresses = Array.isArray(data) ? data : data?.addresses ?? data?.savedAddresses ?? [];
        if (addresses.length > 0) {
          addressId = addresses[0].addressId ?? addresses[0].id ?? addresses[0].address_id;
        }
      }

      if (addressId) {
        this.cachedAddressId = addressId;
        console.log('[Instamart] Using addressId:', addressId);
        return addressId;
      }
      console.warn('[Instamart] No valid addressId found');
    } catch (err) {
      console.warn('[Instamart] get_addresses failed:', err instanceof Error ? err.message : err);
    }
    // DO NOT fall back to "addr_home" — it doesn't exist. Throw so the channel fails gracefully.
    throw new Error("No saved address found. Please add an address in Swiggy app first.");
  }

  async searchSKUs(query: string, limit = 10): Promise<SKU[]> {
    const addressId = await this.getAddressId();
    const res = await this.transport.callTool({
      name: "search_products",
      arguments: { addressId, query },
    });

    const rawData = extractMCPData(res);
    if (!rawData) return []; // isError was true

    // MCP returns text — parse products from it
    if (typeof rawData === 'string') {
      console.log('[Instamart] search_products text for "' + query + '":', rawData.slice(0, 800));
      return parseInstamartProductText(rawData).slice(0, limit);
    }

    const products = rawData?.products ?? rawData?.items ?? rawData?.results ?? [];
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
    await this.transport.callTool({
      name: "update_cart",
      arguments: {
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
