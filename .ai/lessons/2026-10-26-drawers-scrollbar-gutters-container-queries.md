# 2026-10-26 — Drawers, scrollbar gutters and container queries in the prototype

A Base UI modal drawer (`fixed inset-y-0 right-0`) sits at the body edge, not the window edge, when the page reserves a scrollbar gutter (`scrollbar-gutter: stable`, 15 px in headless Chrome); measure the drawer against `document.body` in a walk, not against `innerWidth`. Shopper `@md:` / `@3xl:` / `@5xl:` rules need `@container` on the frame root, not on the elements that carry them; without it they never match and the layouts stay one column.
