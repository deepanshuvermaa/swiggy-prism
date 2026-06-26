import { describe, it, expect, beforeEach } from "vitest";
import { MockFoodProvider } from "../src/mcp/food-mock.js";

describe("MockFoodProvider", () => {
  let provider: MockFoodProvider;

  beforeEach(() => {
    provider = new MockFoodProvider();
  });

  it("searches restaurants by dish name", async () => {
    const results = await provider.searchRestaurants("addr_home", "butter chicken");
    expect(results.length).toBeGreaterThan(0);
    // Should find restaurants that have butter chicken on their menu
    expect(results.some(r => r.availabilityStatus === "OPEN")).toBe(true);
  });

  it("returns menu for a restaurant", async () => {
    const menu = await provider.getMenu("addr_home", "rest_001");
    expect(menu.length).toBeGreaterThan(0);
    expect(menu[0].restaurantId).toBe("rest_001");
  });

  it("searches menu items across restaurants", async () => {
    const items = await provider.searchMenu("addr_home", "biryani");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name.toLowerCase()).toContain("biryani");
  });

  it("builds a food cart with items", async () => {
    const cart = await provider.updateCart("rest_001", [{ itemId: "item_001", quantity: 2 }], "addr_home");
    expect(cart.items.length).toBe(1);
    expect(cart.subtotal).toBe(640); // 320 * 2
    expect(cart.restaurantName).toBe("Punjab Grill");
  });

  it("applies a valid coupon", async () => {
    await provider.updateCart("rest_001", [{ itemId: "item_001", quantity: 2 }], "addr_home");
    const cart = await provider.applyCoupon("WELCOME50", "addr_home");
    expect(cart.discount).toBe(50);
    expect(cart.total).toBeLessThan(cart.subtotal + cart.deliveryFee);
  });

  it("rejects coupon below minimum order", async () => {
    await provider.updateCart("rest_001", [{ itemId: "item_005", quantity: 1 }], "addr_home"); // Naan ₹50
    await expect(provider.applyCoupon("WELCOME50", "addr_home")).rejects.toThrow("Minimum order");
  });

  it("flushes cart when switching restaurant", async () => {
    await provider.updateCart("rest_001", [{ itemId: "item_001", quantity: 1 }], "addr_home");
    const cart = await provider.updateCart("rest_002", [{ itemId: "item_007", quantity: 1 }], "addr_home");
    expect(cart.restaurantId).toBe("rest_002");
    expect(cart.items.length).toBe(1);
  });

  it("fetches COD-only coupons", async () => {
    const coupons = await provider.fetchCoupons("rest_001", "addr_home");
    expect(coupons.length).toBeGreaterThan(0);
    expect(coupons.every(c => !c.requiresOnlinePayment)).toBe(true);
  });
});
