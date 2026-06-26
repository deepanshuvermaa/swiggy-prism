import type { Restaurant, MenuItem, FoodCoupon, FoodCart, FoodCartItem } from "../types/index.js";
import type { FoodProvider } from "./providers.js";
import { RESTAURANT_CATALOG, MENU_CATALOG, COUPON_CATALOG } from "./food-catalog.js";

function tokenScore(query: string, target: string): number {
  const qTokens = query.toLowerCase().split(/\s+/);
  const tTokens = target.toLowerCase().split(/\s+/);
  let hits = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) hits++;
  }
  return qTokens.length > 0 ? hits / qTokens.length : 0;
}

export class MockFoodProvider implements FoodProvider {
  private cart: FoodCartItem[] = [];
  private cartRestaurantId = "";
  private cartRestaurantName = "";
  private appliedCoupon: FoodCoupon | undefined;

  async searchRestaurants(_addressId: string, query: string): Promise<Restaurant[]> {
    // Match by restaurant name or cuisine
    const scored = RESTAURANT_CATALOG
      .filter(r => r.availabilityStatus === "OPEN")
      .map(r => {
        const nameScore = tokenScore(query, r.name);
        const cuisineScore = Math.max(...r.cuisine.map(c => tokenScore(query, c)), 0);
        // Also check if any menu items at this restaurant match the query
        const hasMatchingDish = MENU_CATALOG.some(
          m => m.restaurantId === r.restaurantId && tokenScore(query, m.name) > 0.3
        );
        return { r, score: Math.max(nameScore, cuisineScore) + (hasMatchingDish ? 0.5 : 0) };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored.map(x => x.r) : RESTAURANT_CATALOG.filter(r => r.availabilityStatus === "OPEN").slice(0, 5);
  }

  async getMenu(_addressId: string, restaurantId: string): Promise<MenuItem[]> {
    return MENU_CATALOG.filter(m => m.restaurantId === restaurantId);
  }

  async searchMenu(_addressId: string, query: string): Promise<MenuItem[]> {
    return MENU_CATALOG
      .filter(m => tokenScore(query, m.name) > 0.3)
      .sort((a, b) => tokenScore(query, b.name) - tokenScore(query, a.name))
      .slice(0, 10);
  }

  async updateCart(
    restaurantId: string,
    cartItems: Array<{ itemId: string; quantity: number }>,
    _addressId: string
  ): Promise<FoodCart> {
    // Switching restaurant flushes cart (per Swiggy API)
    if (this.cartRestaurantId && this.cartRestaurantId !== restaurantId) {
      this.cart = [];
      this.appliedCoupon = undefined;
    }

    this.cartRestaurantId = restaurantId;
    const rest = RESTAURANT_CATALOG.find(r => r.restaurantId === restaurantId);
    this.cartRestaurantName = rest?.name ?? "Restaurant";

    this.cart = [];
    for (const ci of cartItems) {
      const menuItem = MENU_CATALOG.find(m => m.itemId === ci.itemId);
      if (!menuItem) continue;
      this.cart.push({ menuItem, quantity: ci.quantity, totalPrice: menuItem.price * ci.quantity });
    }

    return this.buildCart();
  }

  async flushCart(): Promise<void> {
    this.cart = [];
    this.cartRestaurantId = "";
    this.appliedCoupon = undefined;
  }

  async getCart(_addressId: string): Promise<FoodCart> {
    return this.buildCart();
  }

  async fetchCoupons(_restaurantId: string, _addressId: string): Promise<FoodCoupon[]> {
    return COUPON_CATALOG.filter(c => !c.requiresOnlinePayment);
  }

  async applyCoupon(couponCode: string, _addressId: string): Promise<FoodCart> {
    const coupon = COUPON_CATALOG.find(c => c.couponCode === couponCode);
    if (!coupon) throw new Error(`Invalid coupon: ${couponCode}`);

    const subtotal = this.cart.reduce((s, i) => s + i.totalPrice, 0);
    if (subtotal < coupon.minOrderValue) {
      throw new Error(`Minimum order ₹${coupon.minOrderValue} required for ${couponCode}`);
    }

    this.appliedCoupon = coupon;
    return this.buildCart();
  }

  async placeOrder(_addressId: string): Promise<{ orderId: string }> {
    const cart = this.buildCart();
    if (cart.total > 1000) throw new Error("Cart cap ₹1000 exceeded during beta");
    const orderId = `ORD_${Date.now()}`;
    this.cart = [];
    this.appliedCoupon = undefined;
    return { orderId };
  }

  private buildCart(): FoodCart {
    const subtotal = this.cart.reduce((s, i) => s + i.totalPrice, 0);
    const rest = RESTAURANT_CATALOG.find(r => r.restaurantId === this.cartRestaurantId);
    const deliveryFee = rest?.deliveryFee ?? 30;

    let discount = 0;
    if (this.appliedCoupon) {
      if (this.appliedCoupon.discountType === "flat") {
        discount = this.appliedCoupon.discountValue;
      } else {
        discount = Math.min(
          (subtotal * this.appliedCoupon.discountValue) / 100,
          this.appliedCoupon.maxDiscount
        );
      }
    }

    return {
      restaurantId: this.cartRestaurantId,
      restaurantName: this.cartRestaurantName,
      items: [...this.cart],
      subtotal,
      deliveryFee,
      appliedCoupon: this.appliedCoupon,
      discount: Math.round(discount),
      total: Math.round(subtotal + deliveryFee - discount),
      estimatedDeliveryMin: rest?.deliveryTimeMin ?? 30,
    };
  }
}
