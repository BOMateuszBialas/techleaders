/*
 * SIMULATED DATA. Every product, price, order, customer and number below is invented for the
 * prototype (mapa-ekranow.md AS-03, AS-07). Nothing here is read from the app or a database.
 */

export const DEMO_NOTICE = "Demo store. Simulated data: no real payment, no shipping, no real account.";

export type Product = {
  slug: string;
  name: string;
  category: string;
  priceMinor: number;
  stock: number;
  featured: boolean;
  sku: string;
};

export const products: Product[] = [
  { slug: "vortex-2", name: "Wireless mouse Vortex 2 [DEMO]", category: "Mice", priceMinor: 24900, stock: 12, featured: true, sku: "DEMO-MS-001" },
  { slug: "k7", name: "Mechanical keyboard K7 [DEMO]", category: "Keyboards", priceMinor: 44900, stock: 3, featured: true, sku: "DEMO-KB-007" },
  { slug: "stream-mic", name: "USB microphone Stream [DEMO]", category: "Audio", priceMinor: 31900, stock: 0, featured: true, sku: "DEMO-AU-003" },
  { slug: "pad-xl", name: "Desk mat XL [DEMO]", category: "Desk", priceMinor: 8900, stock: 40, featured: false, sku: "DEMO-DK-010" },
  { slug: "headset-h3", name: "Headset H3 [DEMO]", category: "Audio", priceMinor: 19900, stock: 5, featured: false, sku: "DEMO-AU-005" },
  { slug: "grip-tape", name: "Mouse grip tape [DEMO]", category: "Mice", priceMinor: 2900, stock: 60, featured: false, sku: "DEMO-MS-004" },
];

export const categories = ["All", "Mice", "Keyboards", "Audio", "Desk"];

/** Money is integer minor units (grosze). Display only; no float arithmetic in the prototype. */
export function formatPln(minor: number): string {
  const zl = Math.floor(minor / 100).toLocaleString("en-US").replace(/,/g, " ");
  return `${zl},${String(minor % 100).padStart(2, "0")} zł`;
}

export const cartLines = [
  { product: products[0], qty: 2 },
  { product: products[1], qty: 1 },
];

export const orders = [
  { reference: "DEMO-2026-0412", date: "16 Oct 2026, 11:42", status: "Paid", owner: "Account", total: 94700, customer: "klient-a@demo.test" },
  { reference: "DEMO-2026-0411", date: "16 Oct 2026, 09:05", status: "Pending payment", owner: "Guest", total: 24900, customer: "Guest (demo)" },
  { reference: "DEMO-2026-0408", date: "15 Oct 2026, 18:20", status: "Shipped", owner: "Demo seed", total: 8900, customer: "Demo customer" },
  { reference: "DEMO-2026-0402", date: "15 Oct 2026, 10:11", status: "Cancelled", owner: "Guest", total: 19900, customer: "Guest (demo)" },
];

/** Copilot answer content: invented for the prototype (AS-07), not what the app's tools return. */
export const recommendations = [
  {
    id: "R1",
    title: "Restock Keyboard K7 before the weekend",
    priority: "High",
    observation: "K7 has 3 units left and sold 9 units in the last 7 days.",
    evidence: [["Units sold, 9–16 Oct", "9"], ["Stock now", "3"]],
    limitation: "Sales and stock only; the demo data has no supplier lead times.",
  },
  {
    id: "R2",
    title: "Feature Headset H3 next to Keyboard K7 on the home page",
    priority: "Medium",
    observation: "Headset H3 was viewed often but rarely added to the cart.",
    evidence: [["Product page views (fictional demo data)", "412"], ["Add-to-cart rate (fictional demo data)", "2.1%"]],
    limitation: "Correlation only. The traffic figures are fictional demo data.",
  },
  {
    id: "R3",
    title: "Review the availability of USB microphone Stream",
    priority: "Low",
    observation: "The product is out of stock, so it is not selling now.",
    evidence: [["Stock now", "0"], ["Units sold, 9–16 Oct", "0"]],
    limitation: "No cost data in the store, so margin is not evaluated.",
  },
];
