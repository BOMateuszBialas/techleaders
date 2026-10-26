# 2026-10-17 — An e2e wait satisfied by the page you are leaving

`purchase.e2e.test.ts` clicked a product link on the listing, then waited for "Add to cart", which the listing's own quick-add buttons already show; the next step ran mid-navigation and found only the header's "Search" button. It failed on `main` and on every CI run of #50, never locally (faster machine). After a navigating click, wait for the new URL (`waitForUrl`) and for text only the target page has.
