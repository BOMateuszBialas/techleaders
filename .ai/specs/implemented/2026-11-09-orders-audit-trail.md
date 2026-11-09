# Orders audit trail and restock movements (2026-11-09)

- Status: **implemented** in PR #221 (merged 2026-11-09; branch `fix/orders-audit-trail`). Supersedes A5 and A6 of `2026-10-16-orders-dashboard-demo-store.md`.
- Trigger: cross-model review of E04 (ChatGPT and Gemini, 2026-11-09, `research/reviews/2026-11-09-orders-dashboard-cross-model.md`). Both reviews flagged that a status change and a restock left no audit trail, which breaks the product rule that every status transition and every stock change is traceable.
- Scope: this spec covers only the audit trail. Other review findings are decided in the E04 review log.

## Decisions

| # | Question | Decision |
| --- | --- | --- |
| AT1 | Record every status change? | **Yes.** A row in `order_status_history` (`order_id`, `from_status`, `to_status`, `changed_by`, `changed_at`) per applied change. A refused or stale change writes nothing. |
| AT2 | Who is `changed_by`? | The admin id from the session. `runAdminAction` passes the session admin to the handler; the status action passes `admin.id` to the use case. Nullable column, because a row could outlive a deleted account. |
| AT3 | Record restocks? | **Yes.** Each restocked line writes a `stock_adjustments` row with `source = 'order_cancellation'` and `order_id`. Manual rows get `source = 'manual'` (the default), so the existing panel keeps working. |
| AT4 | Same transaction? | **Yes.** The status change, its history row, the restock and its movement rows commit or roll back together. A failure leaves no partial trail. |
| AT5 | Is the trail editable? | No. Rows are written only by the status change and the restock; there is no API to change or delete them. |

## Data model

- `order_status_history`: new table, index `(order_id, changed_at desc)`, `order_id` cascades on order delete.
- `stock_adjustments`: adds `source varchar(32) not null default 'manual'` with a check (`manual` or `order_cancellation`) and `order_id uuid null` (set null on order delete).
- Migration `Migration20261109090000_order_audit_trail` is additive: no existing row changes.

## Status transitions (the full 6 × 6 view, from `ORDER_TRANSITIONS`)

Each row is the status the order is in; each column is the status the admin may move it to. ✔ = allowed, — = refused.

| from \ to | pending_payment | paid | processing | shipped | cancelled | refunded |
| --- | --- | --- | --- | --- | --- | --- |
| pending_payment | — | — (only the payment flow, A3) | — | — | ✔ restocks | — |
| paid | — | — | ✔ | — | — (paid is never cancelled) | ✔ recorded only |
| processing | — | — | — | ✔ | — | ✔ recorded only |
| shipped | — | — | — | — | — | ✔ recorded only |
| cancelled | terminal | terminal | terminal | terminal | terminal | terminal |
| refunded | terminal | terminal | terminal | terminal | terminal | terminal |

A refund (`refunded`) is a recorded status. No money moves and no stock returns (N02). Its name stays `refunded`; the UI copy already says it is recorded only.

## Tests

- Unit (repository, fake EM): history row written after the status change with the actor; restock writes one movement per line with previous and new quantities; a vanished product writes no movement; stale and missing orders write nothing.
- Unit (use case, action): the actor id reaches the port and the repository; the handler receives the session admin.
- Integration (Testcontainers, real Postgres): a cancel writes one history row with `changed_by`, and two movements with source `order_cancellation`; a refused change writes no history row; the rollback test still holds.
- Drift: the entities and the migration match (the existing drift test runs in CI).

## Not in this change

- Automatic expiry of unpaid `pending_payment` orders (review finding ERR-03). It needs a scheduled job, which the MVP does not have. Stock held by an unpaid order is released only by an admin cancel. Decided 2026-11-09: manual process, the admin cancels stale unpaid orders (restock in the same transaction).
- Revenue of a past period after a refund (review ERR-04). A8 is the approved definition; a `refunded_at` column would change it. Open question for the owner.

## Unpaid orders: visibility (2026-11-09)

Unpaid orders (`pending_payment`) hold stock until they are paid or cancelled. There is no background job, so the owner handles them by hand. This section adds the view that makes them visible; it changes no status rule.

- **Admin orders list** (`/admin/orders`): a view switch "All orders | Unpaid". The unpaid view lists `pending_payment` orders oldest first, 25 per page. Any other `view` value shows all orders.
- **Dashboard card** (`/admin`, above the metrics): the unpaid count, how many are older than 24 hours (`UNPAID_STALE_AFTER_HOURS` in core), and the oldest creation time. It shows an empty state when no order is unpaid.
- **Manual process:** check the unpaid view daily. Cancel an order older than 24 hours on its order page (the cancel dialog returns its stock). Restock is automatic on cancel; nothing else is released.
- **Not automated:** no expiry, no reminder, no email to the shopper. Automatic expiry remains the open decision above.
- **Core:** `UnpaidOrdersSummaryUseCase` (`clock() - 24 h` as the cut-off) and `ListAdminOrdersUseCase` with `view`. The database adapter runs one aggregate query for the summary.
