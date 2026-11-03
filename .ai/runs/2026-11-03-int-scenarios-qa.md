# Run log: integration QA scenarios (2026-11-03)

Branch `qa/int-scenarios-orders-stock` from `main` (b94087e).

## Part 1: three integration scenarios

- Added: illegal status move refused through `ChangeOrderStatusUseCase`; stale manual stock edit after a checkout refused through `AdjustStockUseCase`; foreign order id gets the same not-found as an unknown id through `GetCustomerOrderUseCase`.
- Skipped as already covered: concurrent checkout oversell (`database-order-repository.int.test.ts`), Copilot fallback (`ask-copilot.int.test.ts`).
- Recorded in `.ai/qa/scenarios.md`.

## Commands and results

- `npm ci`: exit 0 (fresh worktree had no `node_modules`).
- `npx prettier --write` on the two changed test files: reformatted one file.
- `npx eslint` on the two changed test files: exit 0.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run format:check`: exit 0.
- `npm run check:agents`: exit 0.
- `npm run test:coverage`: exit 0, 200 files, 2235 tests passed.
- `npm run test:integration`: NOT RUN. Docker Desktop is not running (`dockerDesktopLinuxEngine` pipe missing). The new tests are unverified against PostgreSQL.

## Part 2: bug search

- Read and checked: order status table, order access, order references, money and price input parsing, metric periods and change, cart pricing, stock adjustment, dashboard range parsing, demo discriminators, store-metric SQL. No defect confirmed. Part 2 stopped without a fix.
