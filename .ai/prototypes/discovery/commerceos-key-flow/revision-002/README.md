# Discovery prototype: CommerceOS key flow (revision 002)

- Slug: `commerceos-key-flow`. Revision date: 2026-11-06. Previous revision: `../revision-001/` (grey, neutral, both flows in one file).
- Scope of this revision: the two key screens in three variants each, built on the design-system tokens from `packages/app/src/app/globals.css` (copied into `tokens.css`) and the look of the components in `.ai/prototypes/ds/`.
  - Store home (s01): variants A, B, C.
  - Commerce Copilot answer (s18): variants A, B, C, with the empty, error and LLM-fallback states the map names.
- Map and decisions: `.ai/design/mapa-ekranow.md`. Brief: `.ai/specs/product-brief.md`. Plan: `KURS TECHLEADERS/PLAN-TYDZIEN-2.md`, Faza 4.
- Status: prototype for owner review. **No variant is chosen here. The owner decides.**

## How to open it

- Open `index.html` in a browser, or serve the folder with any static server. No build, no network, no storage. Fonts are system fonts.
- The review bar at the top switches screen (Storefront home, Copilot answer), variant (A, B, C), state (drop-down) and dark theme. Reset returns to the start.
- Links that point to screens outside this revision (catalog, product, cart, dashboard, orders) do nothing except show a note in the review bar. That is deliberate.
- Routes: `#/home/<a|b|c>/<default|loading|empty|error>` and `#/copilot/<a|b|c>/<answer-ai|answer-not-configured|answer-timed-out|answer-daily-limit|answer-failed-checks|empty-store|error-500>`.

## What differs between the variants

Each pair differs in a design decision (where the entry point is, what comes first, how many decisions are on screen), not in colour.

### Store home (s01)

| | A: hero-led | B: catalog-first | C: need-led |
|---|---|---|---|
| Entry point | One hero message and its "Shop all" button | Category chips and the product grid; no hero | Four "what are you setting up" tiles |
| Density | Spacious (hero, featured row, banners, categories, why-buy) | Dense (3-column cards with stock on every card, category list, best sellers) | Medium (tiles, then a list of ready-to-order rows) |
| Stock signal | On featured cards | On every card | On list rows |
| Brand voice | Strongest; relies on the hero photo and copy | Weakest; functional | Medium; relies on the use-case headings |

Trade-off: A gives the most room for the story and promotions, but pushes products below the fold on a phone. B gets the shopper to a product fastest and shows stock everywhere, but it looks like a catalogue and leaves no room for copy. C speaks to what the shopper wants to do, but its headings are copy hypotheses that nobody has tested, and they add one step before a product.

### Copilot answer (s18)

| | A: cards with evidence | B: table first | C: one decision at a time |
|---|---|---|---|
| Layout | Three stacked cards; each has observation, evidence table, limit and actions | Summary table (priority, key figure, status) first; each recommendation's evidence in a disclosure below | List of three on the left, one recommendation in full on the right, previous and next |
| Comparison | Reads top to bottom; comparison needs scrolling | Best for comparing three at a glance | Only one recommendation on screen |
| Evidence and limits | Always visible | Visible (disclosures open by default) | Visible for the selected one only |
| Decision | Actions on each card | Actions in each disclosure | Actions on the selected one |

Trade-off: A is the most complete for reading, but the most scrolling. B is quickest to scan, but the key figure in the table can be read as a verdict, which the R05 "no causal claims" rule should prevent. C focuses attention and suits one decision at a time, but it hides the other two recommendations until the owner moves on.

All three keep the same content and the same states (AS-06 in revision-001 applies: a difference in one variant is not evidence about the others).

## States covered

- Store home: default, loading (skeleton, Q6), empty store ("No categories yet."), error ("The catalog is temporarily unavailable." with "Try again").
- Copilot: answer with AI source; LLM fallback with each of the four source lines from `mapa-ekranow.md` (AI not configured, timed out, daily limit, failed our checks), all showing rule-based recommendations (R06); empty store ("Not enough data yet: no paid orders and no traffic in this period."); error ("Copilot is temporarily unavailable." with "Ask again", Q5).
- Copilot actions: Save, Mark completed, Dismiss follow AS-11 (new to saved or dismissed; saved to completed or dismissed). The state is kept in memory for the page session only.
- The question form does not send anything; it shows a note saying so.

## Simulated data and assumptions

- All products, prices, stock, sales and recommendations are invented (AS-03, AS-07, AS-09 in revision-001). Product names follow the gaming-accessories demo catalogue (D10).
- Delivery in 1–3 working days is marked [ASSUMPTION AS-01] on the home page.
- "Why buy here" facts come from the spec; the wording is prototype copy.
- Variant C's tile headings ("Quieter calls", "Faster, precise typing", "A clear desk", "Accurate aim") are copy hypotheses. They are not tested with anyone.
- Photos come from Pexels; licences and credits are in `photos/CREDITS.md` (copied from the design-system prototype). The Pexels licence entries still need the photographer check the credits file lists.
- The storefront carries no demo notice, following the owner's 2026-10-26 decision recorded in `.ai/design/POSTEP.md`. The admin area keeps demo marking through the fictional-data labels on the traffic figures. The review bar says the data is simulated.

## Verification

Run on 2026-11-06 in headless Chrome (the Claude in Chrome extension was not connected, so the browser provider was not used). Script: `evidence/browser-walk/run.mjs`; results: `evidence/results.json`.

- 55 scripted checks, all passing:
  - Navigation: review-bar links switch screen and variant; state drop-down changes the state; storefront link from the admin menu; error "Try again" and "Ask again" return to the default states; unknown route shows the recovery page.
  - Variants: all three Copilot variants list the three recommendations and the AI source; Save, Dismiss, Mark completed, Next and Previous update the status as AS-11 describes.
  - States: each fallback source line, empty store (with three suggested questions still visible), error alert, loading skeleton.
  - Theme: dark theme switch applies the `.dark` class.
  - Width: no page-level sideways scroll at 320, 390, 768 and 1440 px for all six default screens.
  - No console errors or exceptions.
- Screenshots (1440 px and 320 px): `evidence/*.png`. Checked by eye: `home-b-1440.png`, `copilot-c-1440.png`. The other screenshots were saved but not reviewed closely.

## Not verified

- The Claude in Chrome extension walk and the configured browser provider (`.ai/browsers/agent-browser.md`). Neither was available.
- Keyboard-only use, focus order after a re-render (the page is rebuilt on each action, so focus is not kept), screen-reader behaviour.
- Dark theme visually (only the class switch was checked, by script).
- Real phone widths (390 and 768 were checked by script for overflow, not by eye); the store has no mobile menu, the phone shows no category navigation.
- Contrast of the token pairs in this file: they are the app's tokens, but no new pairs were checked.
- Any real user. Nobody has clicked through these variants. There is no research evidence for any variant; a synthetic panel would produce hypotheses only, not evidence (SDLC Definition of Ready).

## What the owner must decide

1. Entry point for the storefront home: hero-led (A), catalog-first (B) or need-led (C). Hero-led spends the most space on brand; catalog-first gets shoppers to products quickest; need-led depends on copy that is still a hypothesis.
2. Copilot answer layout: cards with evidence (A), table first (B) or one decision at a time (C). This decides how the owner compares recommendations against reading each one in full.
3. Whether the tile headings in C should be tested before they are used anywhere (a usability walk with a real person, after the owner has chosen a direction).
4. Whether any element of one variant should move into another before a final pick (for example the stock line on every card from B, or the hero from A).
5. When a real person walks the chosen variant, record it in `.ai/design/POSTEP.md` (P5 is still open).

## Status (2026-11-06)

No variant is chosen in this prototype. The owner closed the choice because the store home and the Copilot screen are already built in the application (retrofit and storefront specs). This revision stays as the record of the options that were compared.

A real person clicked through the prototype before this status was written (owner report, 2026-11-06). No comments were recorded.
