# QA scenarios (integration)

Behaviours that matter for the store and are checked against a real PostgreSQL database
(`*.int.test.ts`, Testcontainers). Each scenario names its test. Unit tests cover the same rules
with fakes; these scenarios add the database, the transaction and the use case working together.

## Added 2026-11-03

### 1. A status move outside the transition table is refused and changes nothing

- **Test:** `packages/database/src/adapters/database-order-admin-repository.int.test.ts`, "refuses a status move outside the transition table: the paid order keeps its status, paid_at and stock".
- **Path:** `ChangeOrderStatusUseCase` → `DatabaseOrderAdminRepository` → PostgreSQL.
- **Why it matters:** The owner's workflow (orders spec A4) and the rule that only the payment flow sets `paid` (A3) are what keep money and stock honest. The table lives in core, while the adapter's conditional update only checks the stored status. The test proves that a paid order cannot be cancelled, which would restock its units, and that `pending_payment → paid` is refused. It also checks the order's status, `paid_at` and stock are unchanged afterwards.

### 2. A manual stock edit from a page that predates a checkout is refused

- **Test:** `packages/database/src/adapters/database-order-admin-repository.int.test.ts`, "refuses a manual stock edit from a page that predates a checkout and keeps the sale's decrement".
- **Path:** `AdjustStockUseCase` → `DatabaseStockRepository` (stale check and history row) and `PlaceOrderUseCase` → `DatabaseOrderRepository` (checkout decrement), in one database.
- **Why it matters:** `products.stock_quantity` has three writers (`packages/database/AGENTS.md`). A stock form opened before a sale must not overwrite the decrement the sale made. A stale save returns `StaleStockError` with the current quantity, writes no row to `stock_adjustments`, and leaves the sale's decrement in place. From the refreshed page, the same edit is recorded.

### 3. A customer asking for another customer's order id gets the same not-found as an unknown id

- **Test:** `packages/database/src/adapters/database-order-repository.int.test.ts`, "a customer asking for another customer's order id gets the same not-found as an unknown id, through the use case" (ownership block).
- **Path:** `GetCustomerOrderUseCase` → `DatabaseOrderRepository.findForCustomer` → PostgreSQL.
- **Why it matters:** An account order is private to its customer (E07 A11, A12). The repository already returns `null` for a foreign id (an existing test). This scenario adds the use case mapping: a foreign and an unknown id produce the same `NOT_FOUND` message, so the response does not reveal that an order exists. The owner's own read still works.

## Already covered (not added again)

- **Two concurrent checkouts cannot oversell the last unit:** `database-order-repository.int.test.ts`, "(b) stock 1, two concurrent checkouts: exactly one order" and "(b) at the row lock: two concurrent placements of the last unit sell it once".
- **Copilot with no LLM configured returns the rule-based answer with an explicit fallback reason:** `packages/app/src/server/copilot/ask-copilot.int.test.ts` (`fallbackReason: "not_configured"`). Note that the answer is stored, not dropped: the test asserts that each shown recommendation is saved with `fallback_reason = not_configured`. The "stores nothing" premise in the brief does not match the current behaviour, so no test asserts it.

## Status

- The three scenarios were written on 2026-11-03. Docker was not running on the dev machine, so
  `npm run test:integration` did not run; the tests are type-checked and linted only.
  See the PR body for the exact commands.
