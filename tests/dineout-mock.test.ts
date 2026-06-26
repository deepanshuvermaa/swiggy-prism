import { describe, it, expect, beforeEach } from "vitest";
import { MockDineoutProvider } from "../src/mcp/dineout-mock.js";

describe("MockDineoutProvider", () => {
  let provider: MockDineoutProvider;
  const lat = 30.7333;
  const lng = 76.7794;

  beforeEach(() => {
    provider = new MockDineoutProvider();
  });

  it("searches venues by cuisine", async () => {
    const venues = await provider.searchVenues("North Indian", lat, lng, "CUISINE");
    expect(venues.length).toBeGreaterThan(0);
    expect(venues[0].availability).toBe("AVAILABLE");
  });

  it("searches venues by name", async () => {
    const venues = await provider.searchVenues("Farzi Cafe", lat, lng);
    expect(venues.length).toBeGreaterThan(0);
    expect(venues[0].name).toBe("Farzi Cafe");
  });

  it("returns venue details", async () => {
    const venue = await provider.getVenueDetails("din_001", lat, lng);
    expect(venue.name).toBe("The Great Kabab Factory");
    expect(venue.costForTwo).toBe(1800);
  });

  it("generates 7-day slots", async () => {
    const today = new Date().toISOString().split("T")[0];
    const slots = await provider.getAvailableSlots("din_001", today, lat, lng);
    expect(slots.length).toBeGreaterThan(0);
    // All slots should have free deals
    expect(slots.every(s => s.deals.every(d => d.isFree && d.bookingPrice === 0))).toBe(true);
  });

  it("books a table with valid guest count", async () => {
    const slots = await provider.getAvailableSlots("din_001", "2026-06-26", lat, lng);
    const deal = slots[0].deals[0];
    const booking = await provider.bookTable(
      "din_001", deal.slotId, deal.itemId, slots[0].reservationTime, 4, lat, lng
    );
    expect(booking.status).toBe("confirmed");
    expect(booking.partySize).toBe(4);
    expect(booking.bookingId).toMatch(/^BK_/);
  });

  it("rejects guest count over 20", async () => {
    await expect(
      provider.bookTable("din_001", 1, "din_001-1001", Date.now(), 25, lat, lng)
    ).rejects.toThrow("Guest count must be 1-20");
  });

  it("retrieves booking status", async () => {
    const slots = await provider.getAvailableSlots("din_001", "2026-06-26", lat, lng);
    const deal = slots[0].deals[0];
    const booking = await provider.bookTable(
      "din_001", deal.slotId, deal.itemId, slots[0].reservationTime, 2, lat, lng
    );
    const status = await provider.getBookingStatus(booking.bookingId);
    expect(status.status).toBe("confirmed");
    expect(status.venueName).toBe("The Great Kabab Factory");
  });
});
