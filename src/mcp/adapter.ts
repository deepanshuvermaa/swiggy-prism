import type { SKU, MCPResponse } from "../types/index.js";
import { MCPClient } from "./client.js";
import { MockMCPClient } from "./mock.js";

// common interface — both real and mock implement this
export interface InstamartProvider {
  authenticate(clientId: string, clientSecret: string): Promise<void>;
  searchSKUs(query: string, limit?: number): Promise<SKU[]>;
  addToCart(items: Array<{ skuId: string; quantity: number }>): Promise<void>;
  getCartSummary(): Promise<MCPResponse>;
}

export function createProvider(): InstamartProvider {
  const useMock = process.env.MCP_MODE !== "live";

  if (useMock) {
    console.log("[prism] using mock instamart provider");
    return new MockMCPClient();
  }

  console.log("[prism] using live MCP provider");
  return new MCPClient();
}
