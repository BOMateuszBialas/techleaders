# E07 Phase 1: customer accounts and role separation

Source doc: .ai/specs/2026-10-24-customer-accounts.md
Engine: om-auto-create-pr (steps: 7, --loop: no)

## Goal

Implement Phase 1 (steps 2–8) of the E07 spec: shoppers can register, sign in and sign out on a
second Better Auth instance with its own tables, path, cookie and secret; the guarded account area
exists with an honestly empty "My orders"; every role-separation test passes. Closes #92; part of
#96 (everything except the admin "Account order" label, which is Phase 2a).

## Scope

- `packages/core`: `domain/customers/customer-role.ts`.
- `packages/database`: five `customer_*` entities, the `customer_auth` migration, integration tests.
- `packages/app`: `CUSTOMER_AUTH_SECRET` env rule, `server/customer-auth/*` (factory, guard, sign-in
  and sign-up helpers, actions), the shared auth-handler helper used by the owner sign-in too,
  container wiring, `/api/customer-auth/[...all]` allowlist route, `/account/*` pages, storefront
  header link, checkout sign-in link, extended guard inventory, e2e global setup customers A and B.
- e2e: `customer-auth.e2e.test.ts`, `customer-roles.e2e.test.ts`.

## Non-goals

- Anything of Phase 2 (orders.customer_id, viewer on reference paths, admin label, account order
  pages with data, API `/api/account/orders`) and Phase 3 (docs beyond `.env.example`).
- No change to the owner instance's behaviour.

## Implementation Plan

### Phase 1: Customer accounts and role separation

1. Core `CUSTOMER_ROLES` / `isCustomerRole` (spec step 2).
2. Schema: five `customer_*` entities + `customer_auth` migration + integration tests (step 3).
3. Factory, env and wiring: env rule, `create-customer-auth.ts`, shared handler helper, container,
   route allowlist, e2e global setup secret; unit + integration tests (step 4).
4. Cross-role integration tests (step 5).
5. Guard module `require-customer.ts` and the extended guard inventory (step 6).
6. Actions and pages: sign-up, sign-in, sign-out, `/account`, `/account/orders` empty shell, header
   link, checkout sign-in link; unit + `customer-auth.e2e.test.ts` (step 7).
7. Role-separation e2e `customer-roles.e2e.test.ts` with setup customers A and B (step 8).

## Risks

- Two Better Auth instances in one process (proved by the Phase 0 spike, commit 6027bd0).
- e2e rate-limit budget for customer sign-ups (setup creates A and B once over HTTP).
- Schema migration (additive, `down` drops only the five new tables).

## Decisions and deviations

- `toOrderViewer` and the inventory rule "files calling getOrderByReferenceUseCase/confirmDemoPaymentUseCase import require-customer" (listed under spec steps 6 and 12) move to Phase 2a: `OrderViewer` is defined by core `order-access.ts` (step 10), and no reference path takes a viewer yet. Shipping them now would be unused code.
- No `/api/account/orders` in Phase 1 (A12 is Phase 2), so step 8's "owner session → GET /api/account/orders 401" is proven instead by `/api/customer-auth/get-session` returning null for the owner cookie (e2e) and `customerApiHandler` 401 unit tests.
- `customer_users.role` also gets a DB default `customer` (as `admin_users` has `owner`); the spec said the default lives in the instance config. Harmless superset, mirrors the owner table.
- Shared helpers instead of copies: `authModels`/`authPathLimit`/`authLogger` in `create-auth.ts`, `postToAuthHandler`/`copySetCookies` in `auth-handler-request.ts` (owner sign-in refactored onto them, behaviour unchanged, existing tests pass).
- Header labels are icon-only below `sm` (accessible names kept) so the 390 px header still fits; the storefront-mobile e2e covers the signed-in header.
- Next.js answers a trailing or doubled slash with a 308 to the canonical path before the route allowlist runs; the e2e asserts that (lesson 2026-10-24).
- README env table and BACKWARD_COMPATIBILITY §4 gained `CUSTOMER_AUTH_SECRET` now (production start requires it), ahead of the rest of Phase 3 docs.

## Progress

PR: #100

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Customer accounts and role separation

- [x] 1.1 Core customer roles — ac99b7a
- [x] 1.2 Customer auth schema and migration — ed404c8
- [x] 1.3 Customer auth factory, env and wiring — 9bbf015
- [x] 1.4 Cross-role integration tests — 34b0851
- [x] 1.5 Customer guard module and guard inventory — ca964d9
- [x] 1.6 Customer actions, pages, header and checkout link — e9e67a8
- [x] 1.7 Role-separation e2e — acbbb03
