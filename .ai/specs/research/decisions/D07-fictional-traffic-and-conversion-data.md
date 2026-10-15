# D07 — Add fictional traffic and conversion data, with a bounded Copilot tool, to the MVP

- Date, owner: 2026-10-14, product owner (project author), in the `om-discover` session.
- Context and the options weighed: the practitioner's described gap is missing sessions, traffic and conversion data, and the MVP's approved Copilot tools (spec §6) cover only orders, line items and stock. Asked whether "fictional data" (D06) meant only the usual seed data (products, orders, stock) or also fictional traffic and conversion data, the owner answered: both.
- Decision and why: the demo seeds fictional traffic and conversion data (sessions, traffic, conversion) besides the usual store data. Copilot gets a bounded, approved tool to read it, so the primary question can draw on it. This widens D01's scope.
- Consequences, and what would make us revisit it:
  - The MVP spec (`.ai/specs/2026-10-13-commerceos-mvp.md`, §3 and §6) does not list this data or tool yet and needs updating before implementation planning.
  - P0 or P1 placement is undecided (Q05).
  - The data is fictional: it must be labelled as demo data (R07), and nothing may suggest it comes from real tracking.
  - A real tracking source (for example server-side) stays Later (Q04).
  - Under D06, Copilot still names any data it does not have.
- Resolved on 2026-10-15: D08 places this in P0 (minimal) and fixes its content; spec §3, §6, §7, §11 and §14 are updated.
- Status: active
