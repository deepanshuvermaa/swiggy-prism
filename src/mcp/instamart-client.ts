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
  private addressPromise: Promise<string> | null = null;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(INSTAMART_ENDPOINT, auth);
  }

  async authenticate(_clientId: string, _clientSecret: string): Promise<void> {
    // Auth is handled by PKCEAuthManager, not per-provider
  }

  private async getAddressId(): Promise<string> {
    if (this.cachedAddressId) return this.cachedAddressId;
    if (this.addressPromise) return this.addressPromise;
    this.addressPromise = this._fetchAddressId();
    return this.addressPromise;
  }

  private async _fetchAddressId(): Promise<string> {
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

    console.log('[Instamart] search_products for "' + query + '" — type:', typeof rawData, 'keys:', typeof rawData === 'object' ? Object.keys(rawData).slice(0, 5) : 'N/A', 'sample:', JSON.stringify(rawData).slice(0, 500));

    // MCP returns text — parse products from it
    if (typeof rawData === 'string') {
      return parseInstamartProductText(rawData).slice(0, limit);
    }

    // Structured JSON from Swiggy MCP
    const products = rawData?.products ?? rawData?.items ?? rawData?.results ?? [];
    const skus: SKU[] = [];
    for (const product of products) {
      // Swiggy uses "variations" with spinId, displayName, price.offerPrice
      const variants = product.variations ?? product.variants ?? [product];
      for (const variant of variants) {
        const price = variant.price?.offerPrice ?? variant.price?.mrp ?? variant.price ?? product.price ?? 0;
        const name = variant.displayName ?? variant.name ?? product.displayName ?? product.name ?? '';
        if (!name) continue;

        // Parse quantity from quantityDescription like "500 g x 2" or "1 kg"
        const qtyDesc = variant.quantityDescription ?? '';
        const qtyMatch = qtyDesc.match(/(\d+)\s*(g|kg|ml|l|pcs|pack|piece)/i);

        skus.push({
          skuId: variant.spinId ?? variant.id ?? product.id ?? '',
          name,
          brand: variant.brandName ?? product.brand ?? '',
          price: typeof price === 'number' ? price : parseFloat(price) || 0,
          quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
          unit: qtyMatch ? qtyMatch[2].toLowerCase() : 'pcs',
          inStock: variant.isInStockAndAvailable ?? variant.inStock ?? product.inStock ?? true,
          imageUrl: variant.imageUrl ?? product.imageUrl,
        } as any);
      }
      if (skus.length >= limit) break;
    }

    // Filter out junk/processed food when searching for raw ingredients
    const JUNK = ['chips','crispz','biscuit','cookie','snack','drink','juice','soda','candy','chocolate','syrup','ketchup','sauce','spread','instant','ready to eat','frozen','cake','rusk','namkeen','bhujia','mixture','pickle','jam','squash','cola','pepsi','coke'];
    const isRawIngredient = /\b(fresh|onion|tomato|ginger|garlic|potato|carrot|capsicum|spinach|paneer|chicken|egg|dal|rice|atta|oil|butter|cream|curd|milk)\b/i.test(query);

    if (isRawIngredient) {
      const filtered = skus.filter(s => {
        const nameLower = s.name.toLowerCase();
        return !JUNK.some(j => nameLower.includes(j));
      });
      // If all results are junk for a raw ingredient, return empty — optimizer will skip this ingredient
      return filtered.slice(0, limit);
    }

    return skus.slice(0, limit);
  }

  async getGoToItems(): Promise<any[]> {
    try {
      const addressId = await this.getAddressId();
      const res = await this.transport.callTool({
        name: "your_go_to_items",
        arguments: { addressId, offset: 0 },
      });
      const data = extractMCPData(res);
      if (typeof data === 'string') return [];
      return data?.items ?? data?.products ?? data ?? [];
    } catch { return []; }
  }

  async getOrders(): Promise<any[]> {
    try {
      const res = await this.transport.callTool({ name: "get_orders", arguments: {} });
      const data = extractMCPData(res);
      if (typeof data === 'string') return [];
      return data?.orders ?? data ?? [];
    } catch { return []; }
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
