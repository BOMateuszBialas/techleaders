/*
 * SIMULATED DATA. Every product, price, order, customer and number below is invented for the
 * prototype (mapa-ekranow.md AS-03, AS-07). Nothing here is read from the app or a database.
 * Storefront product names carry no "[DEMO]" suffix since the owner's 2026-10-26 decision 1; the
 * admin screens keep their own marking (D08) in owner.tsx.
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
  /** One short line for the product page (AS-08: invented copy). */
  short: string;
  /** Units sold in 9–16 Oct, fictional (AS-09). Only used to pick "Best sellers". */
  sold7d: number;
};

export const products: Product[] = [
  { slug: "vortex-2", name: "Wireless mouse Vortex 2", category: "Mice", priceMinor: 24900, stock: 12, featured: true, sku: "DEMO-MS-001", short: "Wireless mouse, 65 g, two modes of connection.", sold7d: 31 },
  { slug: "k7", name: "Mechanical keyboard K7", category: "Keyboards", priceMinor: 44900, stock: 3, featured: true, sku: "DEMO-KB-007", short: "Tenkeyless keyboard with linear switches.", sold7d: 9 },
  { slug: "stream-mic", name: "USB microphone Stream", category: "Audio", priceMinor: 31900, stock: 0, featured: true, sku: "DEMO-AU-003", short: "Cardioid USB microphone with a mute button.", sold7d: 0 },
  { slug: "pad-xl", name: "Desk mat XL", category: "Desk", priceMinor: 8900, stock: 40, featured: false, sku: "DEMO-DK-010", short: "Wide desk mat with a stitched edge.", sold7d: 22 },
  { slug: "headset-h3", name: "Headset H3", category: "Audio", priceMinor: 19900, stock: 5, featured: false, sku: "DEMO-AU-005", short: "Closed-back headset with a boom microphone.", sold7d: 14 },
  { slug: "grip-tape", name: "Mouse grip tape", category: "Mice", priceMinor: 2900, stock: 60, featured: false, sku: "DEMO-MS-004", short: "Sweat-resistant grip tape for mouse sides.", sold7d: 40 },
];

export const categories = ["All", "Mice", "Keyboards", "Audio", "Desk"];

/** Money is integer minor units (grosze). Display only; no float arithmetic in the prototype. */
export function formatPln(minor: number): string {
  const zl = Math.floor(minor / 100).toLocaleString("en-US").replace(/,/g, " ");
  return `${zl},${String(minor % 100).padStart(2, "0")} zł`;
}

/** Cart lines for the drawer's starting state and the /cart page (slug + quantity). */
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

/* Storefront home content (owner decision 4). Every fact is from the spec or marked ASSUMPTION. */

/** Promo banners: no discounts (discounts are out of scope in the brief). Facts come from the data. */
export const promoBanners = [
  { title: "Desk setup", text: "Mats and cable trays for a tidy desk.", cta: "Browse desk gear", href: "#s02" },
  { title: "Audio for calls", text: "Headsets and microphones for voice chat.", cta: "See audio", href: "#s02" },
  { title: "Low stock", text: "Keyboard K7: 3 units left at the time of the prototype.", cta: "View keyboard", href: "#s03" },
];

/** "Why buy here": facts from the spec, plus one clearly marked assumption (AS-01). */
export const whyBuyHere = [
  { title: "Buy without an account", text: "Guest checkout is always available. An account is optional." },
  { title: "Stock is checked at checkout", text: "The price and stock are checked again on the server before an order is placed." },
  { title: "Keep your reference", text: "Each order has a reference that finds it later in My orders or by lookup." },
  { title: "Delivery and returns [ASSUMPTION AS-01]", text: "Assumed: delivery in 1–3 working days, returns within 14 days. Not a live policy." },
];

/** Product page (Vortex 2, products[0]): specification rows. Every value is fictional (AS-10). */
export const specRows: [string, string][] = [
  ["Switch type", "Optical-mechanical (fictional)"],
  ["Connection", "2.4 GHz wireless and USB-C (fictional)"],
  ["Weight", "65 g (fictional)"],
  ["Dimensions", "118 × 62 × 38 mm (fictional)"],
  ["Warranty", "24 months (fictional, AS-10)"],
];

/** Product page gallery: placeholder views until the owner picks photos (P-item). */
export const galleryShots = ["Front", "Side", "Top", "In hand"];
