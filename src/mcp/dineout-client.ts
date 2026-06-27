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
import { parseDineoutText } from "./text-parsers.js";
import { PKCEAuthManager } from "./auth-pkce.js";

const DINEOUT_ENDPOINT = "https://mcp.swiggy.com/dineout";

export class MCPDineoutClient implements DineoutProvider {
  private transport: MCPTransport;

  constructor(auth: PKCEAuthManager) {
    this.transport = new MCPTransport(DINEOUT_ENDPOINT, auth);
  }

  async searchVenues(
    query: string,
    latitude: number,
    longitude: number,
    entityType?: "locality" | "CUISINE" | "RESTAURANT_CATEGORY"
  ): Promise<DineoutVenue[]> {
    // Dineout uses lat/lng, not addressId (get_addresses doesn't exist on dineout)
    const args: Record<string, unknown> = { query, latitude, longitude };
    if (entityType) args.entityType = entityType;

    const res = await this.transport.callTool({
      name: "search_restaurants_dineout",
      arguments: args,
    });
    const data = extractMCPData(res);
    console.log('[Dineout] searchVenues raw type:', typeof data, typeof data === 'string' ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300));

    // MCP returns text string with restaurant listings — parse it
    if (typeof data === 'string') {
      return parseDineoutText(data);
    }
    const raw = data?.restaurants ?? [];
    return raw.map((r: any) => ({
      restaurantId: r.id ?? r.restaurantId,
      name: r.name ?? '',
      cuisine: r.cuisine ?? r.cuisines ?? [],
      rating: parseFloat(r.rating?.value ?? r.rating ?? r.avgRating ?? 4.0),
      ratingCount: parseInt(r.rating?.count ?? r.ratingCount ?? 500),
      locality: r.locality ?? r.area ?? '',
      costForTwo: parseInt(String(r.costForTwo ?? '1200').replace(/[^\d]/g, '')) || 1200,
      availability: "AVAILABLE" as const,
      highlights: r.highlights ?? [],
      offers: r.offers ?? [],
    }));
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
