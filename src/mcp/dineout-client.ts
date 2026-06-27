/**
 * Real Swiggy Dineout MCP client.
 * Endpoint: POST mcp.swiggy.com/dineout
 * 8 tools — see verified API contract in plan.
 *
 * Key constraints:
 * - Free reservations only (isFree=true, bookingPrice=0)
 * - Location via lat/lng (not addressId for search)
 * - entityType critical for filtered search
 * - book_table is NOT idempotent — check get_booking_status on failure
 * - guestCount 1-20
 */

import type { DineoutVenue, DineoutSlot, DineoutBooking } from "../types/index.js";
import type { DineoutProvider } from "./providers.js";
import { MCPTransport, extractMCPData } from "./mcp-transport.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const DINEOUT_ENDPOINT = "https://mcp.swiggy.com/dineout";

export class MCPDineoutClient implements DineoutProvider {
  private transport: MCPTransport;
  private cachedAddressId: string | null = null;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(DINEOUT_ENDPOINT, auth);
  }

  private async getAddressId(): Promise<string | null> {
    if (this.cachedAddressId) return this.cachedAddressId;
    try {
      // Dineout might share addresses with food, try fetching
      const res = await this.transport.callTool({ name: "get_addresses", arguments: {} });
      const data = extractMCPData(res);
      const addresses = data?.addresses ?? data ?? [];
      if (Array.isArray(addresses) && addresses.length > 0) {
        this.cachedAddressId = addresses[0].addressId ?? addresses[0].id;
        console.log('[Dineout] Using address:', this.cachedAddressId);
        return this.cachedAddressId;
      }
    } catch {
      // Dineout may not support get_addresses — fall back to lat/lng
    }
    return null;
  }

  async searchVenues(
    query: string,
    latitude: number,
    longitude: number,
    entityType?: "locality" | "CUISINE" | "RESTAURANT_CATEGORY"
  ): Promise<DineoutVenue[]> {
    const addressId = await this.getAddressId();
    const args: Record<string, unknown> = { query };
    if (addressId) {
      args.addressId = addressId;
    } else {
      args.latitude = latitude;
      args.longitude = longitude;
    }
    if (entityType) args.entityType = entityType;

    const res = await this.transport.callTool({
      name: "search_restaurants_dineout",
      arguments: args,
    });
    const data = extractMCPData(res);
    console.log('[Dineout] searchVenues result keys:', Object.keys(data || {}));
    return data?.restaurants ?? [];
  }

  async getVenueDetails(
    restaurantId: string,
    latitude: number,
    longitude: number
  ): Promise<DineoutVenue> {
    const res = await this.transport.callTool({
      name: "get_restaurant_details",
      arguments: { restaurantId, latitude, longitude },
    });
    return extractMCPData(res);
  }

  async getAvailableSlots(
    restaurantId: string,
    date: string,
    latitude: number,
    longitude: number
  ): Promise<DineoutSlot[]> {
    const res = await this.transport.callTool({
      name: "get_available_slots",
      arguments: { restaurantId, date, latitude, longitude },
    });

    const slotData = extractMCPData(res);
    const rawSlots = slotData?.slots ?? [];
    // Filter to free deals only per Swiggy API constraint
    return rawSlots
      .map((s: any) => ({
        dateStr: s.dateStr,
        reservationTime: s.reservationTime,
        displayTime: s.displayTime,
        slotGroupName: s.slotGroupName,
        deals: (s.deals ?? []).filter((d: any) => d.isFree && d.bookingPrice === 0),
      }))
      .filter((s: any) => s.deals.length > 0);
  }

  /**
   * Book a table — NOT idempotent.
   * On 5xx/network failure, caller MUST check get_booking_status before retrying.
   */
  async bookTable(
    restaurantId: string,
    slotId: number,
    itemId: string,
    reservationTime: number,
    guestCount: number,
    latitude: number,
    longitude: number
  ): Promise<DineoutBooking> {
    if (guestCount < 1 || guestCount > 20) {
      throw new Error("VALIDATION_ERROR: guestCount must be 1-20");
    }

    const res = await this.transport.callTool(
      {
        name: "book_table",
        arguments: { restaurantId, slotId, itemId, reservationTime, guestCount, latitude, longitude },
      },
      { retryable: false } // non-idempotent
    );

    const data = extractMCPData(res);
    return {
      bookingId: data?.bookingId ?? data?.orderId ?? "",
      restaurantId,
      venueName: data?.restaurantName ?? "",
      date: data?.date ?? "",
      time: data?.time ?? "",
      partySize: guestCount,
      status: "confirmed",
      estimatedBill: data?.estimatedBill ?? 0,
    };
  }

  async getBookingStatus(bookingId: string): Promise<DineoutBooking> {
    const res = await this.transport.callTool({
      name: "get_booking_status",
      arguments: { bookingId },
    });
    return extractMCPData(res);
  }
}
