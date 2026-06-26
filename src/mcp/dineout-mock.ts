import type { DineoutVenue, DineoutSlot, DineoutBooking } from "../types/index.js";
import type { DineoutProvider } from "./providers.js";
import { VENUE_CATALOG, generateSlots } from "./dineout-catalog.js";

function tokenScore(query: string, target: string): number {
  const qTokens = query.toLowerCase().split(/\s+/);
  const tTokens = target.toLowerCase().split(/\s+/);
  let hits = 0;
  for (const qt of qTokens) {
    if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) hits++;
  }
  return qTokens.length > 0 ? hits / qTokens.length : 0;
}

export class MockDineoutProvider implements DineoutProvider {
  private bookings = new Map<string, DineoutBooking>();

  async searchVenues(
    query: string,
    _latitude: number,
    _longitude: number,
    entityType?: "locality" | "CUISINE" | "RESTAURANT_CATEGORY"
  ): Promise<DineoutVenue[]> {
    const lower = query.toLowerCase();

    const scored = VENUE_CATALOG
      .filter(v => v.availability === "AVAILABLE")
      .map(v => {
        let score = 0;
        score += tokenScore(lower, v.name) * 2;
        score += Math.max(...v.cuisine.map(c => tokenScore(lower, c)), 0);
        score += Math.max(...v.highlights.map(h => tokenScore(lower, h)), 0);

        if (entityType === "locality") {
          score += tokenScore(lower, v.locality) * 3;
        } else if (entityType === "CUISINE") {
          score += Math.max(...v.cuisine.map(c => tokenScore(lower, c)), 0) * 3;
        }

        return { v, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0
      ? scored.map(x => x.v)
      : VENUE_CATALOG.filter(v => v.availability === "AVAILABLE").slice(0, 5);
  }

  async getVenueDetails(
    restaurantId: string,
    _latitude: number,
    _longitude: number
  ): Promise<DineoutVenue> {
    const venue = VENUE_CATALOG.find(v => v.restaurantId === restaurantId);
    if (!venue) throw new Error(`Venue ${restaurantId} not found`);
    return venue;
  }

  async getAvailableSlots(
    restaurantId: string,
    _date: string,
    _latitude: number,
    _longitude: number
  ): Promise<DineoutSlot[]> {
    return generateSlots(restaurantId);
  }

  async bookTable(
    restaurantId: string,
    slotId: number,
    _itemId: string,
    _reservationTime: number,
    guestCount: number,
    _latitude: number,
    _longitude: number
  ): Promise<DineoutBooking> {
    if (guestCount < 1 || guestCount > 20) {
      throw new Error("Guest count must be 1-20");
    }

    const venue = VENUE_CATALOG.find(v => v.restaurantId === restaurantId);
    if (!venue) throw new Error(`Venue ${restaurantId} not found`);

    // Find the slot to get display info
    const slots = generateSlots(restaurantId);
    const slot = slots.find(s => s.deals.some(d => d.slotId === slotId));

    const booking: DineoutBooking = {
      bookingId: `BK_${Date.now()}`,
      restaurantId,
      venueName: venue.name,
      date: slot?.dateStr ?? new Date().toISOString().split("T")[0],
      time: slot?.displayTime ?? "7:00 PM",
      partySize: guestCount,
      status: "confirmed",
      estimatedBill: Math.round((venue.costForTwo / 2) * guestCount),
    };

    this.bookings.set(booking.bookingId, booking);
    return booking;
  }

  async getBookingStatus(bookingId: string): Promise<DineoutBooking> {
    const booking = this.bookings.get(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    return booking;
  }
}
