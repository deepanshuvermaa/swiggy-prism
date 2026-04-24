import type { MCPResponse, SKU, MCPToolCall } from "../types";

const MCP_BASE_URL = "https://swiggy.deepanshuverma.site";

interface MCPClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class MCPClient {
  private baseUrl: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor(options: MCPClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? MCP_BASE_URL;
    this.timeout = options.timeout ?? 10000;
  }

  async authenticate(clientId: string, clientSecret: string): Promise<void> {
    const res = await this.request("/oauth/token", {
      method: "POST",
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
  }

  async searchSKUs(query: string, limit = 10): Promise<SKU[]> {
    const response = await this.callTool({
      name: "instamart.search",
      arguments: { query, limit },
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message ?? "SKU search failed");
    }

    return response.data as SKU[];
  }

  async addToCart(items: Array<{ skuId: string; quantity: number }>): Promise<void> {
    const response = await this.callTool({
      name: "instamart.cart.add",
      arguments: { items },
    });

    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to add items to cart");
    }
  }

  async getCartSummary(): Promise<MCPResponse> {
    return this.callTool({
      name: "instamart.cart.summary",
      arguments: {},
    });
  }

  private async callTool(tool: MCPToolCall): Promise<MCPResponse> {
    const res = await this.request("/mcp/tools/call", {
      method: "POST",
      body: JSON.stringify(tool),
    });

    return res.json() as Promise<MCPResponse>;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
      }

      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
