import { productsHref } from "@/components/catalog/catalog-copy";

/**
 * Home page copy (storefront v2, Phase 4). The owner-approved lines only (Q13, Q14, OA-6, OA-11b),
 * typed here and reviewed in a PR; no value comes from the environment. No line promises a
 * discount or a price (discounts are out of scope). `storefront-content.test.ts` checks that.
 */

/** The example delivery text is an assumption (AS-01), labelled "Example policy:" (Q7, OA-5). */
export const EXAMPLE_DELIVERY_TEXT =
  "Example policy: delivery in 1–3 working days, 14-day returns.";

export const HOME_HERO = {
  headline: "Gear for every desk and every match",
  description: "Mice, keyboards, headsets and desk gear. Stock is shown on every product.",
  cta: "Shop all products",
  href: productsHref(),
  photo: "/photos/hero-desk-curved-monitor.jpg",
} as const;

/** A promo banner: flat text, one call to action, an optional decorative or described photo. */
export type PromoBanner = {
  key: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  photo: { src: string; alt: string } | null;
};

export const PROMO_BANNERS: readonly PromoBanner[] = [
  {
    key: "build-your-setup",
    title: "Build your setup",
    text: "Mousepads for every desk setup.",
    cta: "Browse desk gear",
    href: productsHref("mousepads"),
    photo: { src: "/photos/banner-build-your-setup.jpg", alt: "" },
  },
  {
    key: "audio-for-calls",
    title: "Audio for calls",
    text: "Gaming headsets for PC and consoles.",
    cta: "See audio",
    href: productsHref("headsets"),
    photo: {
      src: "/photos/product-headset-black.jpg",
      alt: "Black over-ear headset with a cable, seen from above",
    },
  },
];

/** The "Low stock" banner, shown only for a published product at or below the threshold (A28). */
export const LOW_STOCK_BANNER = { title: "Low stock", cta: "View product" } as const;

/** The banner's text template (OA-11b): "<product name>: <n> left". */
export function lowStockText(name: string, stockQuantity: number): string {
  return `${name}: ${stockQuantity} left`;
}

export type WhyBuyHereItem = { title: string; text: string };

export const WHY_BUY_HERE: readonly WhyBuyHereItem[] = [
  {
    title: "Buy without an account",
    text: "Guest checkout is always available. An account is optional.",
  },
  {
    title: "Stock is checked at checkout",
    text: "The price and stock are checked again on the server before an order is placed.",
  },
  {
    title: "Keep your reference",
    text: "Each order has a reference that finds it later in My orders or by lookup.",
  },
  { title: "Delivery and returns", text: EXAMPLE_DELIVERY_TEXT },
];

/** How many best sellers the home page lists (names only). */
export const BEST_SELLERS_LIMIT = 3;

/** The window of the best sellers list, in days (paid orders, storefront v2 A-4). */
export const BEST_SELLERS_PRESET = "30d" as const;
