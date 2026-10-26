# packages/database (`@commerceos/database`): agent rules

Read the root `AGENTS.md` first (overview, Validation, agent rules). This file holds the rules for MikroORM, PostgreSQL, migrations, seeders and the stock and order adapters. The stock and money rules below are protected: do not weaken them.

## Role and boundaries

- Responsibility: MikroORM config, entities (`defineEntity`), migrations, seeders, repository and health adapters implementing `core` ports.
- May depend on `core` only. ESLint enforces it.
- Layout: `defineEntity` in `src/entities/<concept>/<name>.entity.ts`; register every entity in `src/entities/index.ts`.

## Entities and migrations

- Entities use `defineEntity` + `p.*` builders (no decorators) and must be added to `entities` in `packages/database/src/entities/index.ts`.
- **Migrations are the source of truth.** Never use `schema.update()` outside tests. After changing an entity: `npm run db:migration:create`, review the generated SQL, and commit it. The integration test fails on any drift between entities and migrations.
- Every schema change ships with a migration plus an integration test.
- `allowGlobalContext: false`: always work on a forked EntityManager (request scope or explicit `orm.em.fork()`).
- Add unique constraints and indexes for slugs, SKUs, order references and frequently queried foreign keys. Use DB `check` constraints for enums and invariants.
- Money is stored as integer minor units (`priceMinor`, `totalMinor`) in `int` columns with `check (>= 0)`. Use the `Money` helpers in `core`; never use floats.
- Do not return ORM entities from API routes. Map them to explicit DTOs.

## Orders and stock (protected)

- Order creation and stock changes run in one transaction (`em.transactional`) with an atomic conditional stock decrement (no overselling). Order items store name and price snapshots.
- `products.stock_quantity` has exactly three writers after product creation (which sets only the initial value, not recorded); product edits never touch it, and the seeder and the CSV import (`DatabaseProductImportRepository.createMany`, insert-only: a row matching an existing slug or SKU is skipped, never updated) set it only for the products they create. Never add another:
  1. a **manual change**, only through `StockRepositoryPort.setStock` (`packages/database/src/adapters/database-stock-repository.ts`): a conditional update on the expected quantity plus a `stock_adjustments` row in one transaction (the only recorded writer);
  2. the **checkout decrement** in `DatabaseOrderRepository.placeOrder` (below);
  3. the **cancel restock** in `DatabaseOrderAdminRepository.changeStatus` (`packages/database/src/adapters/database-order-admin-repository.ts`): `pending_payment → cancelled` as a conditional `update orders … where id = :id and status = :from`, then `stock_quantity = stock_quantity + :q` per line in product-id order, in one transaction (not recorded).
- Checkout decrements stock only in `DatabaseOrderRepository.placeOrder` (`packages/database/src/adapters/database-order-repository.ts`): one `em.transactional`, lines locked in product-id order, each an atomic `update … where status = 'published' and stock_quantity >= :q returning …` that also yields the price snapshot. These decrements are not recorded in `stock_adjustments` (manual changes only).
- Order status changes go only through the transition table in `packages/core/src/domain/orders/order-status.ts` (orders spec A4) and the conditional update above. `paid` is set only by the payment flow (`markPaid`), never by the admin (A3); `refunded` is a recorded status only (no money moves, no restock).

## Seeders

- Seeders are repeatable and never overwrite owner data (orders spec A18): the demo catalog is insert-only by slug (`on conflict do nothing`; a product that cannot be created is skipped with a warning), and the generated demo data (`DEMO-` orders, both traffic tables) is deleted and regenerated in one transaction.
- Demo data is visibly marked (`[DEMO]` text and customers, `DEMO-` SKUs and order references; `isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` in core are the one discriminator).
- Seeded orders never change stock, and the seed creates no `pending_payment` order (A15).

## Recommendation storage

- `DatabaseCopilotRecommendationRepository` performs the conditional update for recommendation actions. It writes `copilot_recommendations` only, never store data.
