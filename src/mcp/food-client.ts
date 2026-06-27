/**
 * Real Swiggy Food MCP client.
 * Endpoint: POST mcp.swiggy.com/food
 * 14 tools — see verified API contract in plan.
 *
 * Key constraints:
 * - Cart cap ₹1000 during beta
 * - COD only in v1
 * - Cart binds to restaurant — switching flushes it
 * - place_food_order is NOT idempotent — check get_food_orders on failure
 */

import type { Restaurant, MenuItem, FoodCoupon, FoodCart, FoodCartItem } from "../types/index.js";
import type { FoodProvider } from "./providers.js";
import { MCPTransport, extractMCPData } from "./mcp-transport.js";
import { parseFoodRestaurantText } from "./text-parsers.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const FOOD_ENDPOINT = "https://mcp.swiggy.com/food";

export class MCPFoodClient implements FoodProvider {
  private transport: MCPTransport;
  private cachedAddressId: string | null = null;
  private addressPromise: Promise<string> | null = null;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(FOOD_ENDPOINT, auth);
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
      console.log('[Food] get_addresses raw type:', typeof data, typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200));

      let addressId: string | null = null;

      if (typeof data === 'string') {
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
        console.log('[Food] Using addressId:', addressId);
        return addressId;
      }
      console.warn('[Food] No valid addressId found');
    } catch (err) {
      console.warn('[Food] get_addresses failed:', err instanceof Error ? err.message : err);
    }
    throw new Error("No saved address found.");
  }

  async searchRestaurants(addressId: string, query: string): Promise<Restaurant[]> {
    const realAddressId = await this.getAddressId();
    const res = await this.transport.callTool({
      name: "search_restaurants",
      arguments: { addressId: realAddressId, query },
    });
    const data = extractMCPData(res);
    console.log('[Food] searchRestaurants raw type:', typeof data, typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300));

    if (typeof data === 'string') {
      return parseFoodRestaurantText(data);
    }
    // Map MCP fields to our Restaurant interface
    const raw = data?.restaurants ?? [];
    return raw.map((r: any) => ({
      restaurantId: r.id ?? r.restaurantId,
      name: r.name ?? '',
      cuisine: r.cuisines ?? r.cuisine ?? [],
      rating: parseFloat(r.avgRating ?? r.rating?.value ?? r.rating ?? 4.0),
      ratingCount: parseInt(r.totalRatings ?? r.ratingCount ?? 500),
      deliveryTimeMin: r.deliveryTimeMinutes ?? r.deliveryTimeMin ?? 30,
      deliveryFee: r.deliveryFee ?? 40,
      distanceKm: r.distanceKm ?? r.distance ?? 3.0,
      availabilityStatus: r.availabilityStatus ?? "OPEN",
      isVeg: r.isVeg ?? r.veg ?? false,
    }));
  }

  async getMenu(addressId: string, restaurantId: string): Promise<MenuItem[]> {
    const realAddressId = await this.getAddressId();
    const res = await this.transport.callTool({
      name: "get_restaurant_menu",
      arguments: { restaurantId, addressId: realAddressId },
    });
    // Flatten paginated categories into flat item list
    const menuData = extractMCPData(res);
    console.log('[Food] getMenu raw type:', typeof menuData, typeof menuData === 'object' ? JSON.stringify(menuData).slice(0, 300) : String(menuData).slice(0, 300));
    const categories = menuData?.categories ?? menuData?.menu ?? menuData?.groupedCard ?? [];
    const items: MenuItem[] = [];
    for (const cat of categories) {
      for (const item of cat.items ?? []) {
        items.push({
          itemId: item.id ?? item.itemId,
          restaurantId,
          name: item.name,
          description: item.description ?? "",
          price: item.price ?? item.defaultPrice ?? 0,
          isVeg: item.isVeg ?? false,
          isBestseller: item.isBestseller ?? false,
          category: cat.name ?? "",
          hasVariants: item.hasVariants ?? false,
          hasAddons: item.hasAddons ?? false,
        });
      }
    }
    return items;
  }

  async searchMenu(addressId: string, query: string): Promise<MenuItem[]> {
    const res = await this.transport.callTool({
      name: "search_menu",
      arguments: { addressId, query },
    });
    return extractMCPData(res)?.items ?? [];
  }

  async updateCart(
    restaurantId: string,
    cartItems: Array<{ itemId: string; quantity: number }>,
    addressId: string
  ): Promise<FoodCart> {
    await this.transport.callTool({
      name: "update_food_cart",
      arguments: { restaurantId, cartItems, addressId },
    });
    // Must call get_food_cart after update per Swiggy docs
    return this.getCart(addressId);
  }

  async flushCart(): Promise<void> {
    await this.transport.callTool({
      name: "flush_food_cart",
      arguments: {},
    });
  }

  async getCart(addressId: string): Promise<FoodCart> {
    const res = await this.transport.callTool({
      name: "get_food_cart",
      arguments: { addressId },
    });
    const data = extractMCPData(res);
    return {
      restaurantId: data?.restaurantId ?? "",
      restaurantName: data?.restaurantName ?? "",
      items: (data?.items ?? []).map((i: any) => ({
        menuItem: i.menuItem ?? i,
        quantity: i.quantity ?? 1,
        totalPrice: i.totalPrice ?? i.price ?? 0,
      })),
      subtotal: data?.subtotal ?? 0,
      deliveryFee: data?.deliveryFee ?? 0,
      appliedCoupon: data?.offers?.coupon_applied ?? undefined,
      discount: data?.offers?.coupon_applied?.coupon_discount ?? 0,
      total: data?.total ?? 0,
      estimatedDeliveryMin: data?.estimatedDeliveryMin ?? 30,
    };
  }

  async fetchCoupons(restaurantId: string, addressId: string): Promise<FoodCoupon[]> {
    const res = await this.transport.callTool({
      name: "fetch_food_coupons",
      arguments: { restaurantId, addressId },
    });
    return extractMCPData(res)?.coupons ?? [];
  }

  async applyCoupon(couponCode: string, addressId: string): Promise<FoodCart> {
    await this.transport.callTool({
      name: "apply_food_coupon",
      arguments: { couponCode, addressId },
    });
    return this.getCart(addressId);
  }

  /**
   * Place food order — NOT idempotent.
   * On 5xx/network failure, caller MUST check get_food_orders before retrying.
   */
  async placeOrder(addressId: string): Promise<{ orderId: string }> {
    const res = await this.transport.callTool(
      { name: "place_food_order", arguments: { addressId } },
      { retryable: false } // non-idempotent — do NOT auto-retry
    );
    return { orderId: extractMCPData(res)?.orderId ?? "" };
  }
}
