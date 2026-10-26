# 2026-10-19 — "No page scroll" is not "readable on a phone"; check table containers and the storefront too

- The #56 mobile test checked only `scrollWidth` of admin pages. Meanwhile the storefront header pushed the cart link off-screen (page 485 px wide at 390). Copilot evidence tables hid the Value column inside their scroll container, because shadcn `TableCell` defaults to `whitespace-nowrap`.
- At 390 px, also measure `[data-slot=table-container]` (`scrollWidth - clientWidth`) and the position of key controls.
- Let text cells wrap (`whitespace-normal`, plus `wrap-anywhere` for long ids). Keep numbers `nowrap`.
