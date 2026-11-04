import type { WhyBuyHereIcon } from "./storefront-content";

/**
 * The storefront's line icons (24 px grid, stroked, `currentColor`). Decorative only: every icon
 * sits next to text that says the same thing, so each one is `aria-hidden`.
 */
const PATHS: Record<WhyBuyHereIcon, readonly string[]> = {
  account: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M4.5 21a7.5 7.5 0 0 1 15 0"],
  shield: ["M12 3 19 6v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3Z", "m9 12 2 2 4-4"],
  ticket: ["M3 8V6h18v2a2 2 0 0 0 0 4v2H3v-2a2 2 0 0 0 0-4Z", "M15 6v12"],
  truck: [
    "M2.5 6.5h11v10h-11Z",
    "M13.5 10h4l3 3.5v3h-7",
    "M6 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    "M17.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  ],
};

export function StoreIcon({ name }: { name: WhyBuyHereIcon }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
