# Storefront phone category menu (P4)

- Status: ready for implementation (owner choice P4: "Rozwijany przycisk Kategorie"). Branch `feat/storefront-phone-menu`.
- Risk: low. It changes only the storefront header menu markup and one label. No server code, prices, stock or routes change.
- Authority: `.ai/specs/2026-10-26-storefront-design-implementation.md` (G13 menu, the phone-menu open item P4), `.ai/design/POSTEP.md` (open P4), `packages/app/AGENTS.md`.

## Goal

Below 768 px the storefront header shows one button, "Categories", that opens the category list in place. Phone shoppers reach every category in one tap, with 44 px touch targets. From 768 px up the inline header menu stays as it is.

## Decision

- **P4, owner choice:** a Disclosure button "Categories" below 768 px (`md` breakpoint) that opens the list of links. It uses the existing `Disclosure` primitive (`packages/app/src/components/ui/disclosure.tsx`, native `<details>`, no client JavaScript).
- The trigger is a button-shaped `DisclosureTrigger` with `buttonVariants({ variant: "outline" })`, so it is 44 px tall in the storefront density (`--control-h-md`, and `--control-h-sm` on phones).
- The megamenu is out of scope.
- Note: the storefront spec, Non-goals, still says "A new megamenu or a phone menu using Disclosure ... Not part of the owner's answers." The owner's P4 choice supersedes that line for the phone menu. The spec line should be updated by the coordinator.

## Files

- `packages/app/src/components/storefront/header-menu.tsx`: the mobile `<details>` becomes `Disclosure` / `DisclosureTrigger` / `DisclosureContent`; the trigger text comes from copy; the icon import goes.
- `packages/app/src/components/storefront/storefront-copy.ts`: `HEADER_MENU_TRIGGER_LABEL = "Categories"`.
- `packages/app/src/components/storefront/storefront-shell.test.ts`: the `HeaderMenu` tests follow the new markup.
- `packages/app/e2e/storefront-phone-menu.e2e.test.ts` (new): the phone menu at 390 px.

## Acceptance criteria

- AC1: The narrow menu is a `Disclosure` whose trigger reads "Categories" and has `data-slot="disclosure-trigger"`. Test: `storefront-shell.test.ts` "HeaderMenu".
- AC2: Each category link keeps its href (`/products?category=<slug>`) and its name; "Shop all" keeps its href. Test: `storefront-shell.test.ts` "HeaderMenu" (counts of hrefs).
- AC3: The inline nav (`md:block`) and the disclosure (`md:hidden`) both exist in the markup, and only one is shown per width (CSS). Test: unit markup; e2e at 390 px and 768 px.
- AC4: At 390 px, the Categories button is at least 44 px tall, opens the list on click, and a category link opens its product list page. Test: e2e `storefront-phone-menu.e2e.test.ts`.
- AC5: No page scrolls horizontally at 320, 390, 768 or 1440 px with the menu open or closed. Test: e2e at 390 px (`scrollWidth === innerWidth`) and the existing `storefront-mobile.e2e.test.ts` at 390 and 320 px.
- AC6: At 768 px and 1440 px, the inline menu shows and the Categories button is hidden. Test: e2e at 768 px and 1440 px (the trigger's `getBoundingClientRect().height` is 0 or it is not visible).
- AC7: No business logic in the component; no `any`, no unsafe casts, no color literals (`check:tokens`).

## Non-goals

- The megamenu, search changes, a new route, a category limit, a new client component or JavaScript.
- Changes to server code, prices, stock, the cart drawer or the footer.

## Checks

- Viewports: 320 px (no overflow; the trigger fits), 390 px (AC4, AC5), 768 px (inline menu, AC6), 1440 px (inline menu, AC6). The e2e file covers 390 px and 768 px; 320 px is covered by the existing storefront-mobile e2e for the header.
- Unit: `npx vitest run packages/app/src/components/storefront`.
- E2E: written, not run in this session (needs Docker and a build).
