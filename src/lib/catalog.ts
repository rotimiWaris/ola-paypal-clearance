import type { Product } from "./types";

export const CATALOG: Product[] = [
  {
    sku: "OAT-6",
    name: "Oat milk, 6 × 1 L",
    category: "pantry",
    unitPriceCents: 1800,
    subscription: false,
    note: "House pour for the coffee station",
  },
  {
    sku: "BEAN-1",
    name: "Espresso beans, 1 kg",
    category: "pantry",
    unitPriceCents: 2200,
    subscription: false,
    note: "Lumen's usual medium roast",
  },
  {
    sku: "BREW",
    name: "Cold brew concentrate, 1 L",
    category: "pantry",
    unitPriceCents: 2100,
    subscription: false,
    note: "Friday service",
  },
  {
    sku: "CUP-50",
    name: "Compostable cups, 50",
    category: "disposables",
    unitPriceCents: 1400,
    subscription: false,
    note: "12 oz",
  },
  {
    sku: "SOAP",
    name: "Dish soap, 1 L",
    category: "cleaning",
    unitPriceCents: 900,
    subscription: false,
    note: "Unscented, bar sink",
  },
  {
    sku: "TOWEL",
    name: "Paper towels, 12 rolls",
    category: "cleaning",
    unitPriceCents: 1600,
    subscription: false,
    note: "Studio closet",
  },
  {
    sku: "RESERVE",
    name: "Reserve club, monthly",
    category: "pantry",
    unitPriceCents: 3600,
    subscription: true,
    note: "Single-origin subscription",
  },
  {
    sku: "PAN",
    name: "Cast-iron skillet, 12 in",
    category: "equipment",
    unitPriceCents: 6800,
    subscription: false,
    note: "Still on the staff wishlist",
  },
];

export function productBySku(sku: string, catalog: Product[] = CATALOG) {
  return catalog.find((item) => item.sku === sku);
}
