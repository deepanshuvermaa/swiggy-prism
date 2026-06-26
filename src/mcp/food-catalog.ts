import type { Restaurant, MenuItem, FoodCoupon } from "../types/index.js";

export const RESTAURANT_CATALOG: Restaurant[] = [
  { restaurantId: "rest_001", name: "Punjab Grill", cuisine: ["North Indian", "Mughlai"], rating: 4.3, ratingCount: 1240, deliveryTimeMin: 28, deliveryFee: 30, distanceKm: 2.1, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_002", name: "Biryani Blues", cuisine: ["Biryani", "Hyderabadi"], rating: 4.4, ratingCount: 2100, deliveryTimeMin: 35, deliveryFee: 25, distanceKm: 3.2, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_003", name: "Moti Mahal Delux", cuisine: ["Mughlai", "North Indian"], rating: 4.2, ratingCount: 890, deliveryTimeMin: 32, deliveryFee: 30, distanceKm: 2.8, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_004", name: "Sagar Ratna", cuisine: ["South Indian", "Vegetarian"], rating: 4.1, ratingCount: 1560, deliveryTimeMin: 25, deliveryFee: 20, distanceKm: 1.5, availabilityStatus: "OPEN", isVeg: true },
  { restaurantId: "rest_005", name: "Haldiram's", cuisine: ["Street Food", "Chaat", "Sweets"], rating: 4.0, ratingCount: 3200, deliveryTimeMin: 20, deliveryFee: 15, distanceKm: 1.2, availabilityStatus: "OPEN", isVeg: true },
  { restaurantId: "rest_006", name: "Domino's Pizza", cuisine: ["Pizza", "Italian"], rating: 3.9, ratingCount: 4500, deliveryTimeMin: 30, deliveryFee: 0, distanceKm: 2.0, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_007", name: "Pasta La Vista", cuisine: ["Italian", "Continental"], rating: 4.2, ratingCount: 670, deliveryTimeMin: 35, deliveryFee: 35, distanceKm: 3.5, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_008", name: "Chinese Wok", cuisine: ["Chinese", "Asian"], rating: 4.0, ratingCount: 1890, deliveryTimeMin: 25, deliveryFee: 20, distanceKm: 2.3, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_009", name: "The Egg Factory", cuisine: ["Egg Specialties", "Breakfast"], rating: 4.1, ratingCount: 560, deliveryTimeMin: 22, deliveryFee: 20, distanceKm: 1.8, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_010", name: "Chaayos", cuisine: ["Beverages", "Snacks"], rating: 3.8, ratingCount: 2300, deliveryTimeMin: 18, deliveryFee: 15, distanceKm: 1.0, availabilityStatus: "OPEN", isVeg: true },
  { restaurantId: "rest_011", name: "Wow! Momo", cuisine: ["Momos", "Street Food"], rating: 4.0, ratingCount: 1780, deliveryTimeMin: 20, deliveryFee: 15, distanceKm: 1.5, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_012", name: "Behrouz Biryani", cuisine: ["Biryani", "Mughlai"], rating: 4.5, ratingCount: 3400, deliveryTimeMin: 40, deliveryFee: 40, distanceKm: 4.0, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_013", name: "Faasos", cuisine: ["Wraps", "Indian", "Quick Bites"], rating: 3.9, ratingCount: 2800, deliveryTimeMin: 25, deliveryFee: 20, distanceKm: 2.0, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_014", name: "Burger King", cuisine: ["Burgers", "Fast Food"], rating: 3.7, ratingCount: 4100, deliveryTimeMin: 22, deliveryFee: 0, distanceKm: 1.8, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_015", name: "Subway", cuisine: ["Subs", "Healthy", "Salads"], rating: 3.8, ratingCount: 2900, deliveryTimeMin: 20, deliveryFee: 0, distanceKm: 1.5, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_016", name: "Karim's", cuisine: ["Mughlai", "Kebabs"], rating: 4.4, ratingCount: 1100, deliveryTimeMin: 38, deliveryFee: 35, distanceKm: 3.8, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_017", name: "Saravana Bhavan", cuisine: ["South Indian", "Vegetarian"], rating: 4.3, ratingCount: 2600, deliveryTimeMin: 28, deliveryFee: 25, distanceKm: 2.2, availabilityStatus: "OPEN", isVeg: true },
  { restaurantId: "rest_018", name: "Barbeque Nation", cuisine: ["Grills", "Buffet"], rating: 4.2, ratingCount: 1450, deliveryTimeMin: 35, deliveryFee: 40, distanceKm: 3.0, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_019", name: "Local Dhaba", cuisine: ["Home Style", "North Indian"], rating: 3.6, ratingCount: 340, deliveryTimeMin: 18, deliveryFee: 10, distanceKm: 0.8, availabilityStatus: "OPEN", isVeg: false },
  { restaurantId: "rest_020", name: "Cafe Delhi Heights", cuisine: ["Continental", "Cafe"], rating: 4.1, ratingCount: 920, deliveryTimeMin: 30, deliveryFee: 30, distanceKm: 2.5, availabilityStatus: "OPEN", isVeg: false },
];

export const MENU_CATALOG: MenuItem[] = [
  // Punjab Grill
  { itemId: "item_001", restaurantId: "rest_001", name: "Butter Chicken", description: "Creamy tomato-based curry with tender chicken", price: 320, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_002", restaurantId: "rest_001", name: "Dal Makhani", description: "Slow-cooked black lentils in butter cream", price: 220, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_003", restaurantId: "rest_001", name: "Paneer Tikka", description: "Grilled cottage cheese with spices", price: 280, isVeg: true, isBestseller: false, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_004", restaurantId: "rest_001", name: "Chicken Biryani", description: "Fragrant basmati rice with spiced chicken", price: 350, isVeg: false, isBestseller: true, category: "Rice", hasVariants: false, hasAddons: false },
  { itemId: "item_005", restaurantId: "rest_001", name: "Naan", description: "Tandoor-baked flatbread", price: 50, isVeg: true, isBestseller: false, category: "Breads", hasVariants: false, hasAddons: false },
  { itemId: "item_006", restaurantId: "rest_001", name: "Raita", description: "Yogurt with cucumber and spices", price: 60, isVeg: true, isBestseller: false, category: "Accompaniments", hasVariants: false, hasAddons: false },

  // Biryani Blues
  { itemId: "item_007", restaurantId: "rest_002", name: "Chicken Biryani", description: "Hyderabadi dum biryani with tender chicken", price: 299, isVeg: false, isBestseller: true, category: "Biryani", hasVariants: false, hasAddons: false },
  { itemId: "item_008", restaurantId: "rest_002", name: "Mutton Biryani", description: "Slow-cooked mutton dum biryani", price: 449, isVeg: false, isBestseller: true, category: "Biryani", hasVariants: false, hasAddons: false },
  { itemId: "item_009", restaurantId: "rest_002", name: "Veg Biryani", description: "Mixed vegetable dum biryani", price: 199, isVeg: true, isBestseller: false, category: "Biryani", hasVariants: false, hasAddons: false },
  { itemId: "item_010", restaurantId: "rest_002", name: "Mirchi Ka Salan", description: "Hyderabadi chili curry", price: 99, isVeg: true, isBestseller: false, category: "Sides", hasVariants: false, hasAddons: false },
  { itemId: "item_011", restaurantId: "rest_002", name: "Raita", description: "Cooling yogurt side", price: 49, isVeg: true, isBestseller: false, category: "Sides", hasVariants: false, hasAddons: false },

  // Moti Mahal Delux
  { itemId: "item_012", restaurantId: "rest_003", name: "Butter Chicken", description: "The original butter chicken recipe", price: 340, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_013", restaurantId: "rest_003", name: "Tandoori Chicken", description: "Whole chicken marinated and grilled", price: 380, isVeg: false, isBestseller: true, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_014", restaurantId: "rest_003", name: "Dal Tadka", description: "Yellow lentils tempered with ghee", price: 180, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_015", restaurantId: "rest_003", name: "Paneer Butter Masala", description: "Cottage cheese in rich tomato gravy", price: 260, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_016", restaurantId: "rest_003", name: "Naan", description: "Butter naan from tandoor", price: 55, isVeg: true, isBestseller: false, category: "Breads", hasVariants: false, hasAddons: false },

  // Sagar Ratna (Veg)
  { itemId: "item_017", restaurantId: "rest_004", name: "Masala Dosa", description: "Crispy crepe with potato filling", price: 160, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_018", restaurantId: "rest_004", name: "Idli Sambar", description: "Steamed rice cakes with lentil soup", price: 120, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_019", restaurantId: "rest_004", name: "Paneer Tikka", description: "Grilled paneer with bell peppers", price: 240, isVeg: true, isBestseller: false, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_020", restaurantId: "rest_004", name: "Rajma Chawal", description: "Kidney beans curry with rice", price: 180, isVeg: true, isBestseller: true, category: "Thali", hasVariants: false, hasAddons: false },
  { itemId: "item_021", restaurantId: "rest_004", name: "Chole Bhature", description: "Chickpea curry with fried bread", price: 170, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },

  // Haldiram's
  { itemId: "item_022", restaurantId: "rest_005", name: "Chole Bhature", description: "Classic Delhi-style chole with bhature", price: 150, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_023", restaurantId: "rest_005", name: "Aloo Tikki", description: "Crispy potato patties with chutney", price: 80, isVeg: true, isBestseller: false, category: "Snacks", hasVariants: false, hasAddons: false },
  { itemId: "item_024", restaurantId: "rest_005", name: "Palak Paneer", description: "Spinach and cottage cheese curry", price: 200, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_025", restaurantId: "rest_005", name: "Dal Tadka", description: "Yellow dal tempered with spices", price: 160, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },

  // Domino's Pizza
  { itemId: "item_026", restaurantId: "rest_006", name: "Margherita Pizza", description: "Classic cheese pizza", price: 199, isVeg: true, isBestseller: true, category: "Pizza", hasVariants: false, hasAddons: false },
  { itemId: "item_027", restaurantId: "rest_006", name: "Chicken Pepperoni", description: "Loaded with chicken pepperoni", price: 349, isVeg: false, isBestseller: true, category: "Pizza", hasVariants: false, hasAddons: false },
  { itemId: "item_028", restaurantId: "rest_006", name: "Garlic Breadsticks", description: "Cheesy garlic bread", price: 99, isVeg: true, isBestseller: false, category: "Sides", hasVariants: false, hasAddons: false },
  { itemId: "item_029", restaurantId: "rest_006", name: "Pasta", description: "Creamy Italian pasta", price: 169, isVeg: true, isBestseller: false, category: "Pasta", hasVariants: false, hasAddons: false },

  // Pasta La Vista
  { itemId: "item_030", restaurantId: "rest_007", name: "Pasta Arrabiata", description: "Penne in spicy tomato sauce", price: 260, isVeg: true, isBestseller: true, category: "Pasta", hasVariants: false, hasAddons: false },
  { itemId: "item_031", restaurantId: "rest_007", name: "Chicken Alfredo", description: "Creamy white sauce pasta with chicken", price: 320, isVeg: false, isBestseller: true, category: "Pasta", hasVariants: false, hasAddons: false },
  { itemId: "item_032", restaurantId: "rest_007", name: "Margherita Pizza", description: "Wood-fired thin crust pizza", price: 280, isVeg: true, isBestseller: false, category: "Pizza", hasVariants: false, hasAddons: false },

  // Chinese Wok
  { itemId: "item_033", restaurantId: "rest_008", name: "Veg Fried Rice", description: "Wok-tossed vegetable fried rice", price: 180, isVeg: true, isBestseller: true, category: "Rice", hasVariants: false, hasAddons: false },
  { itemId: "item_034", restaurantId: "rest_008", name: "Chicken Fried Rice", description: "Classic chicken fried rice", price: 220, isVeg: false, isBestseller: true, category: "Rice", hasVariants: false, hasAddons: false },
  { itemId: "item_035", restaurantId: "rest_008", name: "Veg Manchurian", description: "Deep fried veg balls in tangy sauce", price: 170, isVeg: true, isBestseller: false, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_036", restaurantId: "rest_008", name: "Hakka Noodles", description: "Stir-fried noodles with vegetables", price: 190, isVeg: true, isBestseller: false, category: "Noodles", hasVariants: false, hasAddons: false },
  { itemId: "item_037", restaurantId: "rest_008", name: "Chilli Chicken", description: "Spicy Indo-Chinese chicken", price: 250, isVeg: false, isBestseller: true, category: "Starters", hasVariants: false, hasAddons: false },

  // The Egg Factory
  { itemId: "item_038", restaurantId: "rest_009", name: "Egg Curry", description: "Boiled eggs in spiced onion-tomato gravy", price: 180, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_039", restaurantId: "rest_009", name: "Omelette", description: "Masala omelette with onion and chili", price: 90, isVeg: false, isBestseller: true, category: "Breakfast", hasVariants: false, hasAddons: false },
  { itemId: "item_040", restaurantId: "rest_009", name: "Egg Biryani", description: "Fragrant rice with spiced eggs", price: 220, isVeg: false, isBestseller: false, category: "Rice", hasVariants: false, hasAddons: false },
  { itemId: "item_041", restaurantId: "rest_009", name: "Egg Fried Rice", description: "Wok-tossed rice with scrambled eggs", price: 160, isVeg: false, isBestseller: false, category: "Rice", hasVariants: false, hasAddons: false },

  // Chaayos
  { itemId: "item_042", restaurantId: "rest_010", name: "Maggi", description: "Classic Maggi noodles", price: 99, isVeg: true, isBestseller: true, category: "Snacks", hasVariants: false, hasAddons: false },
  { itemId: "item_043", restaurantId: "rest_010", name: "Sandwich", description: "Grilled veg sandwich", price: 120, isVeg: true, isBestseller: false, category: "Snacks", hasVariants: false, hasAddons: false },

  // Wow! Momo
  { itemId: "item_044", restaurantId: "rest_011", name: "Steamed Momos", description: "Classic steamed chicken momos", price: 140, isVeg: false, isBestseller: true, category: "Momos", hasVariants: false, hasAddons: false },
  { itemId: "item_045", restaurantId: "rest_011", name: "Fried Momos", description: "Crispy fried chicken momos", price: 160, isVeg: false, isBestseller: true, category: "Momos", hasVariants: false, hasAddons: false },

  // Behrouz Biryani
  { itemId: "item_046", restaurantId: "rest_012", name: "Chicken Biryani", description: "Royal Mughlai chicken biryani", price: 349, isVeg: false, isBestseller: true, category: "Biryani", hasVariants: false, hasAddons: false },
  { itemId: "item_047", restaurantId: "rest_012", name: "Mutton Biryani", description: "Premium mutton dum biryani", price: 499, isVeg: false, isBestseller: true, category: "Biryani", hasVariants: false, hasAddons: false },
  { itemId: "item_048", restaurantId: "rest_012", name: "Veg Biryani", description: "Subz-e-biryani with seasonal vegetables", price: 249, isVeg: true, isBestseller: false, category: "Biryani", hasVariants: false, hasAddons: false },

  // Faasos
  { itemId: "item_049", restaurantId: "rest_013", name: "Chicken Tikka Wrap", description: "Grilled chicken tikka in rumali roti", price: 159, isVeg: false, isBestseller: true, category: "Wraps", hasVariants: false, hasAddons: false },
  { itemId: "item_050", restaurantId: "rest_013", name: "Paneer Tikka Wrap", description: "Grilled paneer in rumali roti", price: 139, isVeg: true, isBestseller: false, category: "Wraps", hasVariants: false, hasAddons: false },
  { itemId: "item_051", restaurantId: "rest_013", name: "Chicken Biryani", description: "Classic dum biryani", price: 199, isVeg: false, isBestseller: true, category: "Rice", hasVariants: false, hasAddons: false },

  // Burger King
  { itemId: "item_052", restaurantId: "rest_014", name: "Whopper", description: "Flame-grilled chicken burger", price: 189, isVeg: false, isBestseller: true, category: "Burgers", hasVariants: false, hasAddons: false },
  { itemId: "item_053", restaurantId: "rest_014", name: "Veg Whopper", description: "Plant-based crispy burger", price: 159, isVeg: true, isBestseller: false, category: "Burgers", hasVariants: false, hasAddons: false },

  // Subway
  { itemId: "item_054", restaurantId: "rest_015", name: "Chicken Teriyaki Sub", description: "6-inch teriyaki chicken sub", price: 220, isVeg: false, isBestseller: true, category: "Subs", hasVariants: false, hasAddons: false },
  { itemId: "item_055", restaurantId: "rest_015", name: "Veggie Delite Sub", description: "6-inch loaded with vegetables", price: 160, isVeg: true, isBestseller: false, category: "Subs", hasVariants: false, hasAddons: false },

  // Karim's
  { itemId: "item_056", restaurantId: "rest_016", name: "Butter Chicken", description: "Karim's famous butter chicken", price: 360, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_057", restaurantId: "rest_016", name: "Mutton Rogan Josh", description: "Kashmiri-style mutton curry", price: 420, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_058", restaurantId: "rest_016", name: "Seekh Kebab", description: "Minced mutton grilled on skewers", price: 280, isVeg: false, isBestseller: true, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_059", restaurantId: "rest_016", name: "Biryani", description: "Karim's special mutton biryani", price: 380, isVeg: false, isBestseller: false, category: "Rice", hasVariants: false, hasAddons: false },

  // Saravana Bhavan (Veg)
  { itemId: "item_060", restaurantId: "rest_017", name: "Masala Dosa", description: "South Indian crispy dosa", price: 140, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_061", restaurantId: "rest_017", name: "Mini Thali", description: "Complete South Indian meal", price: 220, isVeg: true, isBestseller: true, category: "Thali", hasVariants: false, hasAddons: false },
  { itemId: "item_062", restaurantId: "rest_017", name: "Palak Paneer", description: "Creamy spinach with paneer cubes", price: 190, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_063", restaurantId: "rest_017", name: "Chole Bhature", description: "Chickpea curry with puffed bread", price: 160, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },

  // Barbeque Nation
  { itemId: "item_064", restaurantId: "rest_018", name: "Tandoori Chicken", description: "Signature grilled chicken", price: 350, isVeg: false, isBestseller: true, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_065", restaurantId: "rest_018", name: "Paneer Tikka", description: "Marinated and grilled paneer", price: 280, isVeg: true, isBestseller: true, category: "Starters", hasVariants: false, hasAddons: false },
  { itemId: "item_066", restaurantId: "rest_018", name: "Chicken Biryani", description: "Aromatic chicken dum biryani", price: 320, isVeg: false, isBestseller: false, category: "Rice", hasVariants: false, hasAddons: false },

  // Local Dhaba
  { itemId: "item_067", restaurantId: "rest_019", name: "Dal Tadka", description: "Home-style yellow dal", price: 110, isVeg: true, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_068", restaurantId: "rest_019", name: "Egg Curry", description: "Simple egg curry with roti", price: 130, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_069", restaurantId: "rest_019", name: "Aloo Gobi", description: "Potato and cauliflower dry sabzi", price: 100, isVeg: true, isBestseller: false, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_070", restaurantId: "rest_019", name: "Rajma Chawal", description: "Kidney beans with steamed rice", price: 120, isVeg: true, isBestseller: true, category: "Thali", hasVariants: false, hasAddons: false },
  { itemId: "item_071", restaurantId: "rest_019", name: "Butter Chicken", description: "Dhaba-style butter chicken", price: 200, isVeg: false, isBestseller: true, category: "Main Course", hasVariants: false, hasAddons: false },
  { itemId: "item_072", restaurantId: "rest_019", name: "Roti", description: "Fresh tandoor roti", price: 15, isVeg: true, isBestseller: false, category: "Breads", hasVariants: false, hasAddons: false },

  // Cafe Delhi Heights
  { itemId: "item_073", restaurantId: "rest_020", name: "Pasta", description: "Penne in creamy tomato sauce", price: 280, isVeg: true, isBestseller: true, category: "Pasta", hasVariants: false, hasAddons: false },
  { itemId: "item_074", restaurantId: "rest_020", name: "Chicken Burger", description: "Grilled chicken with lettuce", price: 260, isVeg: false, isBestseller: false, category: "Burgers", hasVariants: false, hasAddons: false },
  { itemId: "item_075", restaurantId: "rest_020", name: "Sandwich", description: "Club sandwich with fries", price: 240, isVeg: false, isBestseller: false, category: "Snacks", hasVariants: false, hasAddons: false },
];

/** COD-eligible coupons only — requiresOnlinePayment: false per Swiggy v1 constraint */
export const COUPON_CATALOG: FoodCoupon[] = [
  { couponCode: "WELCOME50", description: "Flat ₹50 off on your order", discountType: "flat", discountValue: 50, minOrderValue: 199, maxDiscount: 50, requiresOnlinePayment: false },
  { couponCode: "PARTY20", description: "20% off up to ₹100", discountType: "percentage", discountValue: 20, minOrderValue: 500, maxDiscount: 100, requiresOnlinePayment: false },
  { couponCode: "TRYNEW", description: "₹75 off on first order from this restaurant", discountType: "flat", discountValue: 75, minOrderValue: 299, maxDiscount: 75, requiresOnlinePayment: false },
  { couponCode: "SWIGGYIT", description: "10% off up to ₹50", discountType: "percentage", discountValue: 10, minOrderValue: 149, maxDiscount: 50, requiresOnlinePayment: false },
  { couponCode: "FEAST15", description: "15% off up to ₹75", discountType: "percentage", discountValue: 15, minOrderValue: 400, maxDiscount: 75, requiresOnlinePayment: false },
  { couponCode: "BIRYANI100", description: "₹100 off on biryani orders", discountType: "flat", discountValue: 100, minOrderValue: 399, maxDiscount: 100, requiresOnlinePayment: false },
  { couponCode: "HEALTHY30", description: "₹30 off on veg orders", discountType: "flat", discountValue: 30, minOrderValue: 199, maxDiscount: 30, requiresOnlinePayment: false },
  { couponCode: "MEGA", description: "25% off up to ₹125", discountType: "percentage", discountValue: 25, minOrderValue: 600, maxDiscount: 125, requiresOnlinePayment: false },
];
