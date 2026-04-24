import { describe, it, expect } from "vitest";
import { MockMCPClient } from "../src/mcp/mock.js";

describe("MockMCPClient", () => {
  it("authenticates", async () => {
    const client = new MockMCPClient();
    await client.authenticate("test-id", "test-secret");
    expect(client.isAuthenticated()).toBe(true);
  });

  it("searches SKUs by ingredient name", async () => {
    const client = new MockMCPClient();
    const results = await client.searchSKUs("chicken");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name.toLowerCase()).toContain("chicken");
  });

  it("returns empty for nonsense queries", async () => {
    const client = new MockMCPClient();
    const results = await client.searchSKUs("xyznonexistent");
    expect(results.length).toBe(0);
  });

  it("adds items to cart", async () => {
    const client = new MockMCPClient();
    await client.addToCart([{ skuId: "SKU-CHK-001", quantity: 2 }]);

    const summary = await client.getCartSummary();
    expect(summary.success).toBe(true);

    const data = summary.data as { total: number; itemCount: number };
    expect(data.itemCount).toBe(1);
    expect(data.total).toBeGreaterThan(0);
  });

  it("throws on invalid SKU", async () => {
    const client = new MockMCPClient();
    await expect(
      client.addToCart([{ skuId: "SKU-FAKE-999", quantity: 1 }])
    ).rejects.toThrow("SKU not found");
  });

  it("stacks quantities for duplicate adds", async () => {
    const client = new MockMCPClient();
    await client.addToCart([{ skuId: "SKU-ONI-001", quantity: 1 }]);
    await client.addToCart([{ skuId: "SKU-ONI-001", quantity: 2 }]);

    const summary = await client.getCartSummary();
    const data = summary.data as { items: Array<{ cartQuantity: number }> };
    expect(data.items[0].cartQuantity).toBe(3);
  });

  it("clears cart", async () => {
    const client = new MockMCPClient();
    await client.addToCart([{ skuId: "SKU-TOM-001", quantity: 1 }]);
    client.clearCart();

    const summary = await client.getCartSummary();
    const data = summary.data as { itemCount: number };
    expect(data.itemCount).toBe(0);
  });
});
