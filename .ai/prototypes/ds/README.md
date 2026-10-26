# Design-system prototype (React + Vite), F4 step 4

- Status: prototype for owner review. Simulated data only. Outside the validation gate (no CI job, no coverage, no lint).
- Purpose: show the components from `packages/app/src/components/ui/` and the key-flow screens built from them, with the semantic tokens from `packages/app/src/app/globals.css`. Screens and states follow `.ai/design/mapa-ekranow.md` (Q1–Q8, layouts A/B/C for s01 and s18). The grey prototype `.ai/prototypes/discovery/commerceos-key-flow/revision-001/` is the content and flow reference only; nothing is copied from it.
- Plan step: `KURS TECHLEADERS/PLAN-TYDZIEN-2.md`, F4 step 4 (React + Vite allowed for this prototype by the owner).

## What is in it

- The implemented components, imported from the app's source through the `@/` alias (no copies):
  all 21 components of the Storybook catalog (Alert, Alert dialog, Badge, Button, Card, Checkbox, Dialog, Disclosure, Empty, Error state, Field, Input, Label, Native select, Navigation menu, Radio group, Skeleton, Table, Tabs, Textarea, Text link). Page `Components` (`#components`).
- The key-flow screens, built from those components (`src/app/screens/`):
  - Shopper: s01 storefront home (layouts A, B, C), s02 catalog, s03 product, s04 cart, s05 checkout, s06 demo payment, s07 confirmation, s11 My orders, s12 account order.
  - Owner: s13 sign-in, s14 dashboard (metric definitions from `packages/core/.../metric-definitions.ts`, imported through the `@core/` alias), s15 orders, s16 order detail (AlertDialog for cancel), s17 Copilot question, s18 Copilot answer (layouts A, B, C), s19 recommendation decisions.
- A review bar (prototype only, labelled): screen, state, layout (s01 and s18), width (320, 390, 768, 1440, full), light or dark theme, and a sideways-scroll readout for the simulated width.
- Hash routes (`#s05`). Unknown ids s08, s09, s10 show a "not built in this prototype" page.
- Tokens: `packages/app/src/app/globals.css` through `src/styles.css`. Dark theme is the `.dark` class on `<html>`, as in the app.

## Simulated data

All products (gaming accessories, names marked `[DEMO]`), prices, orders, customers (`klient-a@demo.test`), dates and the Copilot answers are invented (`src/app/fixtures.ts`). The traffic figures are marked "fictional demo data". Nothing calls a network, a payment or an account service. Metric definitions are the real text from the app's core package.

## Dependencies (exact versions, `package.json`; lockfile in this folder)

Chosen to match the app's locked versions where possible. Every version was published on or before 2026-10-12 (at least two weeks before 2026-10-26), checked with `npm view <pkg> time`.

| Package | Version | Published | Note |
|---|---|---|---|
| react, react-dom | 19.3.0 | 2026-09-09 | same as the app |
| @types/react, @types/react-dom | 19.3.0 | 2026-09-09 | types only |
| @base-ui/react | 1.9.0 | 2026-10-09 | same as the app |
| @tabler/icons-react | 3.49.0 | 2026-10-05 | same as the app |
| class-variance-authority | 0.7.1 | 2024-11-26 | same as the app |
| cn | 0.4.0 | 2026-09-22 | same as the app |
| shadcn | 4.21.4 | 2026-10-07 | only for `shadcn/tailwind.css`, imported by globals.css |
| tw-animate-css | 1.4.0 | 2025-09-24 | same as the app |
| tailwindcss, @tailwindcss/vite | 4.3.3 | 2026-07-16 | same as the app |
| vite | 8.3.4 | 2026-10-08 | the app's locked 8.3.5 is from 2026-10-21, under two weeks old, so not used |
| @vitejs/plugin-react | 6.1.1 | 2026-08-28 | new in this prototype |
| typescript | 5.9.3 | 2025-09-30 | new in this prototype (typecheck only) |

## How to run

From `.ai/prototypes/ds/` (Node 22.17 or newer; developed on Node 24):

```bash
npm ci                 # installs the pinned versions from package-lock.json
npm run dev            # http://localhost:5180 (strict port)
npm run typecheck      # tsc --noEmit over src/ (includes the app components it imports)
npm run build          # production build to dist/
npm run preview        # http://localhost:4173 (serves dist/)
```

The prototype does not need the root `npm install`: `vite.config.ts` resolves the app's sources directly and dedupes shared packages to this folder's `node_modules`.

## Verification (what was run, 2026-10-26)

- `npm run typecheck`: no errors.
- `npm run build`: builds (about 474 kB JS, 61 kB CSS; the CSS compiles the app's tokens through Tailwind v4).
- Headless browser walk over Chrome 155 (headless, remote debugging, scratch profile). The Claude in Chrome extension was not connected, so no interactive browser session was used. Scripts in `evidence/`:
  - `walk.mjs`: 17 screens (default state) × widths 320 and 1440 × light and dark: 68 checks. Result: no console errors, no exceptions, no page-level sideways scroll, no content wider than the simulated frame, theme switch correct, every default screen has an h1 (`evidence/walk-results.json`).
  - `states.mjs`: every state of every screen (168 checks) at 320 and 1440 px in light theme. Result: no issues.
  - `layouts.mjs`: s01 and s18, layouts A, B and C, at 320 and 1440 px. Result: no overflow, no errors.
- Screenshots reviewed by eye: `evidence/s01-320-light.png`, `evidence/s14-1440-light.png` (the sidebar layout was wrong at first and was fixed), `evidence/s18-320-light.png` is saved but was not reviewed by eye.
- Fixes made during verification: four screens had no h1 (catalog, cart, status); the Copilot suggested-question buttons overflowed at 320 px; the admin sidebar did not switch to a row at 1440 px (container query on the wrong element); a favicon 404.

## Not verified

- Dark theme visually (only through the DOM: class, overflow, errors).
- The Chrome extension walk (not connected). Keyboard and screen-reader behaviour was not tested here; the components' own a11y tests live in the app's Storybook.
- Real device widths (390 px and 768 px were not walked; the review bar offers them).
- Contrast: token pairs were checked in the app's stage 1 (`verify-css.mjs`); no new pairs were added here.
- The spec's `check:tokens` script was not run on this folder (outside the gate).

## Deviations from the app (on purpose, for a prototype)

1. Fonts: `next/font` is not available, so Archivo and Geist Mono are replaced by system fonts (`src/styles.css`). Typography will look different from the app.
2. Width control: the screen frame is narrower than the browser, so the `@md:` and `@3xl:` container queries follow the frame. The token media queries (density, `@media (width < 48rem)`) still follow the real browser width. At 1440 px in a narrow window the density can differ from the frame. Use the browser's own window size for the 320 px check.
3. Links: `next/link` is replaced by a plain anchor (`src/shims/next-link.tsx`). Routes are hash links.
4. The store header uses plain links, not the Navigation menu (the megamenu is in the gallery only; retrofit, lesson 08).
5. Screens are hand-composed here from the components. They are not the app's routes and do not call the app's use cases, so they show layout and states, not behaviour.
6. Owner area uses the sidebar frame from the token file's admin density (`data-density="admin"`).
7. Versions: vite 8.3.4 instead of the app's 8.3.5 (two-week rule).

## Open P items (for the owner)

- P1: choose layout A, B or C for s01 and s18 (`mapa-ekranow.md` §5). The prototype shows all three; it does not choose.
- P2: decide whether s08, s09 and s10 (guest lookup, customer sign-up and sign-in) are built in a later prototype revision. They are listed in the map and linked from the flow, but not built here.
- P3: the Archivo and Geist Mono font files are not in the prototype (see deviation 1).
- P4: the store header should use the Navigation menu on desktop (retrofit, lesson 08), and the phone menu should use Disclosure (B4.28). Not done here.
- P5: the owner has not yet reviewed this prototype in a real browser. The review step (a real person clicking, mapa-ekranow §8) is still open.
