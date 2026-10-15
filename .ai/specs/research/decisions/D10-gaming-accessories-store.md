# D10 — The demo store sells gaming accessories

- Date, owner: 2026-10-15, product owner (project author).
- Context and the options weighed: the demo catalog seeded since the foundation was specialty coffee and brewing gear (two categories, five products). The product owner wants the demo store to read as a gaming-accessories shop. Options: (a) keep coffee; (b) switch the demo catalog to gaming accessories before more features (home page, cart, Copilot data) are built on top of it.
- Decision and why: (b). The demo store sells gaming accessories in five categories: mice, keyboards, headsets, controllers and mousepads. Switching now, while only the storefront reads the catalog, is cheaper than after orders and Copilot demo data refer to coffee products.
- Consequences, and what would make us revisit it:
  - The seed (`packages/database/src/seeders/DatabaseSeeder.ts`) holds about 15 gaming products with PLN prices, `[DEMO]` descriptions, `DEMO-` SKUs and local SVG images; the coffee rows and images are removed from the seed definition. Existing local databases keep the old coffee rows until they are reset by hand (the seeder upserts by slug and never deletes).
  - Storefront copy (hero, footer, intro) uses a gaming tone; UI copy stays English.
  - Every test, fixture and e2e assertion uses the new catalog.
  - The Copilot and fictional traffic demo data (D08) must be generated for the new catalog when it is built.
  - Revisit only if the product owner picks another demo vertical; the platform itself stays vertical-neutral.
- Status: active
