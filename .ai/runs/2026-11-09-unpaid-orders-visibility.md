# Run: unpaid orders visibility (2026-11-09)

Branch `feat/unpaid-orders-visibility`, based on `main`. Spec section: `.ai/specs/implemented/2026-11-09-orders-audit-trail.md` ("Unpaid orders: visibility").

## Changed

- Core: `ListAdminOrdersUseCase` takes `view` (`unpaid` or any other value = all); `UnpaidOrdersSummaryUseCase` and `UNPAID_STALE_AFTER_HOURS = 24` in `services/orders/unpaid-orders-summary.use-case.ts`; `OrderAdminPort` gains `summarizeUnpaid` and the list filter and sort options.
- Database: `DatabaseOrderAdminRepository.listOrders` (status filter, oldest first) and `summarizeUnpaid` (one aggregate query).
- DI: `unpaidOrdersSummaryUseCase` in `packages/app/src/server/container.ts`.
- App: `/admin/orders` view tabs and view-aware links; `/admin` unpaid card above the metrics; loaders in `load-orders.ts` and `load-dashboard.ts`.

## Validation

- `npm run typecheck`: pass.
- `npm run test:coverage`: pass (218 files, 2363 tests).
- Integration `database-order-admin-repository.int.test.ts`: 12 passed.
- `npm run build`: pass. E2E `admin-orders.e2e.test.ts`: 5 passed (new flow included).
- ESLint on changed files, Prettier check, `check:tokens`, `check:agents`: pass.

## Decisions

- The page-link labels in the unpaid view are "Earlier" and "Later", because "Newer" and "Older" point the wrong way in the oldest-first list.
- The lessons index is at its 100-line budget, so no lesson was added.
