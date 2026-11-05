# Storefront layout and e2e (2026-11-05)

Six lessons from the phone header, the search, the product tabs and the E2E runs of PR #190.

1. **A sticky header covers what e2e scrolls to.** The e2e helper scrolls an element into view and clicks
   it; the sticky storefront header then covered the target (CI only, the local run passed). Fix:
   `scroll-padding-top` on the root when the storefront header is present.
2. **An absolutely placed button did not take clicks in the browser.** The search button was moved with
   `absolute`; a real click did nothing, while `requestSubmit` worked. Keep the button in the normal flow
   with a negative margin.
3. **A Base UI sheet or tab reacts only after hydration and its slide-in.** A click made too early does
   nothing, and a link still off screen cannot be clicked. The e2e helpers retry the click until the
   panel is open and has arrived (`left >= 0`).
4. **A route-aware client hook in a layout needs its own Suspense boundary.** `usePathname` in the static
   shell failed the prerender with CLIENT_HOOK_DYNAMIC; wrapping only the component fixed it.
5. **A migration cannot import a shared TS module.** The migrator loads the file with the native ESM
   loader, which needs extensions; copy the data into the migration, as the earlier demo migrations do.
6. **Keep the AI copy and the storefront copy apart.** Drafting, the glossary and the evals are built on
   the short description; the long text lives in its own column (`long_description`).
