# Run: mobile layout pass at 390 px (polish lane)

- Date: 2026-10-19
- Branch / worktree: `fix/mobile-layout-pass`, `.ai/tmp/om-auto-create-pr/mobile-pass` (from `origin/main`)
- Mode: autonomous

## Goal

Walk the storefront, the admin and the Copilot at 390 px in a real browser (agent-browser) and fix real layout problems with minimal Tailwind changes.

## Steps

1. Ran a production build with `next start` on port 3100, against a separate local database (`commerceos_mobile`). It was migrated, seeded, and given a throwaway owner, so the developer's database was not touched.
2. Walked every page at 390 × 844 and measured page `scrollWidth`, elements outside the viewport, and the overflow of table containers. Pages walked:
   - home, listing, search, product, cart, checkout, demo payment, order confirmation, order lookup;
   - admin sign-in, dashboard (7d/30d), orders, order detail, products, new product, product edit, categories;
   - Copilot with all seven questions.
3. Findings and fixes:
   - **Storefront header** (every storefront page): the page was 485 px wide and the cart link sat off-screen. The header now wraps: the logo is on the first row, and search, menu and cart get a full-width row below `sm`. The search input flexes. From `sm` the header stays one fixed-height row (`sm:h-14 sm:flex-nowrap`). A first version wrapped at every width, and the full e2e run caught it: on desktop with many categories, the streamed menu links wrapped the header and moved the featured tabs while they were being clicked (`home.e2e`, "narrows the slider").
   - **Copilot evidence tables**: shadcn's `whitespace-nowrap` hid the Value, Period and Source columns inside the table's scroll container (up to 123 px hidden). The metric, period and source cells now wrap (`wrap-anywhere` for tool ids), so values stay in view.
   - **Dashboard "Top products"**: the Revenue column was clipped. The product name now wraps.
4. E2E:
   - New `storefront-mobile.e2e.test.ts` checks the page width and that the cart link is in view on six storefront pages.
   - `admin-mobile.e2e.test.ts` gains a Copilot check: every evidence table in the views answer has no hidden overflow.
5. Lesson added to `.ai/lessons.md`.

## Not changed (acceptable)

Admin orders list and order detail item tables (5 columns) still scroll sideways inside their own container on a phone. Every value is reachable by swiping, and the page itself does not scroll. Hiding columns would drop information, so they are left as they are. The "What should I focus on…" summary table keeps 10 px of in-container overflow from the nowrap "Fictional demo data" badge.

## Outcome

See the PR for gate results and screenshots.
