# D08 — Fictional traffic and conversion data is P0 (minimal), with sources, funnel and per-product views

- Date, owner: 2026-10-15, product owner (project author). Answers Q05.
- Context and the options weighed: D07 added fictional traffic and conversion data plus one bounded Copilot tool, but left its priority and content open. Placement options: (a) P0 in a minimal form, about one day of work in the Copilot week; (b) P1, so Copilot in P0 reads only orders, catalog and stock. Content options: (1) sessions by source, the store funnel and per-product views; (2) sessions by source and the store funnel; (3) daily sessions and conversion only.
- Decision and why: (a) and (1). Without traffic and conversion data, the demo does not touch the gap the practitioner describes, so the P0 Copilot would show the mechanics on the wrong data. Per-product views let Copilot point at specific products with many views and few purchases, which turns a generic observation into an actionable one.
- What the data holds (all fictional and seeded, never recorded from real visits):
  - Daily sessions by traffic source (`direct`, `organic`, `social`, `email`, `paid`).
  - Daily store funnel counts: sessions → product views → add-to-cart → checkout started. The last step, orders, comes from the real `orders` table, so conversion is real paid orders divided by fictional sessions.
  - Daily views and add-to-cart counts per product.
  - The seed generates the data for a rolling window that ends on the seed date, so "this week" always has data.
- One approved tool reads it: `getTrafficSummary(dateRange, productLimit)`. See spec §6.
- Consequences, and what would make us revisit it:
  - Spec §3, §6, §7, §11 and §14 are updated together with this record.
  - Orders hold no traffic source, so conversion is reported for the whole store only, never by source.
  - Storefront visits do not write to this data; there is no event tracking (N05). A real tracking source stays Later (Q04).
  - Every traffic figure is labelled as fictional demo data in the tool output and the UI (R07).
  - If the Copilot week runs short, the per-product views go first, then the funnel, keeping sessions by source (spec §11 scope adjustment rule).
- Status: active
