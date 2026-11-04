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
    text: "Mousepads for every desk setup, from wide cloth pads for fast mouse movements to glass pads that stay smooth and easy to clean. Pick the size that fits your desk and the surface your mouse likes best.",
    cta: "Browse desk gear",
    href: productsHref("mousepads"),
    photo: { src: "/photos/banner-build-your-setup.jpg", alt: "" },
  },
  {
    key: "audio-for-calls",
    title: "Audio for calls",
    text: "Gaming headsets for PC and consoles, with clear microphones for calls and team chat. Closed-back designs for focus, lightweight models for long sessions, and wired or wireless options to match your setup.",
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

/** The icon of a "Why buy here" fact; the icon set lives in `storefront-icons.tsx`. */
export type WhyBuyHereIcon = "account" | "shield" | "ticket" | "truck";

export type WhyBuyHereItem = { title: string; text: string; icon: WhyBuyHereIcon };

export const WHY_BUY_HERE: readonly WhyBuyHereItem[] = [
  {
    title: "Buy without an account",
    text: "Guest checkout is always available. An account is optional.",
    icon: "account",
  },
  {
    title: "Stock is checked at checkout",
    text: "The price and stock are checked again on the server before an order is placed.",
    icon: "shield",
  },
  {
    title: "Keep your reference",
    text: "Each order has a reference that finds it later in My orders or by lookup.",
    icon: "ticket",
  },
  { title: "Delivery and returns", text: EXAMPLE_DELIVERY_TEXT, icon: "truck" },
];

/** How many best sellers the home page lists (names only). */
export const BEST_SELLERS_LIMIT = 4;

/** The window of the best sellers list, in days (paid orders, storefront v2 A-4). */
export const BEST_SELLERS_PRESET = "30d" as const;

/**
 * One "From the store" feature: a photo, a longer text (two or three sentences) and a button to a
 * collection (2026-11-04).
 */
export type StoreFeature = {
  key: string;
  title: string;
  text: string;
  label: string;
  href: string;
  photo: string;
  alt: string;
};

/** The three features of the home page, shown left and right in turn (photo first, then text). */
export const STORE_FEATURES: readonly StoreFeature[] = [
  {
    key: "setup",
    title: "Build your setup",
    text: "Mousepads for every desk setup.",
    label: "Browse desk gear",
    href: "/products?category=mousepads",
    photo: "/photos/banner-build-your-setup.jpg",
    alt: "A gaming mouse on a mousepad on a dark desk, lit in blue",
  },
  {
    key: "audio",
    title: "Audio for calls",
    text: "Gaming headsets for PC and consoles.",
    label: "See audio",
    href: "/products?category=headsets",
    photo: "/photos/product-headset-black.jpg",
    alt: "Black over-ear headset with a cable, seen from above",
  },
  {
    key: "keyboards",
    title: "Keyboards",
    text: "Full-size and compact keyboards with RGB lighting and mechanical switches. Tenkeyless layouts leave room for the mouse, and 60% boards keep the desk clear for those who want the smallest footprint.",
    label: "See keyboards",
    href: "/products?category=keyboards",
    photo: "/photos/product-keyboard-rgb.jpg",
    alt: "A gaming keyboard with lit keys",
  },
];

/** The full-width gaming video on the home page (owner request, 2026-11-04). Put the file in public/videos/. */
export const HOME_VIDEO = {
  src: "/videos/gaming-setup.mp4",
  poster: "/photos/hero-desk-curved-monitor.jpg",
  label: "A gaming desk setup, moving slowly",
} as const;
