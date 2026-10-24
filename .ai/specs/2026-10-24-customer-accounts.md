# Customer accounts and "My orders" (E07)

- Backlog: epic E07 #91; stories E07-S01 #92, E07-S02 #93, E07-S03 #94, E07-S04 #95, E07-S05 #96, E07-S06 #97 (filed by `om-backlog` on 2026-10-24, recorded in `.ai/specs/backlog.md`). Refs #91
- Status: **draft**, 2026-10-24. Design decisions P1–P5 answered by the product owner (2026-10-24, recorded in D11); the cross-model review is applied (section "Recenzja innym modelem") together with the owner's decisions D-a…D-d of 2026-10-24. Waiting for: the Phase 0 spike. Not ready for implementation before it
- Design authority: `.ai/specs/product-brief.md` (D11, R08–R10, N06; also D04, D05, R04, R07), `.ai/specs/research/decisions/D11-customer-accounts.md`, `.ai/specs/implemented/2026-10-15-admin-authentication.md` (Better Auth setup, spike method, G4/G9), `.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md` (A7 idempotency, A8 bearer reference, A15 lookup limit), AGENTS.md

## 📝 TLDR

Today every shopper checks out as a guest, the only account in the system is the store owner's, and an order is reachable by anyone who holds its secret reference. **Proposed (future behaviour):** a shopper may register a **customer account** (email and password) on a **second Better Auth instance** with its own tables, endpoint path and cookie. An order placed while signed in is attached to that account by the server, and the customer reads their own orders under "My orders". An account order opens only with its owner's customer session, on every path (account pages, the public order and demo payment pages, the payment action and a read-only API); everything else answers "not found". A customer session never reaches the admin, and the owner session is not a customer session. Guest checkout is unchanged. The reason is the course certificate (two roles with per-user isolation, D11), so the design spends its effort on provable isolation, not on account features (N06).

## 📝 Decisions and assumptions

A1–A5 are the product owner's answers (2026-10-24, D11). A6 onward are this spec's defaults: the most reversible option with the smallest new surface. A6, A9 and A24 and the Phase 2 `down` migration rest on the product owner's decisions D-a…D-d taken after the cross-model review (2026-10-24, see "Recenzja innym modelem").

| #   | Topic | Decision | Why |
| --- | ----- | -------- | --- |
| A1  | Auth instance (P1) | **A separate Better Auth instance for customers**: tables `customer_users`, `customer_sessions`, `customer_accounts`, `customer_verifications`, `customer_rate_limits`; `basePath` `/api/customer-auth`; cookie prefix `commerceos-customer` (so the session cookie is `commerceos-customer.session_token`); `role` column with `check (role = 'customer')`, `input: false`, default `customer`. Every library endpoint except `/sign-up/email`, `/sign-in/email`, `/sign-out` and `/get-session` is switched off with `disabledPaths` (no `/update-user`, `/change-email`, `/change-password`, `/list-sessions`, `/revoke-sessions`, password-reset paths), so no request can change `name`, `image`, email or `role` after sign-up. The owner instance (`create-auth.ts`, `admin_*` tables, `disableSignUp: true`) is **not changed**. Implementation starts with a spike (Phase 0) | The owner instance defaults `role` to `owner` and blocks sign-up. Enabling sign-up there would let a form create an owner if any config slipped. Separate tables, path and cookie make R09 true by construction: neither instance can even look up the other's sessions. Cost: a second set of entities and a migration |
| A2  | Account orders on public paths (P2) | An order with a `customer_id` opens on `/orders/[reference]`, on `/checkout/pay/[reference]` and through `confirmDemoPayment` **only when the request carries that customer's session**. Otherwise the result is exactly the "not found" of an unknown reference (same page, same status, same lookup-limit charge). Guest orders (`customer_id is null`) keep the bearer-reference rule (cart spec A8) | "A cannot see B's order" holds on every path, not only under "My orders". A leaked reference of an account order shows nothing |
| A3  | Past guest orders (P3) | **Never attached** to an account, by email or otherwise. An order's `customer_id` is set once, at placement, and never changes | Emails are not verified (A4): claiming by email would let anyone register someone else's address and read their orders |
| A4  | Password reset and email verification (P4) | **None** (N06). `emailVerification` stays off; the README lists "no password reset, no email verification" as a limitation | There is no email service, and a pretend flow would break product principle 6 |
| A5  | What a customer may do (P5) | **Read only**: list and open their own orders. No cancel, no edit, no address book, no account deletion (N06) | Cancel restocks and is one of the three `stock_quantity` writers (AGENTS.md); a second actor for that transition is not needed for the isolation proof |
| A6  | Session-signing secret (owner decision D-a) | The customer instance signs with its **own secret, `CUSTOMER_AUTH_SECRET`** (new env variable: Zod schema in `env.ts` with `min(32)`, a placeholder in `.env.example`). In `development` and `test` it may be unset and then **falls back to `BETTER_AUTH_SECRET`**; in `production` it is **required and must differ from `BETTER_AUTH_SECRET`**, checked in `parseEnv` at startup next to the `APP_URL` rule (a missing or equal value fails with "CUSTOMER_AUTH_SECRET: is required in production and must differ from BETTER_AUTH_SECRET"). The e2e global setup, which runs `next start` (production mode), passes its own random per-run value, distinct from the owner's. The spike still proves (item c) that an owner session token presented under the customer cookie name, and the reverse, resolves to no session | Separate secrets mean a leaked or rotated secret of one role never affects the other, and nothing signed by one instance (cookie signature, any future signed token) verifies in the other. The dev/test fallback keeps every existing local `.env` working; the production requirement follows the `APP_URL` precedent (BACKWARD_COMPATIBILITY §4, added 2026-10-15). The README env table, `.env.example` and BACKWARD_COMPATIBILITY §4 record the new variable (Phase 1, step 4; Phase 3) |
| A7  | Personal data at sign-up | The form asks for **email and password only**. Better Auth's required `name` is the fixed `"Customer"` set by the server (like `OWNER_NAME`, admin-auth G5) | Data minimisation: the account needs no name, and the order keeps its own name snapshot from the checkout form |
| A8  | Session lifetime and revocation | The owner's values: 8 h of inactivity (`expiresIn` 28 800 s), sliding renewal after 1 h (`updateAge` 3 600 s). **`session.cookieCache` is disabled** (`{ enabled: false }`, as in `create-auth.ts`), so every request resolves the session from `customer_sessions`: sign-out, or deleting the session row by any means, makes the very next request with the same token unauthenticated (integration test, step 4) | One tested configuration; a longer shopper session is an additive change later. A cookie cache would keep a revoked session alive until the cache expires |
| A9  | Duplicate email at sign-up (accepted risk, owner decision D-b) | The **sign-up form (action)** shows one generic message for every refusal (duplicate email, rejected password, library error): "We could not create an account with these details. If you already have an account, sign in." Neither the action's response nor our log lines name the cause. **Limitations:** (1) without email verification, "account created" versus "refused" still tells a prober that an address is registered; (2) a direct POST to the library endpoint `/api/customer-auth/sign-up/email` returns Better Auth's own explicit duplicate-user error. The product owner **accepts this enumeration risk** for both paths (D-b, 2026-10-24); the sign-up rate limit (A10) bounds the probing, and `.ai/security-notes.md` and the README record it. The spike (item f) records the raw endpoint's real status and body for an existing versus a new email, and that record goes into the security notes. Alternative (rejected by D-b): disable the public sign-up path and let only the action call the handler server-side | The D11 draft asked that registration "does not reveal whether the account exists". That is achievable only with an emailed confirmation step, which A4 rules out. This states the honest limit instead of claiming it |
| A10 | Rate limits | Customer instance, its own table `customer_rate_limits`: `/sign-in/email` and `/sign-up/email` each **5 per minute per trusted client IP**, or **20 per minute shared** when `AUTH_TRUSTED_IP_HEADER` is unset; `ipAddressHeaders` never defaults to `x-forwarded-for`. Same rule and constants as the owner (admin-auth G1/G2). **Documented limitation:** without the header, the shared 20/min bucket lets one client flooding the form block customer sign-in and sign-up for everyone (a global denial of service). Any public deployment must configure `AUTH_TRUSTED_IP_HEADER` behind a proxy that overwrites it; the README's deployment note (today only for owner sign-in, Known limitations) is extended to customer sign-in and sign-up. The forged `X-Forwarded-For` test stays | A flood of customer sign-ins cannot lock the owner out (separate buckets), and the forged-header lesson applies unchanged. Trusting a forgeable header by default would be worse than the shared bucket |
| A11 | URLs | Inside the `(storefront)` group: `/account/sign-in`, `/account/sign-up`, `/account` (redirects to `/account/orders`), `/account/orders`, `/account/orders/<id>` (`<id>` = order uuid, never the public reference). A malformed, unknown or foreign id shows the same account "not found" page with status 404 (the malformed check returns before any query) | The uuid in the account URL is meaningless without the session; the bearer reference never needs to appear in account URLs |
| A12 | API | Read-only, additive: `GET /api/account/orders` and `GET /api/account/orders/<id>`, both through `customerApiHandler` (401 without a customer session, the same 404 body for a malformed, unknown or foreign id, `ApiResult` envelope, no internal details) | The certificate asks for isolation on page, action **and** API; this is the smallest API that proves it, as `/api/admin/me` did for the owner |
| A13 | List size | The newest **50** orders, newest first; no paging. The page says "Showing your 50 most recent orders" when the cap is hit | A demo account holds a handful of orders; paging is additive later |
| A14 | Where ownership is decided | In two places, both on the server: (1) **SQL** for account reads: `findForCustomer(customerId, orderId)` and `listForCustomer(customerId)` filter `where customer_id = :customerId`; (2) **core** for reads by reference: `GetOrderByReferenceUseCase` and `ConfirmDemoPaymentUseCase` take a **required** `viewer: OrderViewer` (`{ customerId: string \| null }`) and apply `canViewOrder(order, viewer)` from `core/src/domain/orders/order-access.ts`. A foreign order raises the same `NotFoundError` (same message) as an unknown one. The viewer's `customerId` comes only from `getCurrentCustomerId()` (A24), never from a URL, form or body | A required parameter cannot be forgotten by a new caller (the compiler refuses), and the no-oracle rule lives in one tested function |
| A15 | Idempotency across principals | Two checks on the duplicate-key path of `PlaceOrderUseCase` (the fast path and the post-failure lookup, cart spec A7 and its "request fingerprint" rule): (1) the request fingerprint includes the placing principal (`customer:<id>` or `guest`); (2) the existing order is returned only when its stored `customer_id` **is not distinct from** the placing principal's id (`null` for a guest), compared in the use case on the looked-up `OrderRecord.customerId`. Either mismatch is the existing `ConflictError` ("This checkout form was already used. Review your cart and submit again."), whose message and response carry no reference, status, total or any other field of the original order | Without it, a replayed idempotency key would hand the original order's reference to whoever replays it. The column check holds even if the fingerprint inputs ever change |
| A16 | Checkout when signed in | The email field is **prefilled** from the account and stays editable; the order keeps today's name, email and address snapshot. `customer_id` comes from the session in the action, never from a form field. If the shopper edits the email, the order is **still attached to the session's account**; the typed email is only the order's contact snapshot and never selects, creates or changes an account. A signed-out shopper sees a "Sign in for order history" link (`/account/sign-in?from=checkout`) | R10: an account never changes what checkout validates; the snapshot stays the order's record |
| A17 | Redirect after sign-in or sign-up | `/account/orders`, or `/checkout` when the fixed code `from=checkout` is present; any other value is ignored. No free-form return URL | No open-redirect surface (admin-auth decision on `next`) |
| A18 | Owner's view of account orders | Admin order list and detail show **"Account order"** or **"Guest order"** (a boolean `placedWithAccount` in the admin DTOs). No customer id, account email, session, token or hash appears in any admin DTO or response | The owner sees cause and effect (D05) without a new path into customer credentials |
| A19 | Both roles in one browser | Allowed. The owner cookie and the customer cookie are independent; each area reads only its own. The same email may exist as an owner and as a customer: they are different identities in different tables | Follows from A1; documented so nobody "fixes" it by merging identities |
| A20 | Cart | The cart cookie is not tied to an account and is unchanged by sign-in or sign-out | No new state; the cart spec's cookie contract (BACKWARD_COMPATIBILITY §1) stays |
| A21 | Header | The storefront header shows "Sign in" or "My orders" plus "Sign out", read at request time inside `<Suspense>`; never inside `use cache` | Session-derived UI must never be served to another request (admin-auth UI rule) |
| A22 | Demo and seed data | `db:seed` creates **no** customer account and no credentials (admin-auth G4). `DEMO-` orders stay guest orders (`customer_id` null). e2e customers are created per run with random passwords (G9) | R07; nothing secret in the repo |
| A23 | Session-dependent reads are request-time, never cached | Every page, loader, component or read whose output depends on the customer session (the header block of A21, `/orders/[reference]`, `/checkout/pay/[reference]`, `/checkout` email prefill, everything under `/account/**` and `/api/account/**`) runs at request time: it calls `connection()` (or reads `headers()`/`cookies()`) inside `<Suspense>`, and is **never** inside a `use cache` function or component, nor called from one. Session-independent parts (catalog data) may stay cached. The spike (item i) proves it with `cacheComponents` on, and e2e (step 13) proves it in both directions after a cache warm-up and after a sign-out and sign-in of another customer in the same browser context | With `cacheComponents` on, one cached render containing A's order would be served to B (or to a signed-out browser). Request-time reads make the session part of every response's input |
| A24 | Session-read failure versus no session (owner decision D-c) | `getCurrentCustomerId()` returns a **tri-state** `CustomerIdResult`: `{ status: "customer", customerId }`, `{ status: "none" }` (no or non-customer session) or `{ status: "error" }` (the session lookup threw, e.g. the database is down; logged as `customer_auth.session_error`). **Checkout** never silently turns a signed-in customer into a guest: on `error`, `placeOrder` stops **before** calling the use case (no order, no stock change) with a generic message ("We could not confirm your account. Try again signed in, or continue as a guest.") and two explicit choices: "Try again signed in" (resubmits as usual) and "Continue as guest" (resubmits with the fixed field `checkoutAs=guest`, rendered only in this state). `checkoutAs=guest` can only lower the principal to a guest (`customer_id` null, no session read); it can never select an account. **Public order and payment paths** (`load-order-page.ts`, `confirmDemoPayment`) map `error` like `none` to the viewer `{ customerId: null }`: account orders answer "not found", guest orders work. `requireCustomer*` and `getCurrentCustomer` let the error propagate (account pages show their error state, the API answers 500 generic) | A customer whose session read fails would otherwise place an order that never appears under "My orders" and opens to anyone holding its reference. Guest purchase stays possible by the shopper's explicit choice (R10) |

## 📝 Problem Statement

- The course's gold certificate requires sign-in, at least two roles with different permissions, no access to other users' data, and an authorization test that shows user A cannot reach B's data or another role's operations (D11).
- Today: one role (`owner`); shoppers are anonymous; `orders` has no link to any account; `/orders/[reference]` serves any holder of the reference (cart spec A8).
- The MVP spec §3 already mentions "order history/lookup for the current demo account", so E07 completes an existing line rather than opening a new product direction. The brief records that this rests on a course requirement, not on shopper evidence (DoR addendum).
- Acceptance criteria (D11 draft, E07-S01…S06), condensed:
  - **AC1 (S01):** a shopper registers, signs in and signs out; the account always has the role `customer`, set by the server, whatever the request body says.
  - **AC2 (S02):** a signed-in order is attached to the session's account; a submitted `customerId` is ignored; a guest order has `customer_id` null and today's flow is unchanged.
  - **AC3 (S03):** "My orders" lists only the customer's orders (newest first, reference, date, status, total in PLN) with a read-only detail; empty, loading and error states; a guest is sent to sign-in.
  - **AC4 (S04):** customer A never sees customer B's order through a page, an action or the API; every attempt answers "not found" (404), never 403 or 400, and reveals nothing: a malformed, unknown and foreign order id give the same 404 page and the same API body.
  - **AC5 (S05):** a customer never reaches admin pages, admin APIs or admin actions; the owner session does not open the account area; no request turns a customer into an owner.
  - **AC6 (S06):** README, AGENTS.md and `.ai/security-notes.md` describe the roles, the guard, the limitations and how tests create accounts.

## 📝 Proposed Solution

Better Auth already owns credentials, hashing, sessions, the rate limit and the origin check for the owner. A **second instance** does the same for customers, with nothing shared but the `pg` pool (each instance has its own signing secret in production, A6). CommerceOS owns:

1. **The schema:** five `customer_*` tables and `orders.customer_id`, as MikroORM entities and migrations (Better Auth's `migrate` CLI is never run).
2. **One guard module for the account area,** `server/customer-auth/require-customer.ts`, the mirror of `require-admin.ts`. The guard inventory test enforces both and forbids crossing them.
3. **Ownership rules in core and SQL** (A14): the session decides the viewer, the database filters by it, and a foreign order is indistinguishable from a missing one.

Alternatives rejected:

- **One instance with a `role` column** (admin-auth Q4's "additive migration" path): the owner instance would need sign-up enabled, its `role` default would have to change, and every owner check would depend on a role comparison instead of a separate table. One config mistake creates an owner from a public form. Rejected by the product owner (P1).
- **Better Auth's `admin` or `organization` plugin:** adds roles, impersonation and endpoints we would have to lock down; more surface than two plain instances.
- **Hand-rolled customer sessions:** forbidden by the MVP spec §4/§8 (no session security from scratch).

**Market check.** Medusa v2 keeps store customers and admin users as different actor types with separate authentication identities, close to A1. Saleor keeps staff and customers in one user table distinguished by a staff flag, which is the coupling A1 avoids. Shopify's new customer accounts sign in with an emailed one-time code, which needs an email service (out of scope, A4); its order-status page is reached by an unguessable token, as our guest orders are. Nobody in this set attaches past guest orders by an unverified email (A3).

## 📝 Architecture

```mermaid
flowchart LR
  subgraph app["packages/app"]
    CA["server/customer-auth/create-customer-auth.ts (new)"]
    RC["server/customer-auth/require-customer.ts (new)"]
    ACT["server/customer-auth/customer-auth.action.ts (new: signUp, signIn, signOut)"]
    CR["/api/customer-auth/[...all] (new, Better Auth handler)"]
    AP["/account/* pages (new)"]
    API["/api/account/orders[/id] (new)"]
    OP["/orders/[reference], /checkout/pay/[reference] (changed: viewer)"]
    OA["server/orders/order.action.ts (changed: customerId, viewer)"]
    RA["server/auth/require-admin.ts (unchanged)"]
    C["container.ts (changed: customerAuth singleton, getCustomerAuth, use cases)"]
  end
  subgraph core["packages/core"]
    ACC["domain/orders/order-access.ts (new)"]
    UC["services/orders: list/get customer orders (new); place, get-by-reference, confirm payment (changed)"]
  end
  subgraph db["packages/database"]
    E["entities/customers/* + orders.customer (new/changed), 2 migrations"]
    R["DatabaseOrderRepository (changed)"]
  end
  AP --> RC
  API --> RC
  OP --> RC
  OA --> RC
  ACT --> CA
  RC --> C
  CR --> C
  C --> CA
  OP --> UC
  OA --> UC
  API --> UC
  AP --> UC
  UC --> ACC
  UC --> R
  R --> E
```

**Takeaway:** the customer area is a parallel copy of the owner's auth path (factory, guard, actions, handler route), sharing only the container's `authPool`. Ownership checks sit in core and SQL, so every presentation path (page, action, API) inherits them. The admin guard and the owner instance do not change.

- **`packages/app/src/server/customer-auth/`** (new concept folder):
  - `create-customer-auth.ts`: `createCustomerAuthOptions` / `createCustomerAuth({ pool, env, log })`, no `server-only` (same reason as `create-auth.ts`). `secret` is `env.CUSTOMER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET` (the fallback is reachable only outside production, A6); `session.cookieCache: { enabled: false }` (A8). It reuses `snakeCase`, `summarizeAuthError` and the session and rate-limit constants, exported from `create-auth.ts` (no copy). Config differences from the owner instance: `basePath: "/api/customer-auth"`, `advanced.cookiePrefix: "commerceos-customer"`, `emailAndPassword: { enabled: true, disableSignUp: false, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true }`, `customer_*` model names, `user.additionalFields.role = { type: "string", input: false, defaultValue: "customer", required: true }`, rate-limit rules for `/sign-in/email` and `/sign-up/email` (A10), `plugins: [nextCookies()]`.
  - `require-customer.ts` (`server-only`): `getCurrentCustomer(): Promise<CustomerPrincipal | null>` (`{ id, email, role: "customer" }`, never the session or token; `null` unless `isCustomerRole`), `getCurrentCustomerId(): Promise<CustomerIdResult>` (the tri-state of A24: `customer`, `none` or `error`, never throwing; an `error` is logged as `customer_auth.session_error`), `toOrderViewer(result): OrderViewer` (maps `none` and `error` to `{ customerId: null }`, used only by the public order and payment paths, never by checkout), `requireCustomerPage()` (redirect to `/account/sign-in`), `requireCustomer()` (`UnauthorizedError`), `customerApiHandler(route, handler)` (`connection()` first, then `apiHandler` + `requireCustomer`, exactly like `adminApiHandler`).
  - `customer-sign-in.ts`, `customer-sign-up.ts`: post through `getCustomerAuth().handler(...)` (never `auth.api.*`, which skips the rate limit and origin check; lesson 2026-10-15), forward only `origin`, `user-agent`, `cookie` and the trusted IP header, copy `Set-Cookie` with `parseSetCookieHeader` / `toCookieOptions`, and return a fixed error code (`invalid`, `rate_limited`, `unavailable`, `refused`). The sign-up body is built by the server from the validated email and password plus `name: "Customer"`; no other field is forwarded (AC1). The shared "post to an auth handler and copy the cookie" logic moves into one helper used by the owner and customer paths, so the hardening is not duplicated.
  - `customer-auth.action.ts` (`"use server"`): `signUpCustomer`, `signInCustomer`, `signOutCustomer`. Like `auth.action.ts`, a documented guard exception (they create or end the session).
- **Routes:** `app/api/customer-auth/[...all]/route.ts` (one-line `toNextJsHandler(getCustomerAuth())`), `app/(storefront)/account/{page,sign-in/page,sign-up/page,orders/page,orders/[id]/page}.tsx`, `app/api/account/orders/route.ts`, `app/api/account/orders/[id]/route.ts`. Pages render a static shell; the session is read only inside `<Suspense>` in named async components (`AccountOrders`, `AccountOrderDetail`, `RedirectIfCustomerSignedIn`), each starting with `await requireCustomerPage()`.
- **Changed storefront paths:** `load-order-page.ts` passes `viewer: toOrderViewer(await getCurrentCustomerId())` to `getOrderByReferenceUseCase`; `confirmDemoPayment` passes the same viewer; `placeOrder` passes `customerId` from a `customer` result, `null` from `none` or from an explicit `checkoutAs=guest`, and stops on `error` without calling the use case (A24). All of them are request-time (A23). The not-found pages of both reference routes add one unconditional line: "Orders placed with an account open only while you are signed in to it." (shown for every not-found, so it reveals nothing).
- **`container.ts`:** a `customerAuth` singleton built from the existing `authPool` and env (no request state, so strict mode holds), `getCustomerAuth()` (lazy, request time only, never at import or prerender; lesson 2026-10-15), plus scoped `listCustomerOrdersUseCase` and `getCustomerOrderUseCase`.
- **`packages/core`:** `domain/customers/customer-role.ts` (`CUSTOMER_ROLES = ["customer"]`, `isCustomerRole`), `domain/orders/order-access.ts` (`OrderViewer`, `canViewOrder`), `services/orders/customer-order.dto.ts`, `list-customer-orders.use-case.ts`, `get-customer-order.use-case.ts`; changed `place-order.use-case.ts` (`customerId: string | null` input, A15 fingerprint), `get-order-by-reference.use-case.ts` and `payments/confirm-demo-payment.use-case.ts` (required `viewer`), `admin-order.dto.ts` (`placedWithAccount`). Sign-up input reuses `signInSchema` (email, password 8–128).
- **`packages/database`:** entities in `src/entities/customers/` (five, mirroring the spike's generated schema), `orders.customer` (`manyToOne(CustomerUserSchema).nullable().deleteRule("restrict")`), `DatabaseOrderRepository` (`placeOrder` writes `customer_id`; `listForCustomer`, `findForCustomer`), `DatabaseOrderAdminRepository` (selects `customer_id is not null` as `placedWithAccount`). New adapter methods that read personal data use `sanitizeDatabaseError` (lesson 2026-10-16).
- **Guard inventory (`admin-guard-inventory.test.ts`, extended):**
  - pages, layouts and defaults under `app/(storefront)/account/`, except `sign-in/` and `sign-up/`, must call `requireCustomerPage(`;
  - route handlers under `app/api/account/` must use `customerApiHandler(`;
  - `server/customer-auth/customer-auth.action.ts` joins the sign-in exception list; any other `"use server"` file keeps today's rule;
  - **no crossing:** no file under `app/admin/`, `app/api/admin/` or a `"use server"` admin file imports `require-customer`, and no file under `app/(storefront)/account/` or `app/api/account/` imports `require-admin`;
  - `getCustomerAuth(` is called only in `server/customer-auth/` and the customer auth route; `getAuth(` only in `server/auth/` and the owner auth route;
  - every file that calls `getOrderByReferenceUseCase` or `confirmDemoPaymentUseCase` imports `require-customer` (the viewer comes from the session).
  - Each new rule ships with a fixture proving it fails on an unguarded file.
  - The inventory proves that a guard is **imported or named**, not that it runs on every path or that its result is used. It is complementary only: every session-dependent path (each account page and API route, the order and payment pages, `placeOrder`, `confirmDemoPayment`, the header) also has **behaviour tests** for no session, the wrong role (an owner session, and a customer session on admin paths) and a session-read failure (A24), asserting the outcome (redirect, 401, 404 or the A24 checkout error) and that no use case runs where none should.

### Data flow of an account order

1. `placeOrder` (action) reads `await getCurrentCustomerId()` unless the form carries `checkoutAs=guest`; on `error` it returns the A24 state without calling the use case; otherwise it validates the form as today and calls `placeOrderUseCase.execute({ lines, request, customerId })` (`customerId` null for a guest).
2. The use case folds the principal into the request fingerprint and, on a duplicate key, returns the existing order only when its `customer_id` matches the principal (A15) and passes `customerId` into `PlaceOrderCommand`; `DatabaseOrderRepository.placeOrder` writes it in the same transaction as the stock decrements (no change to the decrement SQL or lock order).
3. The demo payment page and `confirmDemoPayment` call their use cases with the viewer; `canViewOrder` runs right after the lookup, before any status branch (`already_paid`, not payable), the gateway call or `markPaid`, so a foreign viewer gets the unknown-reference `NotFoundError` and learns nothing about the order's state.
4. "My orders" and the API call `listForCustomer` / `findForCustomer` with the session's id.

## 📝 Data Model

All names are **expected**; the exact column set, types, defaults and indexes of the five customer tables come from the pinned `npx auth@1.7.10 generate` output in the spike, as for the owner tables.

| Table | Key columns | Constraints |
| --- | --- | --- |
| `customer_users` | `id uuid`, `email`, `name` (fixed "Customer"), `email_verified` (always false), `image` (null), `role`, timestamps | `unique(email)`, `check (role = 'customer')` |
| `customer_sessions` | `id`, `user_id → customer_users (cascade)`, `token`, `expires_at`, `ip_address`, `user_agent`, timestamps | `unique(token)`, index `user_id` |
| `customer_accounts` | `id`, `user_id → customer_users (cascade)`, `account_id`, `provider_id`, `password` (scrypt hash), OAuth columns (null), timestamps | index `user_id` |
| `customer_verifications` | `id`, `identifier`, `value`, `expires_at`, timestamps | required by Better Auth core; unused (A4) |
| `customer_rate_limits` | `id`, `key`, `count`, `last_request` | `unique(key)` |
| `orders` (changed) | `customer_id uuid null` | FK `→ customer_users(id) on delete restrict` (intentional, see below); index `(customer_id, created_at)` |

```mermaid
flowchart LR
    classDef newEntity fill:#2f6feb,color:#fff,stroke:#1b4fb0
    classDef existingEntity fill:#e5e7eb,color:#111,stroke:#9ca3af

    entity_1["customer_users"]:::newEntity
    entity_2["customer_sessions"]:::newEntity
    entity_3["customer_accounts"]:::newEntity
    entity_4["customer_verifications"]:::newEntity
    entity_5["customer_rate_limits"]:::newEntity
    entity_6["orders (customer_id added)"]:::existingEntity
    entity_7["order_items"]:::existingEntity
    entity_8["admin_users"]:::existingEntity

    entity_1 -->|1-n| entity_2
    entity_1 -->|1-n| entity_3
    entity_1 -->|1-n, nullable| entity_6
    entity_6 -->|1-n| entity_7
```

`customer_verifications` and `customer_rate_limits` have no foreign keys; `admin_users` is drawn to show that **no relation** exists between the two identity sets.

- **`on delete restrict` is intentional:** an order is a business record and must never disappear or silently turn into a guest order (which would reopen it by reference, A2) because an account row was deleted. Account deletion is out of scope (A5, N06), so nothing deletes `customer_users` rows. A future erasure request would **anonymise** the `customer_users` row (email, password hash, sessions) and keep the row and its orders, never delete them; that is a separate spec.
- **Personal data:** a customer's email, password hash (only in `customer_accounts.password`), session IP and user agent. None of it is returned by any route; `CustomerPrincipal` carries id, email and role only; the logger redacts `password`; logs carry `customerId` and an event code, never the email or IP (admin-auth G6).
- **Migrations (two, one per phase):**
  - Phase 1 `customer_auth`: creates the five tables. `down` drops them. No existing table changes.
  - Phase 2 `orders_customer`: adds the nullable `customer_id`, the FK and the index. No backfill: existing orders stay guest orders (A3). `down` **first refuses** (owner decision D-d): a `do $$ … $$` block raises an exception when any order has a non-null `customer_id` (message: "orders_customer down refused: account orders exist; roll forward instead"), so the migration fails and nothing changes; only with guest-only data does it drop the index, FK and column.
- **Rollback plan:** dropping `customer_id` while account orders exist would turn them into guest orders reachable by their reference, so a reference that leaked while A2 hid it would open the order again (a privacy regression). The `down` guard makes that impossible: once account orders exist, fixes go **forward only** (a new migration). The PR body states this. Rolling back Phase 1 requires Phase 2 rolled back first (the FK), so Phase 1 `down` is likewise blocked while account orders exist. The migration test covers up → down → up on guest-only data and the refusal with account orders present (step 9).

## 📝 API Contracts

All additive (BACKWARD_COMPATIBILITY §1, §2).

- **`/api/customer-auth/*`:** Better Auth's handler for the customer instance. Enabled: `POST /sign-up/email`, `POST /sign-in/email`, `POST /sign-out`, `GET /get-session`; every other library path is disabled (A1) and answers 404. Library-owned shapes, pinned at `~1.7.10`.
- **`GET /api/account/orders`:** `200 ApiResult<{ orders: CustomerOrderSummaryDto[]; capped: boolean }>` where `CustomerOrderSummaryDto = { id, reference, createdAt, status, total: { amountMinor, currency } }`; `401 UNAUTHORIZED` without a customer session (an owner session included).
- **`GET /api/account/orders/<id>`:** `200 ApiResult<CustomerOrderDto>` (the summary plus `items[]` from snapshots, `subtotal`, `shipping`, `paidAt`, and the shipping address and contact snapshot); `404 NOT_FOUND` for a **malformed**, unknown **or foreign** id (identical body; the malformed check returns before any query); `401` without a customer session. There is no `400` on this route.
- **Server actions** (internal shapes, BACKWARD_COMPATIBILITY §1):
  - `signUpCustomer`, `signInCustomer` (`email`, `password`, optional fixed `from=checkout`): on success redirect (A17); on failure a fixed `?error=` code mapped to one message (sign-in: "Invalid email or password."; sign-up: A9; both: "Too many attempts. Try again in a minute.", "Sign-in is unavailable. Try again.").
  - `signOutCustomer`: deletes the session row, redirects to `/`.
  - `placeOrder`, `confirmDemoPayment`: unchanged field names; behaviour per A2, A14, A15, A24. `placeOrder` gains one optional field, `checkoutAs` (only the literal `guest`; any other value is a validation error), sent only from the A24 recovery state.
- **Env (additive, BACKWARD_COMPATIBILITY §4):** `CUSTOMER_AUTH_SECRET`, optional in development and test (falls back to `BETTER_AUTH_SECRET`), required in production and different from `BETTER_AUTH_SECRET` (A6). Documented in `.env.example`, the README env table and BACKWARD_COMPATIBILITY §4.

## 📝 UI/UX

- **`/account/sign-up`, `/account/sign-in`:** a centred card like `/admin/sign-in`: email, password (`autocomplete="email"`, `new-password` / `current-password`), submit, a generic `role="alert"` error, links between the two pages and "Continue as a guest" back to the store. A note says this is a demo store and there is no password reset. An already signed-in customer is redirected to `/account/orders`. No client component (the owner form's pattern: works without JavaScript, errors as fixed `?error=` codes).
- **`/account/orders`:** heading "My orders", a table (reference, date, status, total in PLN), newest first; each row links to the detail. **Empty:** "You have no orders yet." with a link to the catalog. **Loading:** skeleton in `<Suspense>`. **Error:** "Your orders are unavailable right now. Try again." (generic). **Cap:** A13 note. A "Sign out" button.
- **`/account/orders/<id>`:** reference, date, status, items from snapshots, totals, shipping address; no action buttons (A5). A pending order shows a link to its demo payment page. Unknown or foreign: the account not-found page "Order not found".
- **Header:** A21. **Checkout:** A16; the session-read failure state of A24 is a `role="alert"` banner above the submit button with the two buttons "Try again signed in" and "Continue as guest" (both plain form submits, no JavaScript needed).
- Copy in English (admin-auth G8). Mobile: tables wrap per the 2026-10-19 lesson (no hidden columns at 390 px).

## 📝 Edge Cases & Failure Scenarios

| Case | Behaviour |
| --- | --- |
| Sign-up body carries `role: "owner"` (or any extra field) | The action never forwards it; a direct POST to `/api/customer-auth/sign-up/email` with `role` is refused or ignored by `input: false`, and the DB check `role = 'customer'` rejects any other value (integration test for all three layers) |
| Direct POST to `/api/customer-auth/update-user` (e.g. `{ role: "owner", name: "x" }`) or another non-listed library path | 404: the path is disabled (A1); the user row is unchanged (integration test) |
| Customer session read throws (e.g. DB down) on an order or payment page | `getCurrentCustomerId()` logs and returns `error`; `toOrderViewer` gives a guest viewer: guest orders work, account orders answer "not found" until it recovers (A24) |
| Customer session read throws while placing an order | No order, no stock change; the A24 banner offers "Try again signed in" or "Continue as guest"; only the explicit guest choice places a guest order (unit and integration tests) |
| Shopper edits the prefilled email at checkout | The order still attaches to the session's account; the typed email is the order's contact snapshot only (A16) |
| Customer session row deleted (sign-out elsewhere, manual revocation) | The next request with the same token has no session: cookie cache is off (A8, integration test) |
| A cached render of a session-dependent page | Not possible by construction: those reads are request-time and never inside `use cache` (A23, spike i, e2e step 13) |
| Malformed order id on `/account/orders/<id>` or `/api/account/orders/<id>` | The same 404 page or body as an unknown or foreign id |
| Sign-up fails after the user row is written (e.g. account or session insert fails) | No orphan `customer_users` row is left: the spike (item j) records whether Better Auth writes user, account and session in one transaction; if not, the sign-up path compensates (deletes the half-created user through the adapter) and an integration test covers it |
| Phase 2 `down` with account orders present | Refused with an exception; nothing changes (D-d) |
| A foreign viewer confirms the payment of an order that is already paid or cancelled | Unknown-reference `NotFoundError`, never `already_paid` or "not payable" (the check runs before any status branch) |
| Customer cookie sent to `/admin/*` or `/api/admin/*` | The owner instance reads only `better-auth.session_token`; no admin → redirect to `/admin/sign-in` / 401 |
| Owner cookie sent to `/account/*` or `/api/account/*` | The customer instance reads only `commerceos-customer.session_token` → redirect to `/account/sign-in` / 401 |
| Owner token copied into the customer cookie name (or the reverse) | No row in the other instance's session table → no session (spike c, integration test) |
| A opens `/account/orders/<id of B>` or the API with it | Same "not found" page / `404` body as a random uuid; no B data; nothing logged with B's id at warn level |
| A opens `/orders/<ref of B>` or `/checkout/pay/<ref of B>` (account order) | The reference not-found page; counts against the lookup limit like any lookup (no free probing) |
| A posts `confirmDemoPayment` with B's reference | `NotFoundError` before `markPaid`; B's order stays `pending_payment` (integration and e2e) |
| A guest opens a guest order by reference | Unchanged (cart spec A8) |
| Customer signs out between placing and paying | The pay page answers "not found" with the unconditional sign-in hint; signing back in opens it again |
| Replayed checkout form under another principal (customer B, a guest, or A's form replayed by B) | `form_reused` `ConflictError` with no field of the original order (A15; unit and integration tests) |
| Session expires while on "My orders" | Next request redirects to sign-in; API 401 |
| `customer_id` FK target missing (bug or race) | The insert fails inside the order transaction; stock decrements roll back; generic checkout error, sanitized log (lesson 2026-10-16) |
| Sign-up flood or sign-in brute force | 429 after the A10 limit; owner sign-in unaffected (separate bucket) |
| DB down during sign-up or sign-in | "Sign-in is unavailable. Try again."; logged; no stack trace |
| Duplicate email | A9 message on the form; the raw endpoint's explicit error is an accepted, documented risk (D-b) |

## 📝 Risks & Impact Review

- **Two Better Auth instances in one process** is not documented as a supported pattern. The spike (Phase 0) proves cookies, base paths, `nextCookies()` (including both instances' `Set-Cookie` headers in one request), rate-limit tables, separate secrets and lazy init do not collide; a decision-changing failure goes back to the product owner (same rule as admin-auth G11).
- **`risk-high` by SDLC.md:** auth and sessions, data scoping and a schema migration. Each implementation PR carries the integration tests for the denied path and the wrong-scope read, the A↔B isolation test, a migration test up and down with the rollback plan in the PR body, `needs-qa`, no self-QA, and a second person's review.
- **Changed core signatures** (`GetOrderByReferenceUseCase`, `ConfirmDemoPaymentUseCase`, `PlaceOrderUseCase`, `OrderRecord`, `PlaceOrderCommand`): internal package exports (BACKWARD_COMPATIBILITY §3): every consumer is updated in the same PR.
- **Public URL behaviour:** `/orders/<reference>` and `/checkout/pay/<reference>` change only for account orders, which do not exist before this feature, so no existing link breaks.
- **Sign-up enumeration** (A9, accepted by D-b), **no password reset** (A4) and the **shared rate-limit bucket without a trusted IP header** (A10): documented limitations, recorded in `.ai/security-notes.md` and the README.
- **New env variable** (A6): `CUSTOMER_AUTH_SECRET` is required in production, so a production start without it fails at startup by design (like `APP_URL`). Local `.env` files keep working through the dev/test fallback; the e2e global setup and any CI step that starts the production build pass a per-run value.
- **e2e auth budget:** customer sign-ups and sign-ins have their own buckets (A10), but a suite that registers through the UI more than a few times per minute will hit 429. The global setup creates customers A and B once over HTTP and provides their cookies (`useCustomerSession`), the pattern of `ownerSessionCookie` (lessons 2026-10-16/17).
- **Stock writers, money, metrics and Copilot:** unchanged. No new writer of `products.stock_quantity`; the checkout transaction gains one column; metrics ignore `customer_id`; no Copilot tool reads customer tables or `customer_id`.
- **Product direction:** none beyond D11. N01 (single store) holds: customers belong to the one store.

## 📝 Decisions in play

- **D11, R08, R09, R10, N06:** implemented by this spec (owner: product owner).
- **R04:** unchanged; the checkout validation and the conditional stock decrement are not touched.
- **R07:** demo orders stay guest orders; no seeded customer (A22).
- **D04, D05, N01:** portfolio path, one owner, one store.
- Admin-auth Q2/Q4/G4/G9: no public owner sign-up, the owner role untouched, no seeded credentials, per-run e2e passwords.
- Superseded: none.

## 📋 Phasing

- **Phase 0, spike (throwaway branch, nothing merged).** Proves two instances in one process. Results are written into this spec ("Spike results") on the spec PR before it merges.
- **Phase 1, customer accounts and role separation (E07-S01, S05 except the admin label).** Shoppers can register, sign in and out; the account area exists with an empty "My orders" (no order carries `customer_id` yet, so the list is honestly empty); all role-separation tests pass. Ships alone: nothing about orders changes.
- **Phase 2a, ownership rules first (no visible change).** The `orders_customer` migration, `canViewOrder` with the required `viewer` on every reference path (order page, payment page, `confirmDemoPayment`), and the admin "Account order" / "Guest order" label. A no-op for users, because no order has `customer_id` yet; it puts the A2 check in place before any account order can exist (steps 9–10, the 2a parts of 11–12).
- **Phase 2b, account orders and isolation (E07-S02, S03, S04).** Orders attach to accounts; "My orders" and the API show them; the A↔B isolation e2e (the rest of steps 11–12, steps 13–14). Merges only after 2a: ordering, not bundling, keeps a reference from ever opening an account order.
- **Phase 3, documentation and certificate evidence (E07-S06).** Lands with Phase 2's PR or right after it.

## 📋 Implementation Plan

### Phase 0: Spike

1. **Spike with an exit gate.** On a throwaway branch: build both instances from one `pg.Pool` with the A1 config, run the pinned `npx auth@1.7.10 generate` for the customer config, apply the owner and customer SQL to a Testcontainers PostgreSQL, and prove:
   - (a) both configs compile under `strict` (`basePath`, `advanced.cookiePrefix`, `disableSignUp: false`, `maxPasswordLength`, rate-limit `customRules` for sign-up) and initialise without a "schema mismatch" log;
   - (b) customer sign-up through the HTTP handler creates a user with `role = 'customer'` and a session; a body with `role: "owner"` does not produce an owner (record whether it is refused or ignored);
   - (c) cookie isolation with **separate secrets** (A6): the owner cookie gives no customer session and the reverse; an owner token value under the customer cookie name, and the reverse, gives no session;
   - (d) a Next 16 server action posting to each handler and copying `Set-Cookie` sets the right cookie, and both `nextCookies()` plugins coexist: sign-out of one leaves the other's cookie, and when **both instances set cookies in the same request** (e.g. one request signs in a customer while an owner cookie is present and renewed) both `Set-Cookie` headers reach the response and neither overwrites the other;
   - (e) rate limits land in their own tables; customer sign-in or sign-up 429s do not affect owner sign-in;
   - (f) the real status and body of the **raw** `/api/customer-auth/sign-up/email` endpoint for an existing versus a new email (and the timing), recorded for the A9 accepted risk and the security notes;
   - (g) the generated customer schema (mirrored by the entities in step 3);
   - (h) `disabledPaths` turns off every library path except the four in API Contracts (`/update-user` with `{ role: "owner" }` → 404, row unchanged);
   - (i) with `cacheComponents` on, a request-time component reading the customer session (A23) renders per request: two different customer cookies, and a signed-out request, after a warm-up never see each other's output;
   - (j) a sign-up that fails after the user insert (forced failure of the account or session insert) leaves **no orphan `customer_users` row**; record whether Better Auth 1.7.10 wraps the writes in one transaction. If it does not, the sign-up path deletes the half-created user (Edge Cases) and step 4 gets the matching integration test.

   Record each answer in "Spike results". Minor deviations (an option name) are fixed in the spec; a decision-changing one (cookies or sessions leak between instances, or two instances cannot coexist) stops and goes back to the product owner.

### Phase 1: Customer accounts and role separation

2. **Core:** `CUSTOMER_ROLES` / `isCustomerRole`. *Unit tests.*
3. **Schema:** five `customer_*` entities matching the spike's SQL column by column, registered in `entities/index.ts`; `npm run db:migration:create` (`customer_auth`), reviewed and committed. *Integration:* the drift test; the tables and `check (role = 'customer')` exist (a direct insert of `role = 'owner'` fails); migration up → down → up.
4. **Factory, env and wiring:** `CUSTOMER_AUTH_SECRET` in `env.ts` and `.env.example` (A6), `create-customer-auth.ts`, the shared auth-handler helper extracted from `sign-in.ts`, `customerAuth` + `getCustomerAuth()` in `container.ts`, `app/api/customer-auth/[...all]/route.ts`, the e2e global setup passing a per-run `CUSTOMER_AUTH_SECRET`. *Unit:* `parseEnv` accepts an unset value in development and test, rejects a value shorter than 32, and in production rejects both a missing value and one equal to `BETTER_AUTH_SECRET`; the options (secret with its fallback, base path, cookie prefix, model names, `role` `input: false` and default, sign-up enabled, cookie cache off, rate-limit rules and IP header fallback); the route re-export. *Integration (Testcontainers):* sign-up creates a `customer` and a session; `role: "owner"` in the body never yields an owner; sign-in; wrong password and unknown email identical; sign-out deletes the row; with a trusted IP header the 6th sign-in or sign-up per IP within a minute gets 429, and without one the 21st in the shared bucket does (both modes, as in the admin-auth tests); the disabled paths (`/update-user` with `role`, `/change-email`, `/list-sessions`) answer 404 and change nothing; a spoofed `X-Forwarded-For` does not reset it; a foreign `Origin` is refused; two concurrent requests with different customer cookies each see their own customer; **revocation:** after deleting the `customer_sessions` row directly, the next request with the same token gets no session; a failed sign-up leaves no orphan `customer_users` row (spike j).
5. **Cross-role integration tests** (`customer-auth.int.test.ts`): `getCurrentAdmin` with only a customer cookie → null; `getCurrentCustomer` with only an owner cookie → null; token swapped between cookie names → null in both directions; owner and customer cookies together → each guard sees only its own principal.
6. **Guard module and inventory:** `require-customer.ts` and the extended `admin-guard-inventory.test.ts` (rules and fixtures listed in Architecture). *Unit:* headers passed explicitly; no session → redirect / `UnauthorizedError`; an owner-shaped or non-customer session → null; `getSession` throws → propagates from `getCurrentCustomer` / `requireCustomer*`, while `getCurrentCustomerId` logs and returns `{ status: "error" }` (never `none`); `toOrderViewer` maps `customer`, `none` and `error`; `customerApiHandler` calls `connection()` outside `apiHandler`.
7. **Actions and pages:** `customer-auth.action.ts`, `customer-sign-in.ts`, `customer-sign-up.ts`, `/account/sign-up`, `/account/sign-in`, `/account` (guard, then redirect), `/account/orders` (in this phase only the guarded shell with the signed-in email, "Sign out" and the empty state "You have no orders yet.", which is true because no order carries `customer_id` before Phase 2; no use case or query yet), the header link (A21), the checkout "Sign in" link (A16). *Unit:* action error mapping (A9 single message, 429, unavailable), redirect never inside `try`, fixed `from` code only, sign-up forwards only email, password and the fixed name; each view in every state. *E2E (`customer-auth.e2e.test.ts`):* register through the UI → "My orders" empty state; sign out → `/account/orders` redirects to sign-in; sign in again; wrong password → generic alert.
8. **Role-separation e2e (`customer-roles.e2e.test.ts`):** with a customer session: `/admin` → `/admin/sign-in`, `GET /api/admin/me` → 401, an admin server action posted with the customer cookie → redirect to sign-in and no change; with the owner session (`useOwnerSession`): `/account/orders` → `/account/sign-in`, `GET /api/account/orders` → 401. The global setup creates customers A and B over HTTP (random passwords per run, `inject()`), provides their cookies, and a `useCustomerSession(browser, "a" | "b")` helper reuses them.

### Phase 2: Account orders and isolation (2a: steps 9, 10 and the viewer and admin-label parts of 11–12; 2b: the rest)

9. **Schema:** `orders.customer` (nullable, `restrict`), index `(customer_id, created_at)`, migration `orders_customer`. *Integration:* drift; FK rejects an unknown customer id; deleting a customer with orders is refused; migration up → down → up with **guest-only** orders present (data intact); with at least one account order, `down` raises the D-d exception and the column, FK, index and data are unchanged.
10. **Core:** `order-access.ts` (`canViewOrder`), `OrderRecord.customerId`, `PlaceOrderCommand.customerId`, A15 fingerprint, required `viewer` on `GetOrderByReferenceUseCase` and `ConfirmDemoPaymentUseCase`, `ListCustomerOrdersUseCase` (cap 50, `capped`), `GetCustomerOrderUseCase`, `CustomerOrderDto` mapping, `placedWithAccount` in admin DTOs. *Unit (in-memory repository fixture):* guest order + any viewer → visible; account order + owning customer → visible; + another customer or a guest viewer → `NotFoundError` with the unknown-reference message; `confirmDemoPayment` by a foreign viewer gives the unknown-reference `NotFoundError` on a pending, an already **paid** and a **cancelled** order alike, and never calls the gateway or `markPaid`; a form replayed by another principal → `form_reused` on both the fast path and the post-failure lookup, also when the fingerprint matches but the stored `customer_id` differs (A15 column check), and the error carries no field of the original order; the use case never reads a customer id from `request`.
11. **Repository:** `placeOrder` writes `customer_id` inside the existing transaction; `listForCustomer`, `findForCustomer`; admin repository `placedWithAccount`. *Integration (`database-order-repository.int.test.ts`, the isolation test):* two customers with two orders each plus a guest order; `listForCustomer(A)` returns exactly A's two, newest first; `findForCustomer(A, orderOfB)` → null and `findForCustomer(A, randomUuid)` → null (same result); guest orders appear in no list; **idempotency across principals** (`PlaceOrderUseCase` over the real repository): an order placed by A, then the same idempotency key and request submitted as B and as a guest → `ConflictError`, exactly one order, stock decremented once, and the error has no field of A's order; the stock decrement and snapshot behaviour is unchanged (existing tests pass untouched).
12. **Presentation:** `placeOrder` and `confirmDemoPayment` pass the session principal; `load-order-page.ts` passes the viewer; not-found hint line; `/account/orders` and `/account/orders/<id>` pages; `GET /api/account/orders[/<id>]`; checkout email prefill; admin "Account order" / "Guest order" label. *Unit:* the actions without a session still place guest orders; with a customer session they pass its id and ignore any `customerId` form field; `load-order-page`, `placeOrder` and `confirmDemoPayment` take the viewer from `getCurrentCustomerId()` (asserted with a mocked guard, so a literal `{ customerId: null }` cannot slip in); **A24:** with `getCurrentCustomerId()` returning `error`, `placeOrder` returns the recovery state and never resolves the use case, the same form with `checkoutAs=guest` places a guest order without reading the session, and any other `checkoutAs` value is a validation error; `load-order-page` and `confirmDemoPayment` on `error` treat account orders as not found and serve guest orders; an inventory rule requires every file that calls `getOrderByReferenceUseCase` or `confirmDemoPaymentUseCase` to import `require-customer`; each route handler (401, 404 for malformed, unknown and foreign ids with an identical body, 200); views in every state (including the A24 banner). *Integration (app, Testcontainers):* with the customer instance's `getSession` made to throw during `placeOrder`, the `orders` table and stock are unchanged (no order saved as a guest); the explicit guest resubmission then stores one order with `customer_id` null.
13. **Isolation e2e (`customer-isolation.e2e.test.ts`, A↔B):** A and B (setup cookies, separate browser sessions) each buy one product while signed in.
    - **Page:** A opens `/account/orders/<id of B>` → "Order not found", and the page contains neither B's reference nor B's product; A's list shows only A's order.
    - **API:** A's `GET /api/account/orders/<id of B>` → 404 with the same body as a random uuid and as a malformed id (`not-a-uuid`); A's `GET /api/account/orders` lacks B's order.
    - **Cache isolation (A23), both directions:** A opens A's order page, pay page and "My orders" (warm-up), then B opens the same URLs and B's own, and the reverse; each sees only their own data or "not found". Then, in **one browser context**, A signs out and B signs in: `/account/orders` and the header show B's state, never A's, and A's `/orders/<ref>` answers "not found".
    - **Public paths:** A opens `/orders/<ref of B>` and `/checkout/pay/<ref of B>` → not found; a browser without any session too.
    - **Action:** A opens A's own pay page, replaces the hidden `reference` with B's (`evaluate`), submits → not-found error; B's order is still `pending_payment` when B opens it.
    - **Guest regression:** the existing `checkout.e2e` and `purchase.e2e` suites pass unchanged (guest order by reference, demo payment, confirmation).
    - **Owner view:** the owner sees A's order as "Account order" in `/admin/orders`, with no account fields beyond the order's own snapshot.
14. **Purchase e2e extension:** signed-in purchase → pay → confirmation → the order appears in "My orders" with status "Paid".

### Phase 3: Documentation and certificate evidence

15. **Docs:** AGENTS.md (two roles; `require-customer.ts` as the mandatory guard for the account area; the no-crossing inventory rule; the customer instance in the stack table), README (customer accounts, the A4 and A9 limitations, how e2e creates customers), BACKWARD_COMPATIBILITY.md (new URLs, `/api/customer-auth/*`, `/api/account/orders[/<id>]`, the two tables and the column, the A2 behaviour of reference URLs for account orders), `.ai/security-notes.md` (public sign-up, rate limits and the shared-bucket DoS without a trusted IP header, the accepted enumeration risk with the raw endpoint's recorded response from spike f, the separate secret A6), README env table and BACKWARD_COMPATIBILITY §4 (`CUSTOMER_AUTH_SECRET`), the README deployment note (set `AUTH_TRUSTED_IP_HEADER` in any public deployment, now for customer sign-in and sign-up too), `.ai/lessons.md` if anything surprised us. Move this spec to `implemented/`.

Every step keeps `npm run test:coverage` at 100% with **no new coverage exclusion**; page logic lives in colocated `.ts` loaders.

## 🧪 Test plan (authorization summary)

| Proof | Level | Where |
| --- | --- | --- |
| Customer A cannot read B's order by id (repository and use case) | integration | step 11 |
| A cannot read B's order by reference or pay it (core rule) | unit + integration | steps 10, 11 |
| A↔B on page, API, public paths and the payment action | e2e | step 13 |
| A customer session is not an admin session (pages, API, actions) | integration + e2e | steps 5, 8 |
| The owner session is not a customer session | integration + e2e | steps 5, 8 |
| Tokens do not cross cookie names | spike + integration | steps 1, 5 |
| No request yields an owner from sign-up (action, handler, DB check) | unit + integration | steps 3, 4, 7 |
| Every account and admin entry point calls its own guard, and never the other's | unit (inventory) | step 6 |
| Every session-dependent path behaves correctly with no session, the wrong role and a session-read failure (the inventory alone proves only imports) | unit + integration | steps 4–7, 12 |
| A replayed checkout form never returns another principal's order | unit + integration | steps 10, 11 |
| A session-read failure never saves a signed-in customer's order as a guest order | unit + integration | step 12 |
| A deleted session row is unauthenticated on the next request | integration | step 4 |
| Malformed, unknown and foreign order ids are indistinguishable | unit + e2e | steps 12, 13 |
| No cached render leaks between customers or after sign-out | spike + e2e | steps 1, 13 |
| `CUSTOMER_AUTH_SECRET` required and distinct in production | unit | step 4 |
| Guest checkout unchanged | e2e regression | step 13 |
| Migrations up and down; Phase 2 `down` refuses with account orders | integration | steps 3, 9 |

## 📝 Spike results

_Filled in after Phase 0._

## Recenzja innym modelem

Reviewers: **Gemini** and **ChatGPT**, 2026-10-24, run manually by the product owner with the same prompt (`e07-cross-model-review-prompt.md` in the author's scratchpad: a staff-level security and architecture review of the pre-review spec text, no repository access). The reviewers' full replies are on file in [`research/reviews/2026-10-24-customer-accounts-cross-model.md`](research/reviews/2026-10-24-customer-accounts-cross-model.md). Each finding was checked against the spec text before a verdict; "already covered" points to the line of the pre-review version (commit `259b8bf`). The owner's binding decisions on the open points are **D-a** (separate customer secret), **D-b** (A9 enumeration accepted), **D-c** (session-read failure is not "no session") and **D-d** (Phase 2 `down` refuses with account orders).

Totals: **18** rows (14 findings, with Gemini #3 split into two parts, plus 3 author questions): **12 accepted**, **5 accepted in part**, **1 rejected**.

| # | Reviewer | Finding (short) | Severity (as given) | Verdict | Reason | Where changed |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Gemini | An idempotency key replayed by another principal could return the original order | Critical | accepted in part | Already covered: A15 (pre-review line 31) folds the principal into the fingerprint, and the cart spec returns a `ConflictError` with no other order's data on a fingerprint mismatch. Sharpened: the duplicate lookup also compares the stored `customer_id` (`is not distinct from`), the error carries no field of the original order, and an integration test is added | A15; Data flow 2; Edge Cases; steps 10, 11; Test plan |
| G2 | Gemini | A revoked session may stay valid (cookie cache) | High | accepted in part | Already covered: A8 (pre-review line 24) turns the cookie cache off. Sharpened: the explicit `session.cookieCache: { enabled: false }` option and an integration test that deleting the `customer_sessions` row unauthenticates the next request; session-read errors per D-c | A8; Architecture (`create-customer-auth.ts`); Edge Cases; step 4; Test plan |
| G3a | Gemini | Malformed id answers 400, unlike 404 for unknown or foreign | High | accepted | The page already answered "not found" for a malformed id (A11, pre-review line 27) but the API contract said `400` (line 185): an inconsistency. Now the same 404 body on page and API | AC4; A11; A12; API Contracts; Edge Cases; steps 12, 13; Test plan |
| G3b | Gemini | Timing attack distinguishing foreign from nonexistent ids | High | rejected | Ids are random UUIDs with no enumeration value; the 404 body is already identical; both cases are one indexed lookup filtered by `customer_id`, so a constant-time SQL path would add complexity without a meaningful gain | none |
| G4 | Gemini | Shared signing secret between the two instances | Medium | accepted | Owner decision D-a | A6; Proposed Solution; Architecture; API Contracts (Env); Risks; spike c; step 4; step 15; Test plan |
| G5 | Gemini | `on delete restrict` on `orders.customer_id` is undocumented | Medium | accepted | Documentation only: restrict is intentional; account deletion is out of scope (N06); a future erasure anonymises `customer_users` instead of deleting rows | Data Model |
| G6 | Gemini | A failed sign-up may leave an orphan `customer_users` row | Medium | accepted | Better Auth's transactional behaviour is not stated in the spec and must be measured | spike j; Edge Cases; step 4 |
| GQ1 | Gemini (question) | Email edited at checkout: which account gets the order? | – | accepted | The session's account; the typed email is the order snapshot only. Stated explicitly | A16; Edge Cases |
| GQ2 | Gemini (question) | Two `nextCookies()` instances in one request | – | accepted in part | Already covered in part: spike d (pre-review line 259) checks coexistence and independent sign-out. Sharpened: both instances' `Set-Cookie` headers in the same request must both survive | spike d; Risks |
| C1 | ChatGPT | "Fail closed to guest" silently turns a signed-in customer into a guest on a session-read error | High | accepted | Owner decision D-c: tri-state result; checkout stops and offers an explicit choice; public pages treat errors like no session | A24 (new); Architecture (`require-customer.ts`, storefront paths); Data flow 1; API Contracts; UI/UX; Edge Cases; steps 6, 12; Test plan |
| C2 | ChatGPT | Phase 2 `down` after account orders exist reopens them by reference | High | accepted | Owner decision D-d: `down` raises when any order has a non-null `customer_id` | Data Model (migrations, rollback plan); Edge Cases; step 9; Test plan |
| C3 | ChatGPT | With `cacheComponents` on, session-dependent pages could be served from cache to another user | High | accepted | A21 covered only the header; the rule now covers every session-dependent page, loader and API, with spike and e2e proof | A23 (new); Architecture; Edge Cases; spike i; step 13; Test plan |
| C4 | ChatGPT | A6 and A9 still awaiting confirmation | Medium | accepted | Owner decisions D-a and D-b; ⚠ marks and the status line removed | Header; Decisions intro; A6; A9 |
| C5 | ChatGPT | Shared 20/min rate-limit bucket without a trusted IP header is a global DoS | Medium | accepted | Kept as a documented limitation (trusting a forgeable header is worse); a public deployment must set `AUTH_TRUSTED_IP_HEADER`. The README already says so for owner sign-in (Known limitations); extended to customer sign-in and sign-up. The spoofing test stays | A10; Risks; step 15 |
| C6 | ChatGPT | Malformed id 400 versus 404 | Medium | accepted | Same as G3a | see G3a |
| C7 | ChatGPT | The guard inventory proves an import, not an invocation | Medium | accepted | The inventory is now explicitly complementary; behaviour tests cover no session, wrong role and session-read failure on every session-dependent path | Architecture (guard inventory); Test plan |
| C8 | ChatGPT | The raw sign-up endpoint reveals existing accounts | Medium | accepted in part | Already covered: A9 (pre-review line 25) listed it as limitation (2). Owner decision D-b accepts the risk; the spike records the raw endpoint's real status and body | A9; spike f; Edge Cases; Risks; step 15 |
| CQ3 | ChatGPT (question) | Which secret-using mechanisms does the spike check under a shared secret? | – | accepted in part | Moot after D-a (no shared secret in production); spike c still proves tokens do not cross instances | A6; spike c |

## 📝 Review log

- **2026-10-24:** draft written from the D11 drafts and the product owner's answers P1–P5.
- **2026-10-24, fresh-context spec review (Claude, independent agent):** 8 findings, no Critical; all applied: disable every customer-auth library path except the four used (A1, spike h, tests); ownership check before any status branch in the payment use case (paid and cancelled cases tested); A9 limited to the action, the raw-endpoint duplicate error recorded as a limitation; Phase 2 split into 2a (rules, no-op) and 2b (attach and show); `getCurrentCustomerId` fails closed to a guest viewer (superseded by A24 after the cross-model review); unit and inventory checks that public paths pass the session viewer; rate-limit tests in both modes; the rollback note made explicit with a forward-only policy.
- **2026-10-24, cross-model review (Gemini and ChatGPT, run manually by the product owner):** 18 items, 12 accepted, 5 accepted in part (already covered, wording sharpened), 1 rejected (timing attack on order ids); table in "Recenzja innym modelem". Product owner decisions applied: **D-a** own `CUSTOMER_AUTH_SECRET` (A6, new env variable), **D-b** sign-up enumeration accepted (A9), **D-c** session-read failure distinct from no session, explicit checkout choice (new A24, replacing "fail closed to a guest viewer"), **D-d** Phase 2 `down` refuses with account orders. Also added: A23 (session-dependent reads never cached), the A15 `customer_id` check, malformed id → 404 everywhere, cookie cache and revocation test, `on delete restrict` rationale, spike items i and j, behaviour tests beside the guard inventory.
