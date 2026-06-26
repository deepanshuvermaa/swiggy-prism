import type { SKU, MCPResponse } from "../types/index.js";
import type { FoodProvider } from "./providers.js";
import type { DineoutProvider } from "./providers.js";
import { MockMCPClient } from "./mock.js";
import { MockFoodProvider } from "./food-mock.js";
import { MockDineoutProvider } from "./dineout-mock.js";
import { PKCEAuthManager } from "./auth-pkce.js";
import { MCPInstamartClient } from "./instamart-client.js";
import { MCPFoodClient } from "./food-client.js";
import { MCPDineoutClient } from "./dineout-client.js";

// common interface — both real and mock implement this
export interface InstamartProvider {
  authenticate(clientId: string, clientSecret: string): Promise<void>;
  searchSKUs(query: string, limit?: number): Promise<SKU[]>;
  addToCart(items: Array<{ skuId: string; quantity: number }>): Promise<void>;
  getCartSummary(): Promise<MCPResponse>;
}

/**
 * Shared auth manager for all 3 real MCP clients.
 * One OAuth session covers all servers (uniform scopes: mcp:tools, mcp:resources, mcp:prompts).
 */
const sharedAuth = new PKCEAuthManager();

export function getAuthManager(): PKCEAuthManager {
  return sharedAuth;
}

const isLive = () => process.env.MCP_MODE === "live";

export function createProvider(): InstamartProvider {
  if (isLive()) {
    console.log("[prism] using LIVE Instamart MCP (mcp.swiggy.com/im)");
    return new MCPInstamartClient(sharedAuth);
  }
  console.log("[prism] using mock instamart provider");
  return new MockMCPClient();
}

export function createFoodProvider(): FoodProvider {
  if (isLive()) {
    console.log("[prism] using LIVE Food MCP (mcp.swiggy.com/food)");
    return new MCPFoodClient(sharedAuth);
  }
  console.log("[prism] using mock food provider");
  return new MockFoodProvider();
}

export function createDineoutProvider(): DineoutProvider {
  if (isLive()) {
    console.log("[prism] using LIVE Dineout MCP (mcp.swiggy.com/dineout)");
    return new MCPDineoutClient(sharedAuth);
  }
  console.log("[prism] using mock dineout provider");
  return new MockDineoutProvider();
}
