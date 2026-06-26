import type {
  Restaurant,
  MenuItem,
  FoodCoupon,
  FoodCart,
  DineoutVenue,
  DineoutSlot,
  DineoutBooking,
} from "../types/index.js";

/**
 * Food delivery provider — mirrors Swiggy Food MCP tools.
 * Params match the real API: addressId, restaurantId, cartItems, etc.
 */
export interface FoodProvider {
  searchRestaurants(addressId: string, query: string): Promise<Restaurant[]>;
  getMenu(addressId: string, restaurantId: string): Promise<MenuItem[]>;
  searchMenu(addressId: string, query: string): Promise<MenuItem[]>;
  updateCart(
    restaurantId: string,
    cartItems: Array<{ itemId: string; quantity: number }>,
    addressId: string
  ): Promise<FoodCart>;
  flushCart(): Promise<void>;
  getCart(addressId: string): Promise<FoodCart>;
  fetchCoupons(restaurantId: string, addressId: string): Promise<FoodCoupon[]>;
  applyCoupon(couponCode: string, addressId: string): Promise<FoodCart>;
  placeOrder(addressId: string): Promise<{ orderId: string }>;
}

/**
 * Dineout provider — mirrors Swiggy Dineout MCP tools.
 * Location via lat/lng (Dineout uses coordinates, not addressId for search).
 */
export interface DineoutProvider {
  searchVenues(
    query: string,
    latitude: number,
    longitude: number,
    entityType?: "locality" | "CUISINE" | "RESTAURANT_CATEGORY"
  ): Promise<DineoutVenue[]>;
  getVenueDetails(
    restaurantId: string,
    latitude: number,
    longitude: number
  ): Promise<DineoutVenue>;
  getAvailableSlots(
    restaurantId: string,
    date: string,
    latitude: number,
    longitude: number
  ): Promise<DineoutSlot[]>;
  bookTable(
    restaurantId: string,
    slotId: number,
    itemId: string,
    reservationTime: number,
    guestCount: number,
    latitude: number,
    longitude: number
  ): Promise<DineoutBooking>;
  getBookingStatus(bookingId: string): Promise<DineoutBooking>;
}
