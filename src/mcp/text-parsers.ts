/**
 * Parsers for Swiggy MCP text responses.
 * MCP tools return human-readable text in content[0].text.
 * These parsers extract structured data from that text.
 */

import type { Restaurant, DineoutVenue, SKU } from "../types/index.js";

/**
 * Parse restaurant listings from Food MCP text.
 * Example: "1. Punjab Grill (ID: rest_001) - 4.3★, North Indian, 28 min, ₹200 for two, 3.5 km"
 */
export function parseFoodRestaurantText(text: string): Restaurant[] {
  const restaurants: Restaurant[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      // Format: "1. Name (Ad) — Cuisine1, Cuisine2 | 4.3★ | 39 min | ₹500 for two (ID: 233548)"
      const idMatch = line.match(/\(ID:\s*([a-zA-Z0-9_-]+)\)/);
      if (!idMatch) continue;

      // Extract name: between "N. " and " — " or " (Ad)"
      const nameMatch = line.match(/\d+\.\s*(.+?)(?:\s*\(Ad\))?\s*[—–-]\s*/);
      if (!nameMatch) continue;

      const ratingMatch = line.match(/([\d.]+)\s*★/);
      const timeMatch = line.match(/(\d+)\s*min/);
      const distMatch = line.match(/([\d.]+)\s*km/);
      const priceMatch = line.match(/₹\s*([\d,]+)\s*(?:for two|for 2)/i);

      // Extract cuisines between — and first |
      const cuisineMatch = line.match(/[—–-]\s*(.+?)\s*\|/);
      const cuisines = cuisineMatch ? cuisineMatch[1].split(',').map(c => c.trim()).filter(c => c) : [];

      restaurants.push({
        restaurantId: idMatch[1],
        name: nameMatch[1].replace(/\s*\(Ad\)/, '').trim(),
        cuisine: cuisines.length > 0 ? cuisines : extractCuisines(line),
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : 4.0,
        ratingCount: 500,
        deliveryTimeMin: timeMatch ? parseInt(timeMatch[1]) : 30,
        deliveryFee: 40,
        distanceKm: distMatch ? parseFloat(distMatch[1]) : 3.0,
        availabilityStatus: "OPEN",
        isVeg: /\bpure veg\b/i.test(line),
      });
    } catch { /* skip */ }
  }

  return restaurants;
}

/**
 * Parse dineout venue listings from Dineout MCP text.
 */
export function parseDineoutText(text: string): DineoutVenue[] {
  const venues: DineoutVenue[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      // Format: "1. Punjab Grill — Mughlai, North Indian | [object Object]★ | ₹2000 for two | Industrial Area (ID: 957053)"
      const idMatch = line.match(/\(ID:\s*([a-zA-Z0-9_-]+)\)/);
      if (!idMatch) continue;

      const nameMatch = line.match(/\d+\.\s*(.+?)\s*[—–-]\s*/);
      if (!nameMatch) continue;

      const priceMatch = line.match(/₹\s*([\d,]+)\s*(?:for two|for 2)/i);

      // Rating might be "[object Object]★" — handle gracefully
      const ratingMatch = line.match(/([\d.]+)\s*★/);

      // Locality is usually the last segment before (ID:)
      const segments = line.split('|').map(s => s.trim());
      const localitySegment = segments.length >= 4 ? segments[segments.length - 1].replace(/\(ID:.*/, '').trim() : '';

      // Cuisines between — and first |
      const cuisineMatch = line.match(/[—–-]\s*(.+?)\s*\|/);
      const cuisines = cuisineMatch ? cuisineMatch[1].split(',').map(c => c.trim()).filter(c => c) : [];

      venues.push({
        restaurantId: idMatch[1],
        name: nameMatch[1].trim(),
        cuisine: cuisines.length > 0 ? cuisines : extractCuisines(line),
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : 4.0,
        ratingCount: 500,
        costForTwo: priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 1200,
        locality: localitySegment,
        availability: "AVAILABLE",
        highlights: [],
        offers: extractOffers(line),
      });
    } catch { /* skip */ }
  }

  return venues;
}

/**
 * Parse product listings from Instamart MCP text.
 */
export function parseInstamartProductText(text: string): SKU[] {
  const skus: SKU[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      // Skip header/instruction lines
      if (/^(Found|DISPLAY|Products are|Show each|$)/i.test(line.trim())) continue;
      if (line.startsWith('-')) continue;

      // Try multiple patterns for product lines
      const idMatch = line.match(/\((?:ID|spinId|SKU|spin_?id):\s*([a-zA-Z0-9_-]+)\)/i)
                   || line.match(/spinId[:\s]*["']?([a-zA-Z0-9_-]+)/i);
      const priceMatch = line.match(/₹\s*([\d,.]+)/);

      // Name can be: "1. Brand Name - Product 500g" or "Brand Name (500g) — ₹45"
      const nameMatch = line.match(/\d+\.\s*(.+?)(?:\s*[—–-]\s*₹|\s*₹|\s*\((?:ID|spin))/i)
                      || line.match(/\d+\.\s*(.+?)$/);

      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (price > 0) {
          const name = nameMatch ? nameMatch[1].replace(/\s*[—–-]\s*$/, '').trim() : line.trim().slice(0, 50);
          const qtyMatch = line.match(/(\d+)\s*(g|kg|ml|l|pcs|pack|piece)/i);

          skus.push({
            skuId: idMatch ? idMatch[1] : 'sku_' + skus.length,
            name: name,
            brand: '',
            price: price,
            quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
            unit: qtyMatch ? qtyMatch[2].toLowerCase() : 'pcs',
            inStock: !/out of stock/i.test(line),
          });
        }
      }
    } catch { /* skip */ }
  }

  return skus;
}

function extractCuisines(text: string): string[] {
  const cuisineKeywords = ['North Indian', 'South Indian', 'Chinese', 'Italian', 'Mughlai', 'Continental', 'Asian', 'Thai', 'Japanese', 'Mexican', 'Biryani', 'Kebab', 'Fast Food', 'Street Food', 'Desserts', 'Cafe', 'Bakery', 'Bengali', 'Punjabi', 'Rajasthani', 'Hyderabadi', 'Andhra', 'Kerala', 'Goan', 'Pan-Asian'];
  return cuisineKeywords.filter(c => text.toLowerCase().includes(c.toLowerCase()));
}

function extractOffers(text: string): string[] {
  const offers: string[] = [];
  const offerMatch = text.match(/(\d+%\s*off)/gi);
  if (offerMatch) offers.push(...offerMatch);
  const flatMatch = text.match(/(flat\s*₹?\d+\s*off)/gi);
  if (flatMatch) offers.push(...flatMatch);
  return offers;
}
