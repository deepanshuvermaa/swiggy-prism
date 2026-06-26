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
import { MCPTransport } from "./mcp-transport.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const FOOD_ENDPOINT = "https://mcp.swiggy.com/food";

export class MCPFoodClient implements FoodProvider {
  private transport: MCPTransport;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(FOOD_ENDPOINT, auth);
  }

  async searchRestaurants(addressId: string, query: string): Promise<Restaurant[]> {
    const res = await this.transport.callTool({
      name: "search_restaurants",
      arguments: { addressId, query },
    });
    return (res.data as any)?.restaurants ?? [];
  }

  async getMenu(addressId: string, restaurantId: string): Promise<MenuItem[]> {
    const res = await this.transport.callTool({
      name: "get_restaurant_menu",
      arguments: { addressId, restaurantId },
    });
    // Flatten paginated categories into flat item list
    const categories = (res.data as any)?.categories ?? [];
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
    return (res.data as any)?.items ?? [];
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
    const data = res.data as any;
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
    return (res.data as any)?.coupons ?? [];
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
    return { orderId: (res.data as any)?.orderId ?? "" };
  }
}
