# 2026-10-15 — Repeated link names break `clickRole` in e2e; the test DB sorts with a byte collation

Once the storefront header and footer listed every category, a category name such as "Mice" appeared in three navigations, so e2e tests click a specific link by CSS selector (`BrowserSession.click('nav[aria-label="Categories"] a[href=…]')`). Also, `orderBy: { name: "asc" }` in the Testcontainers PostgreSQL put "[E2E] Draft Vortex mouse" before "[E2E] Draft keyboard" (uppercase first), so assert sort order on names whose case does not differ, or document the collation in the test.
