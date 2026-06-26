import type { DineoutVenue, DineoutSlot, DineoutDeal } from "../types/index.js";

export const VENUE_CATALOG: DineoutVenue[] = [
  { restaurantId: "din_001", name: "The Great Kabab Factory", cuisine: ["Mughlai", "North Indian"], rating: 4.5, ratingCount: 860, locality: "Connaught Place", costForTwo: 1800, availability: "AVAILABLE", highlights: ["Fine Dining", "Family"], offers: ["Flat 20% off food bill"] },
  { restaurantId: "din_002", name: "Farzi Cafe", cuisine: ["Modern Indian", "Fusion"], rating: 4.3, ratingCount: 1240, locality: "Cyber Hub", costForTwo: 2200, availability: "AVAILABLE", highlights: ["Trendy", "Date Night"], offers: ["Complimentary dessert"] },
  { restaurantId: "din_003", name: "Dhaba by Claridges", cuisine: ["North Indian", "Punjabi"], rating: 4.4, ratingCount: 720, locality: "Connaught Place", costForTwo: 1600, availability: "AVAILABLE", highlights: ["Themed", "Family"], offers: ["Flat 15% off"] },
  { restaurantId: "din_004", name: "Mamagoto", cuisine: ["Pan Asian", "Japanese"], rating: 4.2, ratingCount: 980, locality: "Khan Market", costForTwo: 1400, availability: "AVAILABLE", highlights: ["Casual", "Friends"], offers: [] },
  { restaurantId: "din_005", name: "Indian Accent", cuisine: ["Fine Indian", "Contemporary"], rating: 4.7, ratingCount: 540, locality: "The Lodhi", costForTwo: 5000, availability: "AVAILABLE", highlights: ["Premium", "Date Night"], offers: [] },
  { restaurantId: "din_006", name: "Burma Burma", cuisine: ["Burmese", "Vegetarian"], rating: 4.4, ratingCount: 670, locality: "Cyber Hub", costForTwo: 1200, availability: "AVAILABLE", highlights: ["Veg", "Casual"], offers: ["10% off on weekdays"] },
  { restaurantId: "din_007", name: "Pind Balluchi", cuisine: ["North Indian", "Punjabi"], rating: 4.0, ratingCount: 1560, locality: "Multiple Outlets", costForTwo: 1000, availability: "AVAILABLE", highlights: ["Family", "Value"], offers: ["Flat 25% off"] },
  { restaurantId: "din_008", name: "Soy Wasabi", cuisine: ["Japanese", "Sushi"], rating: 4.3, ratingCount: 430, locality: "DLF Mall", costForTwo: 2000, availability: "AVAILABLE", highlights: ["Date Night", "Premium"], offers: [] },
  { restaurantId: "din_009", name: "Cafe Delhi Heights", cuisine: ["Continental", "Cafe"], rating: 4.1, ratingCount: 890, locality: "DLF Phase 4", costForTwo: 1200, availability: "AVAILABLE", highlights: ["Casual", "Brunch"], offers: ["Free starter"] },
  { restaurantId: "din_010", name: "Bukhara", cuisine: ["North Indian", "Tandoor"], rating: 4.8, ratingCount: 320, locality: "ITC Maurya", costForTwo: 6000, availability: "AVAILABLE", highlights: ["Premium", "Special Occasion"], offers: [] },
  { restaurantId: "din_011", name: "The Spice Route", cuisine: ["Asian", "Thai"], rating: 4.5, ratingCount: 410, locality: "The Imperial", costForTwo: 3500, availability: "AVAILABLE", highlights: ["Fine Dining", "Date Night"], offers: [] },
  { restaurantId: "din_012", name: "Barbeque Nation", cuisine: ["Grill", "Buffet"], rating: 4.2, ratingCount: 2100, locality: "Multiple Outlets", costForTwo: 1500, availability: "AVAILABLE", highlights: ["Family", "Party"], offers: ["Kids eat free"] },
  { restaurantId: "din_013", name: "Raasta", cuisine: ["Caribbean", "Bar Food"], rating: 4.0, ratingCount: 560, locality: "Hauz Khas", costForTwo: 1000, availability: "AVAILABLE", highlights: ["Party", "Friends"], offers: ["Happy hours 5-8 PM"] },
  { restaurantId: "din_014", name: "Sattvik", cuisine: ["Pure Veg", "North Indian"], rating: 4.1, ratingCount: 340, locality: "Sector 17", costForTwo: 800, availability: "AVAILABLE", highlights: ["Veg", "Family"], offers: ["20% off weekday lunch"] },
  { restaurantId: "din_015", name: "1947", cuisine: ["North Indian", "Mughlai"], rating: 4.3, ratingCount: 480, locality: "Sector 26", costForTwo: 1400, availability: "AVAILABLE", highlights: ["Family", "Celebrations"], offers: ["10% off for tables of 4+"] },
];

/**
 * Generate slots for a venue for the next 7 days.
 * Matches get_available_slots response shape:
 * - dateStr (YYYY-MM-DD), reservationTime (epoch), displayTime, slotGroupName
 * - deals[] with slotId, itemId (restaurantId-ticketId), isFree=true, bookingPrice=0
 *
 * ~20% of slots randomly marked unavailable via seeded pseudo-random.
 */
export function generateSlots(restaurantId: string, daysAhead = 7): DineoutSlot[] {
  const slots: DineoutSlot[] = [];
  const now = new Date();

  // Simple seeded hash for deterministic "random" per venue+date
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];

    const mealSlots = [
      { group: "Lunch" as const, times: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM"] },
      { group: "Dinner" as const, times: ["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"] },
    ];

    for (const meal of mealSlots) {
      for (let i = 0; i < meal.times.length; i++) {
        const displayTime = meal.times[i];
        const seed = hash(`${restaurantId}-${dateStr}-${displayTime}`);
        const isAvailable = seed % 5 !== 0; // ~20% unavailable

        if (!isAvailable) continue;

        // Parse time for epoch
        const [timePart, ampm] = displayTime.split(" ");
        const [hourStr, minStr] = timePart.split(":");
        let hour = parseInt(hourStr);
        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        const slotDate = new Date(date);
        slotDate.setHours(hour, parseInt(minStr), 0, 0);

        const slotId = seed % 100000;
        const ticketId = 1000 + (seed % 500);

        const deal: DineoutDeal = {
          slotId,
          itemId: `${restaurantId}-${ticketId}`,
          title: "Free Reservation",
          bookingPrice: 0,
          isFree: true,
          discountPercentage: 0,
        };

        // Add venue-specific discount to some deals
        const venue = VENUE_CATALOG.find(v => v.restaurantId === restaurantId);
        if (venue && venue.offers.length > 0) {
          const pctMatch = venue.offers[0].match(/(\d+)%/);
          if (pctMatch) deal.discountPercentage = parseInt(pctMatch[1]);
        }

        slots.push({
          dateStr,
          reservationTime: slotDate.getTime(),
          displayTime,
          slotGroupName: meal.group,
          deals: [deal],
        });
      }
    }
  }

  return slots;
}
