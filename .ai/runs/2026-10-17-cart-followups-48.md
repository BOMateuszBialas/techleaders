# Run: cart follow-ups (#48)

- Date: 2026-10-17
- Agent: Claude Code (lane B, autonomous; the user is away and answers no questions)
- Issue: #48 (follow-ups from the review of #45)
- Branch: `fix/issue-48-cart-followups`

## Goal

Close the three cart follow-ups of #48 with the smallest safe change.

## Triage (per item)

1. **Stale cookie after auto-correction.** Already addressed by #49 (E02-S02/S03): the cart page shows the changes in a "Your cart changed" panel with a one-click `acceptCartChanges` server action that stores the corrected cart, and the checkout stays closed until then (it compares the page with the cookie). The notice repeating until the shopper accepts it, and the header count (cookie only) including the removed line until then, are the documented trade-off of "a Server Component cannot set cookies" (`.ai/lessons.md`, 2026-10-16). Auto-syncing on render would need a client effect that posts on page load, a write on a read path. No code change; stated on the issue.
2. **Repeated warning logs.** Fixed: the header count (rendered on every storefront page) reads the cookie with `readCartLines({ logInvalid: false })`. The cart and checkout pages and the cart actions still log, and the next cart action replaces the cookie.
3. **Forged product id message.** Fixed: `parseCartLineInput` (core) refuses a malformed `productId` with the form-level `ValidationError("This product is not available.")` and no field errors, before the other fields are parsed. The add, update and remove use cases use it.

## Decisions

- Issue labelled `feature`, but all three items are corrective follow-ups of shipped behaviour; the bug route (`fix/` branch, no spec) was taken instead of writing a spec for three small changes.
- Item 1 closed as already addressed rather than adding an auto-sync client component.

## Outcome

- Regression tests: forged id on add (`"x"`, `""`), update and remove → form-level message, no field errors, no catalog query; silent header read; logged read still warns once.
- Full gate: see the PR.
