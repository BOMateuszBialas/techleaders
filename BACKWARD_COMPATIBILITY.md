# Backward Compatibility

The contract surfaces this project protects, and how changes to them must be handled. Review skills check changes against this file, and implementation skills warn when a change breaks it.

> **Current state (2026-10-15):** foundation, admin sign-in, storefront browsing, the shop-front home page, admin catalog management (categories and products) and the cart (2026-10-16). There are a few API routes (listed below), public storefront URLs, internal workspace packages (not published) and the catalog and admin auth schema. There are no external consumers yet. Update this file whenever a new surface appears.

## Protected surfaces

### 1. Public URLs (App Router routes)

- **Where:** `packages/app/src/app/**/page.tsx`. Current storefront URLs (added 2026-10-15, storefront catalog spec Phase 1):
  - `/` (home), with the optional query parameter `category` (added 2026-10-15, Phase 1b: a category slug selecting the featured-products tab; same slug rules as on `/products`; unknown or malformed values silently show all featured products);
  - `/products`, with the optional query parameter `category` (a category slug; unknown or malformed values show "This category does not exist");
  - `/products/<slug>` (`<slug>` is the product slug; drafts and unknown slugs show "Product not found").
  - `/cart` (added 2026-10-16, cart spec Phase 1): the shopper's cart.
- **Cart cookie** (added 2026-10-16, cart spec A2): `commerceos_cart`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 30 days, `Secure` when `APP_URL` is https. Value: base64url JSON `{ v: 1, lines: [{ p: <product uuid>, q: <1–99> }] }` (at most 20 lines, no prices). A cart a shopper already holds must keep working: a new format bumps `v`, and an unknown `v` (or anything malformed) reads as an empty cart, never as an error.
- Protected admin URLs (sign-in required; added 2026-10-15, admin catalog spec Phase 1a): `/admin/categories` (optional `notice=deleted`), `/admin/categories/new`, `/admin/categories/<id>` (`<id>` is the category uuid; optional `notice=created`; a malformed or unknown id shows the admin "Not found" page). The `notice` values are fixed codes; anything else is ignored.
- Protected admin URLs (added 2026-10-16, admin catalog spec Phase 1b): `/admin/products`, `/admin/products/new`, `/admin/products/<id>` (`<id>` is the product uuid; optional `notice=created`; a malformed or unknown id shows the admin "Not found" page). The `notice` values are fixed codes; anything else is ignored.
- Admin server actions (`createCategory`, `updateCategory`, `deleteCategory` in `packages/app/src/server/catalog/category.action.ts`; `createProduct`, `updateProduct`, `setProductStatus` in `packages/app/src/server/catalog/product.action.ts`) are POST endpoints used only by this app's forms. So are the public shopper actions `addToCart`, `updateCartLine` and `removeCartLine` (`packages/app/src/server/cart/cart.action.ts`, added 2026-10-16), which need no session and change only the caller's cart cookie. Their `FormData` field names and the `ActionState` shape are internal and may change with the forms.
- **Breaking:** removing or renaming a public route, or changing the meaning of its query parameters.
- **Required path:** add a redirect in `next.config.ts` (`redirects()`) and note the change in the PR description.

### 2. HTTP API (Route Handlers)

- **Where:** `packages/app/src/app/**/route.ts`. Current endpoints:
  - `GET /api/health` (response: `{ status: "ok" | "degraded", components: [{ name, status, latencyMs }] }`, 200/503).
  - `GET /api/admin/me` (`ApiResult<{ id, email, role }>`, 200/401).
  - `/api/auth/*`: Better Auth's own endpoints (`POST /sign-in/email`, `POST /sign-out`, `GET /get-session`). Their shapes belong to the library pinned at `~1.7.10`; upgrades are reviewed against the admin e2e suite.
- **Breaking:** removing an endpoint or method; removing or renaming a response field; changing a field's type; adding a new required request field; changing status codes or the error format.
- **Required path:** make additive changes only, or ship a new versioned endpoint. Mark the old one deprecated and keep it for at least one release, and write a migration note in the PR.

### 3. Monorepo packages (`packages/*`)

- **Where:** what each package exports from its entry point (`package.json` `exports` / `main`).
- **Breaking:** removing or renaming an export, or changing a function signature or type in an incompatible way.
- **Required path:** deprecate first (`@deprecated` JSDoc), update every consumer in the monorepo in the same PR, and bump the major version if the package is published.

### 4. Configuration and environment variables

- **Where:** `packages/app/next.config.ts`, env variables validated in `packages/app/src/server/env.ts` (documented in `.env.example`), `.ai/agentic.config.json`.
- **Added 2026-10-15:**
  - `BETTER_AUTH_SECRET` (required);
  - `AUTH_TRUSTED_IP_HEADER` (optional);
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (read only by `npm run admin:create`);
  - `APP_URL` became required when `NODE_ENV=production`.
- **Breaking:** renaming or removing an environment variable, or changing a config key's format.
- **Required path:** support the old name as a fallback for one release and document the change in the PR and README.

### 5. Data schema (PostgreSQL via MikroORM migrations)

- **Where:** `packages/database/src/migrations/`, `packages/database/src/entities/`.
- **Breaking:** dropping or renaming a column or table, narrowing a type, adding a NOT NULL column without a default, or editing an already-applied migration.
- **Required path:** migrations only move forward and committed migrations are never edited. Destructive changes are rolled out in steps (add the new column → backfill → switch code → drop the old one in a later migration).
- `stock_adjustments` (added 2026-10-16, admin catalog spec Phase 2): the manual stock history (`product_id`, `previous_quantity`, `new_quantity`, `created_at`; checks `>= 0` and `new_quantity <> previous_quantity`; `on delete cascade` from `products`). A later `reason` or `source` column (for example checkout decrements) is added with a default, never as a required column.

## General rules

- Prefer additive changes over modifying or removing existing ones.
- Any intentional break needs the `risk-high` label, a migration note in the PR description, and the user's approval.
