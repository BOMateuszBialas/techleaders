# Retrofit the admin area to the design system (lesson 08, area 3)

- Backlog: none yet. File the phases with `om-backlog` after the owner approves this spec.
- Status: **ready for the owner to merge (design-only PR; no application code changed; owner approved OA-1 to OA-9 and all recommended options on 2026-10-26)**. Written on 2026-10-26 against `origin/main` at `59cfc48`. The owner's decisions it relies on are recorded in `.ai/design/POSTEP.md` (sections "Decyzje zatwierdzone przez właściciela", "Etap 2, partia 1–4", "Decyzje właściciela (2026-10-25)") and `.ai/design/tokeny.md` (section 8, 2026-10-24).
- Risk: **risk-high** for the implementation (the shell `layout.tsx` wraps every admin page; the order and category destructive flows change; SDLC: "shared contract surfaces, or broad cross-cutting edits"). Every phase is its own `risk-high` PR, so the owner merges it (agent merge policy) and no self-QA is allowed.
- Design authority: `.ai/design/tokeny.md` (sections 1b, 1c, 3 admin density, 4 admin text styles, 7 rules 2, 4, 5, 10, 12, 13, 14), `.ai/design/referencje.md` (R04.1 to R04.3, K7), `.ai/design/audyt.md` (decisions 3 and 5), `.ai/design/POSTEP.md` (batches 1–4 B-items), `packages/app/stories/design-system/WhatIsMissing.mdx` (section 2 rows for E03/E04, section 4 P list), `ENGINEERING_STANDARDS.md`, `SDLC.md`, `AGENTS.md` ("Security and validation", admin guard rules, "Admin forms are a hook-free view").
- Implemented specs changed by this retrofit (doc updates only, in the phase that changes the behaviour text): `.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md` (UI/UX "Cancel / refund confirmation", line 255) and `.ai/specs/implemented/2026-10-15-admin-catalog-management.md` (G1 and the delete flow).
- Baseline: `packages/app/src/app/admin/` and `packages/app/src/components/admin/` as they are on `main`.

## 📝 TLDR

The admin is the third area of lesson 08 after the storefront and checkout. It works and is guarded, but its screens still hand-build what the design system now provides: raw `<select>` and checkbox markup, a hand-written period nav with a `bg-primary/90` hover, a light sidebar without a current-page mark, bare "Loading…" text, empty states that print a developer command, a one-click category delete and a checkbox-plus-button for cancel and refund. This spec turns the admin into six shippable phases (shell, dashboard, products and categories, stock and CSV import, orders, states and close-out), each one PR, each one using the compact admin density (`data-density="admin"`, already set in `layout.tsx:16`). Presentation only: no guard, server action, use case, port, entity, migration or environment variable changes. The two destructive flows the owner already approved on 2026-10-25 (Q5, Q6) become Alert dialogs.

## 📝 Decisions and assumptions

| # | Decision | Source | How this spec builds it |
|---|---|---|---|
| D1 | Presentation only. Admin guards (`requireAdminPage`, `adminApiHandler`, `runAdminAction`), server actions, use cases, ports, entities, migrations and env stay unchanged | AGENTS.md "Security and validation"; task brief | Every phase has a diff check (A2). `admin-guard-inventory.test.ts` stays green (A1) |
| D2 | Compact admin density: control `sm` 28 px, `md` 32 px, `lg` 36 px from 768 px; 44 px below 768 px. Table row 44 px. Text 14/20 in tables and forms | tokeny.md section 3 (density table), R04.3, K7, WCAG 2.5.8 | Use the DS `Button`, `Input`, `NativeSelect`, `Checkbox`, `Table` and the `data-density` scope already in `layout.tsx:16`. No raw heights (A3) |
| D3 | Neutral primary button (`--primary`, graphite). Red only as a meaning: destructive text and outline, status badges, errors. No `--action` in admin | tokeny.md section 7 rules 2 and 4; R04.2; K7 | `Button` `default` for main actions, `outline` and `ghost` for the rest; `destructive` as text and outline (B2.16) |
| D4 | Dark admin sidebar: `--sidebar` surface, `--sidebar-primary` (red) only as the 3 px current-page marker | tokeny.md section 1b (`--sidebar*`, R04.1, R04.2); audit "Rama admina" | Phase 1 (`layout.tsx:17`, nav block) |
| D5 | Status badges follow the status map (rule 10): `pending_payment` = warning, `paid` = success, `processing` = secondary, `shipped` = outline with strong text, `cancelled` = destructive, `refunded` = outline. Status is never colour alone | tokeny.md section 7 rule 10 (P2, accepted in the tokeny decision list) | Phase 5 (`order-badges.tsx`) |
| D6 | Cancel, refund and category delete use `AlertDialog` (title names the object, `Cancel` or `Keep order` as the safe choice, the action is `destructive`, never `action`). The server's `confirm=yes` check stays, carried by a hidden field | Owner decisions Q5 and Q6 (2026-10-25, `POSTEP.md`); B4.14, B4.16 | Phases 3 and 5. Alert dialog contents stay in hook-free views |
| D7 | Empty states name what happened and the next step as a control. No developer command in the UI | B3.23; WhatIsMissing P11 (open, see the P list) | Phases 2, 3, 5 (copy to approve, see OA-5) |
| D8 | Demo labelling of fictional data stays exactly as it is: `DEMO-` order references, the demo badge, the fictional-customer note, the demo labels on the dashboard and on Copilot. Demo uses `--demo` (`demo` variant), never `--warning` | AGENTS.md rule 6; spec D08 (`.ai/specs/2026-10-13-commerceos-mvp.md`); tokeny rule 11 | Phases 2 and 5 touch the demo notes only for their class names. Their text stays |
| D9 | Forms use `Field` (label, hint, error, `aria-invalid`, `aria-describedby`) and the DS `Alert` for form-level messages. `form-feedback.tsx` is retired when its last user is migrated | B2.18, B2.24 (`Field` and `FormMessage`, POSTEP batch 2); audit decision 5 | Phases 3 and 4. Phase 6 removes the file if nothing imports it |
| D10 | Copilot is out of this spec (its own L08 phase). The storefront shell, storefront `error.tsx`, the megamenu and the cart drawer are out (storefront spec) | Course plan "Faza 5 – L08" (phases: storefront, checkout, admin, Copilot) | Section "Non-goals" |
| D11 | The e2e suites keep their journeys. Selectors change only where the markup changes (listed per phase), and each change is in the same PR | `packages/app/e2e/admin*.e2e.test.ts` | Test plan |
| A-1 | The admin `error.tsx` keeps its copy ("Something went wrong", "Try again") and moves into the DS `ErrorState` | B3.24 (batch 3 Q4 resolved: component) | Phase 1 |
| A-2 | Focus moves to the first invalid field after a failed submit. This is a client-wrapper effect; the view stays hook-free | tokeny rule 13; audit decision 5 | Phases 3 and 4 (wrapper only) |

## 📝 Problem Statement

The admin was built before the design system and was never retrofitted. Its state on `main` (checked in this spec pass, not copied from the audit):

- **The audit's palette list is stale, and this is good news.** The audit listed 11 hard-coded values (`audyt.md` section 3). On `main`, no admin file still contains `amber-`, `emerald-` or `red-` classes; the warning, success and demo colours already use tokens (`text-warning` in `category-form-view.tsx` and `product-form-view.tsx`, `text-success` in `form-feedback.tsx:17` and `redirect-notice.tsx:18`, `border-demo bg-demo-surface` in `orders/[id]/page.tsx:89` and `order-badges.tsx:26`). The remaining raw styles are listed in the file tables.
- **Forms are hand-built.** Every product field is `Label` + `Input` + `FieldError` + `fieldA11y` (from `form-feedback.tsx:31–47`), not `Field`. The category `<select>` and status `<select>` are raw (`product-form-view.tsx:163`, `:219`). The "Featured" checkbox is a raw `<input type="checkbox" className="size-4 accent-primary">` (`:202–206`). The product input at `:64` is a copy of the old `Input` class string with `h-8`, `text-base` and `ring-ring/50`.
- **Navigation.** The sidebar is light (`bg-muted/40`, `layout.tsx:17`). The links carry no `aria-current`, and the layout is static so it cannot know the current page without a client component. The period nav on the dashboard is hand-written links with `bg-primary` and `hover:bg-primary/90` (`dashboard-view.tsx:153–164`), which is the colour-only state rule 14 forbids.
- **States.** Every `<Suspense>` fallback is bare text ("Loading orders…", `orders/page.tsx:47`, and 13 others). The admin `error.tsx` is bespoke markup (`role="alert"` on a wrapper). Empty states are plain paragraphs (`products/page.tsx:60`, `order-copy.ts:24–25`, `dashboard-copy.ts:30`), and the dashboard and orders copy tell the owner to run `npm run db:seed`.
- **Destructive flows.** Cancel and refund use a required native checkbox plus a button (`order-status-form-view.tsx`, the transition map and the `needsConfirmation` branch). Deleting an empty category is one click with no confirmation (`delete-category-view.tsx:56`, `variant="destructive"`).
- **Tables.** The stock history is an `<ol>` (`stock-panel-view.tsx:86`), not a table (B3.5 says `Table`). The dashboard and orders tables already use `Table` with numbers right-aligned.

The owner has accepted the target (tokens 2026-10-24, batches 1–4, decisions Q5 and Q6 on 2026-10-25). What is missing is the retrofit of the screens, which this spec plans.

## 📝 Non-goals

- Copilot screens (`components/admin/copilot/*`, `app/admin/(protected)/copilot/*`). They are the fourth L08 phase and get their own spec.
- The storefront, the megamenu, the store `error.tsx`, the cart drawer and the photo work (storefront v2 spec, and the store retrofit).
- Any behaviour change: no new fields, no new statuses, no new transitions, no new metrics, no change to stock rules, order transition rules (`packages/core/src/domain/orders/order-status.ts`), price or stock validation, CSV parsing or import semantics.
- Changing `METRIC_DEFINITIONS`, the demo labelling (D8) or any seed data.
- The admin sign-in flow's behaviour (Better Auth, rate limit, origin check). Only its markup is in scope if OA-7 is approved.
- A new Menu (action menu), Popover, Switch or Toast. The rows have no actions (batch 4 Q1); a count of one trigger per row does not justify a menu.
- Money and date formats (WhatIsMissing P12). The admin keeps today's formats.
- Image upload, photo management, the product gallery (P1 image upload stays out).
- A change to the design tokens (`globals.css`) unless the P21 fix is approved separately.

## 📝 Existing rules this changes (owner approval needed)

| # | Existing rule | Where it is written | What changes | Phase |
|---|---|---|---|---|
| C1 | Cancel and refund need a required checkbox (`#confirm-cancelled`, `#confirm-refunded`) inside the status form | `.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md` UI/UX "Cancel / refund confirmation" (line 255); `order-copy.ts:73–89`; e2e `admin-orders.e2e.test.ts:144` | Alert dialog with the same copy as its description. The server check (`confirm=yes`) stays. The spec row is updated in phase 5. Owner decision Q5 (2026-10-25) | 5 |
| C2 | Empty category: one click deletes it, no confirmation (G1 says the category delete needs no dialog) | `.ai/specs/implemented/2026-10-15-admin-catalog-management.md` G1 and the delete flow (lines 39, 75: a confirm dialog was refused only for a category that still has products) | Alert dialog for empty categories; a used category keeps the refusal and gets no dialog. Owner decision Q6 (2026-10-25). The catalog spec row is updated in phase 3 | 3 |
| C3 | Admin sidebar is light (`bg-muted/40`) | `layout.tsx:17`; token decision R04.1 in `tokeny.md` 1b (accepted 2026-10-24) | Dark sidebar (`--sidebar*`). A visual change the owner already decided | 1 |
| C4 | Stock history is a list (`<ol>`) | `stock-panel-view.tsx:86`; e2e `admin-stock.e2e.test.ts` (`ol[aria-label="Stock history"]`) | A `Table` (B3.5). The e2e selector changes in phase 4 | 4 |
| C5 | Empty-state copy tells the owner to run `npm run db:seed` | `dashboard-copy.ts:30`, `order-copy.ts:25` | Plain next step. Needs approval of the copy (P11, OA-5). The developer command stays in the README | 2, 5 |
| C6 | Status badges: `paid` and `processing` share one variant | `order-badges.tsx:5–12`; audit "Statusy zamówień" | Variant per D5. Text unchanged | 5 |
| C7 | Period nav active state uses `bg-primary` with `hover:bg-primary/90` (state by colour and opacity) | `dashboard-view.tsx:153–164`; tokeny rule 14 | `TabsNav` with `aria-current`. The `TabsNavLink` state is the DS one | 2 |

No rule about access, data, stock, order transitions or demo labelling changes.

## 📝 Affected packages and modules

Only `packages/app` changes, and only in these folders. Nothing else is in the diff of any phase. Each phase PR lists its files in its description.

| Area | Files (current, on `main`) | Change |
|---|---|---|
| Shell | `packages/app/src/app/admin/(protected)/layout.tsx`, `error.tsx`, `not-found.tsx`; `packages/app/src/app/admin/sign-in/page.tsx` (only if OA-7) | Phase 1 (+ phase 6 for sign-in) |
| Dashboard | `packages/app/src/components/admin/dashboard/dashboard-view.tsx`, `dashboard-copy.ts`; `app/admin/(protected)/page.tsx` | Phase 2 |
| Products and categories | `components/admin/products/product-form-view.tsx`, `product-form.tsx` (wrapper only), `description-draft-panel-view.tsx`, `publish-control-view.tsx`, `image-preview-view.tsx`, `product-badges.tsx`, `components/admin/categories/category-form-view.tsx`, `delete-category-view.tsx`, `delete-category-form.tsx` (wrapper only), `category-copy.ts`, `product-copy.ts`; `app/admin/(protected)/products/*`, `categories/*` | Phase 3 |
| Stock and import | `components/admin/products/stock-panel-view.tsx`, `product-import-view.tsx`, `product-import-form.tsx` (wrapper only), `app/admin/(protected)/products/import/page.tsx` | Phase 4 |
| Orders | `components/admin/orders/order-badges.tsx`, `order-status-form-view.tsx`, `order-status-form.tsx` (wrapper only), `order-copy.ts`; `app/admin/(protected)/orders/page.tsx`, `orders/[id]/page.tsx`, `orders/load-orders.ts` (not changed) | Phase 5 |
| Shared | `components/admin/form-feedback.tsx` (retired), `redirect-notice.tsx`; `components/ui/*` (unchanged: only the DS components listed in the decisions are used) | Phases 1–6 |
| Storybook | `packages/app/stories/design-system/Epic*.mdx` (E03, E04 pages), `WhatIsMissing.mdx` (rows removed as they ship), new `packages/app/stories/patterns/admin/*` (see "Storybook") | Each phase updates its pages |
| Tests | `components/admin/**/*.test.ts`, `app/admin/**/*.test.ts`, `packages/app/e2e/admin*.e2e.test.ts` | Each phase |
| Docs | the two implemented specs (C1, C2), `.ai/design/POSTEP.md` (stage record), `WhatIsMissing.mdx` | Phase where the behaviour text changes; phase 6 closes the record |

Not touched in any phase: `packages/core`, `packages/database`, `packages/ai`, `packages/app/src/server/**` (guards, actions, `run-admin-action.ts`, `require-admin.ts`, `load-*.ts`), `packages/app/src/app/globals.css` (tokens), `components/ui/*` (no DS change; a DS change needs its own approval), migrations, env.

## 📝 Proposed Solution

### Component decisions (what the admin uses)

| Need | DS component | Rule it follows | Notes |
|---|---|---|---|
| Label, hint, error, `aria-invalid`, `aria-describedby` | `Field`, `FieldDescription`, `FieldError` (`components/ui/field.tsx`) | B2.11, B2.24, D9 | Replaces `Label`+`Input`+`fieldA11y`+`FieldError` (form-feedback.tsx) |
| Text input, search | `Input` (`components/ui/input.tsx`) | tokens 1b `--input` (3,66 : 1 light) | Replaces the raw class string at `product-form-view.tsx:64` |
| Category, status select | `NativeSelect` (`native-select.tsx`) | B2.4, Q1 (native, works without JS) | Replaces `product-form-view.tsx:163` and `:219` |
| Featured checkbox | `Checkbox` (`checkbox.tsx`, Base UI) | B2.8, B2.9, Q2 | Replaces `product-form-view.tsx:199–208`; the e2e click by `id` changes (C4 note) |
| Form-level result | `Alert` `destructive` with `role="alert"` (error) or `success` with `role="status"` (success); `warning` for slug and draft notes without a role | B2.18 (role chosen by the place of use), B2.20 | Replaces `FormMessage` (form-feedback.tsx:6–20) and the inline warnings (`product-form-view.tsx:114`, `category-form-view.tsx:64`, `description-draft-panel-view.tsx:92`) |
| Main action | `Button` `default` | tokens 7 rule 4, `--primary` | Save, Publish, Add, Apply |
| Secondary action | `Button` `outline` / `ghost` | B2.16 | Sign out, Start over, Import |
| Destructive action | `Button` `destructive` (text and outline) inside `AlertDialog`; the trigger is `destructive` too | B4.14, tokens 7 rule 5 | Cancel order, Record refund, Delete category |
| Destructive confirmation | `AlertDialog`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogCancel`, `AlertDialogAction` (`alert-dialog.tsx`) | B4.14, B4.15, P6 | Title names the object; Cancel = "Keep order" for an order, "Cancel" for a category |
| Status | `Badge` with `success`, `warning`, `destructive`, `demo`, `secondary`, `outline` (`badge.tsx:18–27`) | B2.16, tokens 7 rule 10 | `order-badges.tsx` and `product-badges.tsx` map to the variants |
| Table | `Table`, `TableCaption` (sr-only or visible), `TableHead`, `TableCell` (`table.tsx`) | B3.5, B3.9, B3.10 | Dashboard, products, categories, orders, import preview, stock history (phase 4) |
| Period and view switch | `TabsNav`, `TabsNavLink` (`tabs.tsx`, `aria-current="page"`) | B3.11, batch 3 Q1 | Dashboard periods; the e2e selector `main nav[aria-label="Period"] a[aria-current="page"]` still holds |
| Metric, panel | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | B2.25 (`border`, no shadow, `rounded-card`) | Dashboard metrics; description (definition) visible under the value (batch 4 Q2) |
| Loading | `SkeletonGroup` with a label (`skeleton.tsx`) | B3.16–B3.19 | Every admin `<Suspense>` fallback |
| Page error | `ErrorState` (`error-state.tsx`) | B3.24, batch 3 Q4 | `admin/(protected)/error.tsx` |
| Empty list | `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` (`empty.tsx`) | B3.21, B3.23, P14 | Products, categories, orders, dashboard period |
| Demo note | `Alert` `demo`, no role | B2.18, D8 | Order detail, dashboard note, import (if any) |
| Text link | `TextLink` (`text-link.tsx`, `--link`, underlined in text) | B1.18, P1 | Product names in tables, back link on `not-found.tsx` |
| Collapsed detail | `Disclosure` (native `<details>`) | B3.26, Q5 | Only if a phase needs it (none planned) |

Two DS components are not used by the admin: `Drawer` (cart only) and `NavigationMenu` (store header only).

### Phases

Each phase is one PR, shippable and reviewable on its own. Each one: (a) changes its files and tests, (b) updates its Storybook page(s) and WhatIsMissing rows, (c) runs the gate and the e2e suites it touches, (d) carries the 320 px and 768 px checks for its pages. Each phase stops for review by another model family in a new session (course rule, Faza 5 point 3), then the owner's manual test, then merge.

#### Phase 1: shell, navigation, error and session states (`risk-high`, one PR)

- `layout.tsx:17`: `bg-muted/40` → `bg-sidebar text-sidebar-foreground`; the nav links use `text-sidebar-foreground`, hover `bg-sidebar-accent`, active marker a 3 px `bg-sidebar-primary` bar, focus `outline` with `--sidebar-ring`. Keep `aria-label="Admin"` (e2e). Keep `flex-wrap` on phones (the six links wrap, #56).
- Current page: `aria-current="page"` on the link for the current route. The layout is static (cache components), so this needs a small client component `components/admin/admin-nav-link.tsx` that reads `usePathname()` (presentation hook, allowed outside the form views). Open question Q1.
- The `main` element (`p-4 md:p-8`, after the aside in `layout.tsx`) → `p-4 md:p-6` (admin `--space-gutter` is 16 / 24, tokeny section 3).
- `layout.tsx:59` session fallback "Checking session…" → `SkeletonGroup` with a label. The `AdminSessionBadge` markup uses the DS `Button` `outline` `sm` for sign out (unchanged behaviour).
- `app/admin/(protected)/error.tsx`: the whole file (29 lines) → `ErrorState` with the same title, text and `retry` (A-1). The `role="alert"` moves into `ErrorState`.
- `app/admin/(protected)/not-found.tsx` (14 lines): `Link` with raw `underline` → `TextLink`; the heading uses the admin `h1` style.
- No change to any `*.action.ts`, `requireAdminPage()` call or the session read (inside `<Suspense>`).
- Tests: `layout` has no unit test today; add a unit test for the `AdminNavLink` active state (all routes) and for `ErrorState` mapping; e2e `admin-mobile.e2e.test.ts` checks the nav wraps at 320 px and the sidebar is a column at 768 px.

#### Phase 2: dashboard (`risk-high`, one PR)

- `dashboard-view.tsx:62–77` metric `Card`s stay; the value at `:68` (`text-2xl font-semibold tabular-nums`) → the admin `display` style (24/32, 600, `tabular-nums`, tokeny section 4).
- `:196` grid `gap-4` → `gap-3` (`--space-group-item` 12 px in admin).
- `:153–164` period links → `TabsNav` and `TabsNavLink` (`aria-current` set by the component). Remove `bg-primary` and `hover:bg-primary/90` (C7). `aria-label="Period"` stays.
- `:232–255` top products table: keep `Table` and the sr-only caption; product name `Link` → `TextLink` (B1.18); rows 44 px.
- `:268–295` low-stock table: the badge at `:290` (`variant="outline"`) → `warning` (tokens "Low stock" = warning).
- `dashboard-copy.ts:30` "No orders in this period … run npm run db:seed" → `Empty` with the next step (OA-5, Q2): "No orders in this period. Orders appear here after a checkout." and a link "Open the catalog" or nothing. Demo note `dashboard-copy.ts:59–64` text unchanged; render it as `Alert` `demo` with no role (D8).
- `app/admin/(protected)/page.tsx:27,30` fallbacks "Loading metrics…", "Checking…" → `SkeletonGroup` with labels "Loading metrics".
- Tests: `dashboard-components.test.ts` renders each state (no orders, demo present, low stock empty, low stock present, every period). e2e `admin-dashboard.e2e.test.ts` and `admin-dashboard-range.e2e.test.ts` keep their selectors (verified in this spec pass: they use `main nav[aria-label="Period"] a[aria-current="page"]`).

#### Phase 3: products and categories, forms, feedback, category delete (`risk-high`, one PR)

Products (`product-form-view.tsx`):
- Every `Label`+`Input`+`FieldError` group (`:91–250`) → `Field` with its `FieldError`; the hints (`product-price-hint`, `product-sku-hint`, `product-image-url-hint`, `product-stock-hint`, `product-featured-hint`) → `FieldDescription`. `fieldA11y` retired.
- `:163` and `:219` raw `<select>` → `NativeSelect`.
- `:199–208` raw checkbox → `Checkbox` (B2.8); the hidden `input` for the form value stays with the same `name="featured"`; the `id` is passed through as B2.8 describes.
- `:64` raw input class → `Input`.
- `:114` slug warning (`text-warning` paragraph, linked by `product-slug-warning` in `slugHints`) → `Alert` `warning` without role, linked with `aria-describedby` on the slug field.
- `:254` `FormMessage` → `Alert` (`destructive`, `role="alert"`; `success`, `role="status"`).
- `:256` save button → `Button` `default`, `disabled={pending}` and `aria-busy={pending}` (B1.6, P3).
- `product-form.tsx` (wrapper): add the focus step (A-2): after a failed submit, focus the first field with an error (`aria-invalid="true"`). This is the only hook addition, in the wrapper.

Description draft and publish (`description-draft-panel-view.tsx`, `publish-control-view.tsx`, `image-preview-view.tsx`):
- `:85` panel `rounded-lg border p-3` → `Card` (B2.25).
- `:91` `text-xs` → the admin `small` style (12/16, 500).
- `:92` `DRAFT_WARNING` `text-warning` → `Alert` `warning` without role.
- Publish control stays a `Button` (WhatIsMissing: "the publish control stays a button"). Its heading uses the `h2` style.
- Image placeholder "No image" uses `--muted-foreground` on `--surface-product` (5,65 : 1, tokeny pair 8) or the `Card` surface, not `--muted` (pair 9 is also 5,65 : 1, so either works; the audit's 4,35 : 1 is the old token).

Categories (`category-form-view.tsx`, `delete-category-view.tsx`):
- Name, slug and description (`:41–71`) → `Field`. `:64` slug warning → `Alert` `warning`. `:81` `FormMessage` → `Alert`.
- `delete-category-view.tsx:31–60`:
  - Used category (`productCount > 0`): the usage text, the product list and the refusal hint stay as they are; the refusal is an `Alert` `destructive` without a role (static text). The delete trigger is disabled with the reason above it (Q3, recommended). The server refuses in any case.
  - Empty category: `AlertDialog` with a `destructive` trigger "Delete category". Title "Delete category {name}?", description "This removes the category from the store navigation. It cannot be undone.", buttons `AlertDialogCancel` "Cancel" and `AlertDialogAction` (destructive) "Delete category". The form with the hidden `id` sits inside the dialog (B4.16); `FormMessage` result in the dialog as `Alert` `role="alert"`. The wrapper (`delete-category-form.tsx`) keeps `useActionState`.
  - The trigger's pending text "Deleting…" stays.
- `category-copy.ts:31` `EMPTY_CATEGORIES_MESSAGE` (copy unchanged, it is fine) → `Empty` with a `Button` "New category" (B3.23).
- `categories/page.tsx` list table keeps `Table`; category name → `TextLink`.

Products list (`products/page.tsx`):
- `:60` empty text → `Empty` with "New product" (copy unchanged).
- `:63` `Table aria-label="Products"` keeps its name; row names → `TextLink`; rows 44 px; status badge `success` "Published" or `secondary` "Draft"; stock "Low" uses `warning` (tokens: low stock is warning).

Retired: `form-feedback.tsx` is deleted once `grep -rn "form-feedback" packages/app/src` finds only the redirect helpers, which move to `redirect-notice.tsx` (phase 6 checks it).

Tests and e2e:
- Unit: `product-components.test.ts`, `category-components.test.ts` (which today compares HTML with `form-feedback.tsx`, see the test plan), `description-draft-components.test.ts`, `publish-control` (add if missing). Each view rendered in: idle, error with values kept (P2), success, pending, slug warning, used category, empty category.
- e2e: `admin-products.e2e.test.ts`, `admin-categories.e2e.test.ts`, `admin-product-description-draft.e2e.test.ts`. Selector changes: the "Featured" click by id (the `Checkbox` id), any `text-amber`/`text-emerald` assertions (none expected). New e2e: delete an empty category through the dialog (Escape and Cancel do nothing; confirm deletes; focus returns to the trigger after Cancel).

#### Phase 4: stock panel and CSV import (`risk-high`, one PR)

Stock (`stock-panel-view.tsx`):
- `:6` `FieldError`, `FormMessage`, `fieldA11y` imports → `Field`, `Alert`.
- `:55–56` new quantity `Label`+`Input` → `Field` with its hint; the hidden `expectedQuantity` and `productId` inputs stay (they carry the server's lost-update guard).
- `:73` `FormMessage` → `Alert`; `:75` button `default`, `aria-busy`.
- `:86` `<ol aria-label="Stock history">` → `Table` with caption "Stock history" (B3.5, C4). Columns: date, change (right-aligned, tabular, signed), new quantity (right-aligned), reason. Phone: `overflow-x-auto` region (B3.10) with the change column first.
- Changing the list semantics needs OA-6 approval. e2e `admin-stock.e2e.test.ts` changes `ol[aria-label="Stock history"]` to `table[aria-label="Stock history"]`.

Import (`product-import-view.tsx`):
- `:128–129` file input → `Field` with `FieldDescription` (`product-import-file-hint`); `Input type="file"`.
- `:97–99` "has errors" and "nothing to import" notes: `HAS_ERRORS_NOTE`, `NOTHING_TO_IMPORT_NOTE` → `Alert` `warning` (no role) and `Alert` `info` (no role). The summary "N rows: create, skip, error" (`:173`) → `Alert` `info`.
- `:177–207` preview `Table aria-label="Import preview"` (exists): result cell → `Badge` `success` "Create", `secondary` "Skip", `destructive` "Error" (text stays, B3.5, P17 rule). Per-row error list `ul` at `:205` stays as text in `text-destructive`.
- `:156` "Start over" `Button` `outline`; `:108` and `:145` submit buttons `default`.
- P17: while one import form is pending, the other submit control is disabled. The two forms share one `pending` value in the wrapper (`product-import-form.tsx`).
- Zero rows (a header-only file): `Empty` "No rows in this file. Check that the first line is the header." — with the copy to approve (OA-5).
- `:68` `ul aria-label="Imported products"` (result list) stays a list.
- `products/import/page.tsx:37` fallback → `SkeletonGroup` "Loading import".
- Tests: `product-import-components.test.ts` renders: no file, preview with each outcome, preview with errors, preview with nothing to import, import result, refusal. e2e `admin-product-import.e2e.test.ts` keeps `table[aria-label="Import preview"]`; it adds a 320 px check that the preview table scrolls inside its region, not the page.
- `admin-stock.e2e.test.ts`: history selector changed to the table; adjustment journey unchanged.

#### Phase 5: orders list, detail, status and destructive confirmation (`risk-high`, one PR)

Badges (`order-badges.tsx`):
- `:5–12` `STATUS_VARIANTS` → the D5 map: `pending_payment` → `warning`, `paid` → `success`, `processing` → `secondary`, `shipped` → `outline` with the strong text class, `cancelled` → `destructive`, `refunded` → `outline`. Text is `ORDER_STATUS_LABELS` (unchanged).
- `:17` and `:35` `className="border-border"` overrides removed (P21: `cn` does not merge token classes; the outline variant already has `border-border`). Verify each rendered badge in the unit test by the variant class, not by the override.
- `:26` `DemoBadge` → the `demo` variant (`badge.tsx:26`). Text unchanged (D8).

Status actions (`order-status-form-view.tsx`):
- Forward transitions (`paid → processing`, `processing → shipped`) stay as a `default` `Button` in their own `form`, with the hidden `orderId`, `from`, `to` inputs.
- `pending_payment → cancelled` and `paid|processing|shipped → refunded` (every transition that `needsConfirmation` returns true for): the `form` becomes an `AlertDialog`. The trigger is a `Button` `destructive` "Cancel order…" or "Record refund…" (the trigger is not a submit button). The dialog contains the same `form` with the hidden inputs and `confirm` = `yes` as a hidden input (the server check, the orders spec contract). Title: "Cancel this order?" or "Record this order as refunded?"; description: the existing `confirmationLabel` copy (`order-copy.ts:73–89`, e.g. "Cancel this unpaid order and return N items to stock"; "No money is moved"). Buttons: `AlertDialogCancel` "Keep order" (cancel) and `AlertDialogAction` `destructive` "Cancel order" or "Record refund" (B4.14, P6). Only the `AlertDialogAction` submits.
- `:87` `FormMessage` stays outside the dialogs (as today) → `Alert`.
- The heading (`h2`, `text-lg` today) → the admin `h2` style (16/24, 600, tokeny section 4).
- `order-status-form.tsx` (wrapper): unchanged `useActionState`; the view receives the same props.
- Changes in the orders spec: C1 (row 255) updated in this phase.

Detail and list:
- `orders/[id]/page.tsx:89–91` demo note `border-demo/50 bg-demo-surface` → `Alert` `demo` (no role), class `border-demo` (the `/50` is decorative and removed). Text unchanged (D8).
- `orders/[id]/page.tsx:48` fallback "Loading order…" → `SkeletonGroup`.
- `orders/page.tsx:47` fallback "Loading orders…" → `SkeletonGroup`.
- Orders table: keep `Table`; totals right-aligned and tabular; reference `font-mono` (tokeny 1c: order numbers only); the reference is a `TextLink` to the detail page; status column is `OrderStatusBadge`; placed date uses the existing formatter.
- `order-copy.ts:24–25` `EMPTY_ORDERS_MESSAGE` → `Empty` with plain copy and no command (C5, OA-5): "No orders yet. Orders appear here after a checkout." `EMPTY_ORDERS_PAGE_MESSAGE` (`:26`) stays text, in an `Empty` without an action.
- 320 px: the orders table scrolls inside its region; the reference and the status stay visible (first and status columns are not hidden).

Tests and e2e:
- Unit: `order-components.test.ts` renders: every status badge variant (D5), demo badge, each allowed-transition set (the same ones `allowedTransitions` returns), a cancel dialog closed and open (title, description, buttons, hidden `confirm`), the result message outside the dialog. Mapping test: `paid` and `processing` have different variants.
- e2e `admin-orders.e2e.test.ts:144`: `click("#confirm-cancelled")` is replaced by: open the "Cancel order" trigger, check the dialog title, click "Cancel order" in the dialog, check the status. New cases: "Keep order" closes without a change (status unchanged, no request); Escape closes without a change; focus returns to the trigger; keyboard only (Tab, Enter, Enter) works.
- A refund case stays in the e2e (refunded is terminal, no restock).

#### Phase 6: states sweep, sign-in (if approved), Storybook and close-out (`risk-high`, one PR)

- Every remaining admin `<Suspense>` fallback (list in "Problem Statement") → `SkeletonGroup` with a label. Grep rule: no bare "Loading" paragraph under `app/admin/`.
- Every admin list empty state uses `Empty` with the next step (products, categories, orders, dashboard period, import zero rows). Grep rule: no `npm run` in admin copy.
- `redirect-notice.tsx:18` → `Alert` `success` with `role="status"` (B2.20); the `redirect-notice-url.ts` logic and its test stay.
- `form-feedback.tsx` deleted when nothing imports it (grep rule); its tests are replaced by `Field` and `Alert` tests.
- Sign-in (only if OA-7): `app/admin/sign-in/page.tsx` form → `Field` and `Card` (B2.25). Copy P10 approved separately. No change to the sign-in action or rate limit.
- Storybook (see below): the admin pattern pages are complete; WhatIsMissing rows for E03 and E04 are removed; the epic pages show the retrofitted screens.
- Docs: `.ai/design/POSTEP.md` gets a "Retrofit admin (lesson 08)" section with the phase table and gate results; `WhatIsMissing.mdx` section 2 loses the admin rows; README admin section checked for copy that changed (empty states).

### Storybook (stage 3 of lesson 08, admin part)

- New admin pattern stories under `packages/app/stories/patterns/admin/` (one file per pattern, `*.stories.tsx` plus `*.mdx`): admin page header, form with `Field` and `Alert` (idle, error, success, pending), status badge set (six statuses), order status actions (forward, cancel dialog open, refund dialog open), delete-category dialog (empty, used), metric card with definition, period nav, import preview (all outcomes), stock history table, admin empty states, admin skeleton groups, admin error state.
- Each story is tested by `npm run test:storybook:themes` in light and dark, with `a11y: { test: "error" }`.
- A variant needs two uses (P22). Every pattern above is used by two or more screens; the status badge set and the dialog pattern are already used by two screens each (orders and categories).

## 📝 Acceptance criteria

| # | Criterion | How it is checked |
|---|---|---|
| A1 | Every admin page and route keeps its guard: `requireAdminPage()`, `adminApiHandler`, `runAdminAction`. `admin-guard-inventory.test.ts` is green; admin code does not import `require-customer` | unit test (inventory), PR diff review |
| A2 | No change in `packages/core`, `packages/database`, `packages/ai`, `packages/app/src/server/**`, migrations, env, `globals.css`, `components/ui/*` (each phase) | PR diff check listed in the PR description |
| A3 | Admin controls use the compact density: 28 / 32 / 36 px at 768 px and wider; at least 44 px below 768 px. No raw `h-8`, `h-9`, `h-10` or `size-*` control classes in admin files (only DS components) | grep in the PR; e2e `getBoundingClientRect` on the admin pages at 1440 and 390 px |
| A4 | No palette classes (`amber-`, `emerald-`, `red-`, `green-`, `gray-`, `slate-`, `zinc-`, `neutral-`) and no `dark:` variants in admin files; no `opacity-`, `/80`, `/90`, `/50` used for state | grep in the PR; `npm run check:tokens` clean for the admin files |
| A5 | Every admin form field is a DS component: `Field` with label, hint and error; `Input`, `NativeSelect`, `Checkbox`, `Textarea`. Raw `<input>` remains only for hidden fields and the file input inside `Field` | grep; unit tests for the views |
| A6 | Form errors: `Alert` `destructive` with `role="alert"`; success `Alert` with `role="status"`; field errors through `Field` with `aria-invalid` and `aria-describedby`. After a failed submit the typed values stay (P2) and focus moves to the first invalid field (A-2) | unit tests; e2e on product and category forms |
| A7 | Destructive actions (cancel order, record refund, delete empty category) open an `AlertDialog` whose title names the object. The safe button is "Keep order" or "Cancel". The action button is `destructive`, never `action`. Escape and the backdrop close without submitting. Focus returns to the trigger. The server check (`confirm=yes`) is still sent | unit (dialog states); e2e (orders, categories) |
| A8 | The six order statuses map to the D5 variants; `paid` and `processing` differ; every badge has its text; a status is never colour alone | unit test (mapping); e2e list page |
| A9 | Demo labelling is unchanged: `DEMO-` references, the demo badge, the fictional-customer note and the dashboard demo note keep their text and use `--demo` (`demo` variant). No `[DEMO]` text is added | unit test; e2e `admin-orders` and `admin-dashboard` (demo orders still labelled) |
| A10 | Tables have a caption or `aria-label`; numbers are right-aligned and tabular; below 768 px a table sits in a horizontal scroll region, not the page | unit (caption); e2e at 320 px (page `scrollWidth` equals viewport; the region scrolls) |
| A11 | Every empty list state says why it is empty and gives a next step as a control. No developer command appears in the UI | unit (copy); grep for `npm run` in admin copy returns nothing |
| A12 | Every admin loading state is a labelled `SkeletonGroup`; there is no bare "Loading…" paragraph under `app/admin/` | grep; unit tests |
| A13 | The admin error page uses `ErrorState` with the same text and a "Try again" control that calls `retry` | unit test (render); manual step in the phase 1 QA |
| A14 | The sidebar is dark (`bg-sidebar`), the current page has `aria-current="page"`, focus is visible with `--sidebar-ring`, and the nav keeps `aria-label="Admin"`. At 320 px the six links wrap and do not push the page sideways | unit (`AdminNavLink`); e2e `admin-mobile` |
| A15 | The dashboard period switch is a `TabsNav`; the active period has `aria-current="page"` and no colour-only state | e2e `admin-dashboard` and `admin-dashboard-range` (existing selectors) |
| A16 | Every text and UI colour pair used in an admin view is one of the pairs in `tokeny.md` section 2 (no new pair without `node .ai/design/kontrast/run.mjs`) | review of the PR (list of pairs in the description) |
| A17 | Focus is a 2 px `--ring` outline with 2 px offset (DS); no `ring-ring/50` or `ring-3` in admin files | grep; Storybook focus story |
| A18 | At 320 px no admin page scrolls sideways (except named table regions); at 768 px the sidebar and content sit side by side (`md:`) | e2e `admin-mobile` extended to every admin page in the list of phase pages |
| A19 | Storybook: every new admin pattern passes `a11y` as errors in light and dark (`npm run test:storybook:themes`) | Storybook test run |
| A20 | Specs and records are updated in the same phase as their behaviour text: orders spec row 255 (phase 5), catalog spec G1 (phase 3), `POSTEP.md` and `WhatIsMissing.mdx` (phase 6) | PR diff |
| A21 | Coverage stays at 100% lines, branches, functions and statements, with no new exclusion | `npm run test:coverage` |
| A22 | E2E journeys of the admin keep passing; each changed selector is listed in its phase PR | `npm run test:e2e` |

## 📝 UI/UX and states

- **Density:** admin desktop uses the compact scale (D2). Phones use 44 px controls and table regions. The sidebar is a column from 768 px, a wrapping row below.
- **Loading:** labelled `SkeletonGroup` in every `<Suspense>` fallback. No spinner (tokeny 5: only the skeleton pulses).
- **Empty:** `Empty` with a title, one sentence and a next step as a button or link. Left aligned (P14).
- **Error:** page error `ErrorState` with "Try again"; form error `Alert` with `role="alert"` next to the form; a refusal (used category) `Alert` without role.
- **Success:** `Alert` `success` with `role="status"` after the server confirms (P4).
- **Pending:** the submit button is disabled and `aria-busy` (B1.6), its text may change ("Deleting…"). A second click does nothing (P3).
- **Destructive:** `AlertDialog`; the title names the object; the consequence is stated in the description (for an order: "return N items to stock" or "No money is moved").
- **Status:** text plus variant (rule 10).

## 📝 Accessibility

- Labels: every control has a visible `Field` label. The product search and the header search are out of scope (storefront).
- Errors: `aria-invalid` plus `aria-describedby`; the first error takes focus after a failed submit (A-2).
- Focus: 2 px `--ring`, 2 px offset (A17); in the dark sidebar `--sidebar-ring`.
- Dialogs: focus trapped, Escape and backdrop close, focus returns to the trigger (B4.15).
- Tables: a caption (visible or `sr-only`); scroll regions are named by their table; the first column identifies the row (B3.10).
- Targets: 44 px below 768 px (WCAG 2.5.8 and tokeny rule 16).
- Contrast: admin pairs from tokeny section 2 only (A16).
- Motion: `prefers-reduced-motion` handled by the DS; no new animation in the admin.

## 📝 Security and validation

- No change to validation (Zod schemas, `ValidationError` mapping, `ActionState`) or to the `confirm=yes` server check. The hidden fields carry the same names and values.
- The dialogs do not decide anything on the client: the server refuses a stale or unconfirmed action (orders spec, catalog spec A3).
- The category delete trigger is disabled for a used category as a usability step only; the server still refuses (G1).
- Demo labelling and fictional data are not changed (D8).
- No new client data: the nav link component reads only the pathname.

## 📝 Edge cases & failure scenarios

| Case | Expected behaviour |
|---|---|
| Category gets a product between page load and submit | Server refuses (G1); the page shows the refusal in the form `Alert` `destructive` with `role="alert"` |
| Order status changed by another admin while the dialog is open | Server checks `from` (lost-update guard); the page refreshes with the new status and the result message; the dialog closes |
| Dialog opened, then the trigger's order is cancelled elsewhere | Same as above |
| JavaScript disabled | Forms still post (native `form`); the dialog cannot open, so cancel and refund are not reachable without JS. Recorded as a known limit (Q4 below) |
| 320 px with six sidebar links | Links wrap (#56); no sideways scroll |
| CSV with only a header | `Empty` with the zero-rows copy; no preview table |
| Very long product name in a table | Name wraps (`whitespace-normal wrap-anywhere`) inside the region |
| Admin error page rendered while signed in | `ErrorState` with "Try again" |
| Import preview with errors | Import button stays disabled as today; error list text in the Result cell |

## 📝 Risks & Impact Review

| Risk | Impact | Mitigation |
|---|---|---|
| The shell change (phase 1) affects every admin page | High | Phase 1 is small (layout, error page, not-found), reviewed on its own, e2e on all admin suites |
| AlertDialog with a form inside a view loses the form action on the server side | High (cancel or refund fails) | Unit test that the hidden fields and `confirm=yes` are rendered in the dialog; e2e cancel and refund journeys |
| Dialogs and the compact density: overlays portal into `<body>`, outside `div[data-density]` (lesson 2026-10-24, `globals.css:379–447`) | Medium (dialog controls at 28 px only in some states) | `:root:has([data-density="admin"])` covers the document; the phase 3 Storybook story and an e2e measurement of a dialog button height |
| `usePathname` in the nav makes the layout dynamic | Medium (cache components) | Client component only for the link; the layout stays static; check the build output |
| Changing the stock history from a list to a table breaks the e2e selector | Low | Listed in C4 and in phase 4 |
| The owner's review (risk-high, no self-QA) is slow | Medium | Six small phases; each one has its own checklist |
| `cn` does not merge token classes (P21), so an override may do nothing | Medium (visual drift) | No overrides in the admin; P21 fixed separately if needed |
| Copy changes (empty states, dialog buttons) are not approved | Medium | OA-5; the phase waits for the copy |

## 📝 Decisions in play

Carried from the decisions table. Open questions below are not decided by this spec.

## 📋 Phasing

| Phase | Title | Risk | Depends on | Files (summary) |
|---|---|---|---|---|
| 1 | Shell, navigation, error and session states | risk-high | this spec approved | layout, error, not-found, new `admin-nav-link.tsx` |
| 2 | Dashboard | risk-high | 1 | dashboard view, copy, admin page fallbacks |
| 3 | Products and categories: forms, feedback, category delete dialog | risk-high | 1 | product and category views and wrappers, description draft, publish, empty states, catalog spec G1 |
| 4 | Stock panel and CSV import | risk-high | 3 (shares `Field` and `Alert` patterns) | stock panel, import view and wrapper |
| 5 | Orders: badges, status actions, cancel and refund dialog | risk-high | 3 (shares the dialog pattern) | order badges, status view, detail and list, orders spec row 255 |
| 6 | States sweep, sign-in (if approved), Storybook and close-out | risk-high | 1–5 | fallbacks, redirect notice, remove `form-feedback.tsx`, WhatIsMissing, POSTEP |

Phases 2 and 3 can run in parallel after phase 1 because they touch different folders; the owner decides the order. Phase 6 is last.

## 📝 Implementation plan

Each phase: one branch, one PR, the gate (below), one review in a new session by another model family, the owner's manual test (the course's manual steps for the phase), then merge by the owner. The phase's PR description lists its files, its selector changes, its diff check (A2) and its grep results (A3, A4, A11, A12).

## 📝 Test plan

**Per phase (unit, 100% coverage):**
- Each changed view rendered in every state listed in its phase (hook-free views, rendered directly, the existing `*-components.test.ts` pattern).
- Mapping functions (status to variant, outcome to badge) tested for every value.
- Wrappers: `useActionState` only; the focus effect (A-2) tested with a fake `document`.
- `AdminNavLink`: active for each route and for nested routes.
- `category-components.test.ts` compares exact HTML against `form-feedback.tsx`; the phase that retires `form-feedback.tsx` replaces that test with a comparison against the new `Field` and `Alert` markup. The test is updated, not deleted.

**Per phase (e2e):** the admin suites listed in each phase, run on `npm run build && npm run test:e2e`. New journeys:
- Cancel an unpaid order through the dialog; "Keep order" leaves the status; Escape leaves the status; focus returns to the trigger.
- Record a refund through the dialog.
- Delete an empty category through the dialog; Cancel keeps it; a used category shows the refusal and a disabled trigger.
- Product form: a failed submit keeps the typed values and focuses the first invalid field.
- Import: the preview table scrolls inside its region at 320 px; the other submit is disabled while one import is pending.
- 320 px and 768 px checks on each admin page in the phase (dashboard, products list and form, categories, stock, import, orders list and detail). Pass: no page-level horizontal scroll at 320 px; the sidebar is a column at 768 px.
- A keyboard-only journey through the order status dialog (Tab, Enter, Escape).

**Accessibility:** Storybook `a11y` as errors (light and dark) for every new pattern story; e2e keyboard checks in the journeys above. If the existing suites have no axe run, the phase does not add one; that is an open question (Q6).

**Gate per phase:**
```bash
npm run lint
npm run format:check
npm run test:hooks
npm run typecheck
npm run test:coverage
npm run build
npm run test:integration
npm run test:e2e
npm run build-storybook
npm run test:storybook:themes
npm run check:tokens
```

**Manual verification (documented per phase, the owner runs it):** sign in as the owner, open each changed screen at 1440, 768 and 320 px, check focus rings with Tab, open each dialog with the keyboard, check dark mode (the admin `ThemeToggle`), check the demo labels on demo orders and on the dashboard.

## 📝 Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | The current-page mark (`aria-current`) needs a client component that reads the pathname, because the layout is static. Allowed, or leave the sidebar without a current-page mark? | Allow the small `AdminNavLink` client component (presentation only). The audit found the missing mark (`layout.tsx`, audit "Panel (z kodu)") |
| Q2 | Empty dashboard period: keep a link to the catalog as the next step, or text only? | Text plus a link to "Products" (the next step is catalogue work) |
| Q3 | Delete trigger for a used category: keep it enabled (the server refuses) or disable it with the reason above? | Disable the trigger for a used category, keep the refusal text. The server rule is unchanged |
| Q4 | Cancel and refund need JavaScript for the dialog. Without JS the status form cannot open the dialog. Keep a no-JS fallback? | No fallback. The admin is a signed-in tool used with JavaScript (the store keeps its no-JS paths). Record it as a known limit in the orders spec |
| Q5 | Dashboard and product tables on a phone: horizontal scroll region or card list? | Scroll region with the name column first (B3.10); cards would add a second layout |
| Q6 | Does the e2e suite run an accessibility scanner? The repo does not show one in `packages/app/e2e/support/` | Keep Storybook `a11y` as the gate; add an axe run only with the owner's approval (new dependency, SDLC) |
| Q7 | Sign-in page: in this retrofit (phase 6) or a separate small change? | In phase 6 if OA-7 is approved; its copy (P10) goes with it |
| Q8 | Admin headings and labels: keep the current sentence case in every view? | Yes (P13) |
| Q9 | The admin `not-found.tsx` text "This record does not exist or was deleted." | Keep; only the link changes to `TextLink` |
| Q10 | Stock history as a `Table` (C4) or keep the list? | `Table` (B3.5). It is a data list with columns |

## 📝 Owner approvals needed

| # | Approval | Recommended option (approved) | Owner status | Phase |
|---|---|---|---|---|
| OA-1 | Dark admin sidebar (C3) | Apply the dark sidebar now, from `tokeny.md` 1b (R04.1) | **Owner-approved 2026-10-26** with the recommended option | 1 |
| OA-2 | Alert dialog for cancel and refund (C1) and the orders spec row change | Alert dialog in both cases; `confirm=yes` kept; orders spec row 255 updated | **Owner-approved 2026-10-26** with the recommended option | 5 |
| OA-3 | Alert dialog for deleting an empty category (C2), catalog spec G1 change, and the disabled trigger for a used category (Q3) | Alert dialog for empty categories; trigger disabled for a used category, refusal text kept; catalog spec G1 updated | **Owner-approved 2026-10-26** with the recommended option | 3 |
| OA-4 | Status badge map (D5, C6) | D5 map, with `shipped` as outline with strong text | **Owner-approved 2026-10-26** with the recommended option | 5 |
| OA-5 | Copy: empty states without `npm run db:seed` (C5, WhatIsMissing P11), the empty import copy, the dialog titles, descriptions and buttons ("Keep order", "Cancel order", "Record refund", "Delete category") | Plain next step with no developer command; dialog button names per B4.14 | **Owner-approved 2026-10-26** with the recommended option (final wording as drafted in the spec) | 2, 3, 4, 5 |
| OA-6 | Stock history as a table (C4) and its e2e selector change | `Table` for stock history | **Owner-approved 2026-10-26** with the recommended option | 4 |
| OA-7 | Admin sign-in in this retrofit (Q7) | Include in phase 6 | **Owner-approved 2026-10-26** with the recommended option (P10 copy goes with it) | 6 |
| OA-8 | Product "Featured" checkbox from a native input to the DS `Checkbox` (B2.8 decision Q2) and its id handling | DS `Checkbox` (Base UI), id passed as B2.8 describes | **Owner-approved 2026-10-26** with the recommended option | 3 |
| OA-9 | Any DS change needed while building the admin (for example the `cn` fix, P21) | Not planned; any DS change is a separate PR with its own approval | **Owner-approved 2026-10-26** with the recommended option (no DS change in this retrofit) | any |

## 📋 P list (WhatIsMissing section 4): recommendation for each item

The owner accepts or rejects each P item. The recommendation for each item is below. Items that are storefront-only are marked and are not part of this spec.

| P | Item (short) | Recommendation | Note for this retrofit |
|---|---|---|---|
| P1 | The field keeps the `--ring` focus while it shows its error | **Accept** | Already the rule in tokeny section 5 (border changes to `--destructive`, focus stays `--ring`) |
| P2 | After a failed submit the typed values stay | **Accept** | Already true in code: `lib/action-state.ts` (`fieldDefault`, `values` on error). Phases 3 and 4 keep it |
| P3 | A second click on a waiting button does not submit again | **Accept** | Admin buttons are `disabled={pending}`; phases add `aria-busy` (B1.6) |
| P4 | Success is shown only after the server confirms it | **Accept** | True today (`FormMessage` reads the action state) |
| P5 | An error the user must act on is never a toast | **Accept** | The admin has no toasts |
| P6 | Dialog and Alert dialog have a visible title; Alert dialog has a description | **Accept** | Phases 3 and 5 build it (B4.15) |
| P7 | Tab activation (activate on focus or on Enter) | **Accept the current behaviour** for storefront Tabs; no admin impact | The admin uses `TabsNav` (links), not tab activation |
| P8 | Exit times: menus 120 ms, dialogs 200 ms; 150 ms token missing | **Accept the values, no 150 ms token** | Use `--duration-fast` (120 ms) and `--duration-base` (200 ms) |
| P9 | Cart confirmation button "OK, update my cart" | **Storefront item, not in this spec.** Recommend a clearer verb in the storefront retrofit | Not admin |
| P10 | "Sign-in is unavailable. Try again." is rewritten | **Accept a new copy if OA-7 is approved.** Suggested: "Sign-in failed. Check the email and password, then try again. If it keeps failing, the service may be down." (The owner approves the final wording) | Phase 6 only |
| P11 | The empty orders list shows a developer seed command | **Accept: no command in the UI.** Use the plain next step (D7) | Phases 2 and 5; the README keeps the command |
| P12 | One money and date format for the whole store | **Decide separately; out of this retrofit.** Recommend one format for the store (owner choice) | The admin keeps its current formats |
| P13 | Sentence case for headings and labels | **Accept** | The admin already writes sentence case |
| P14 | Empty states are left aligned | **Accept** | Phase 2 onwards |
| P15 | Epic E05: the answer and the saved list share one status | **Copilot item, out of this spec** | Copilot spec |
| P16 | Epic E05: visible counter for the question length | **Copilot item, out of this spec.** Recommend accept | Copilot spec |
| P17 | One submitting form at a time on the CSV import | **Accept** | Phase 4 |
| P18 | The store has no `error.tsx` yet | **Storefront item. Approve in the storefront retrofit.** The admin already has one, which phase 1 moves to `ErrorState` | Not in this spec |
| P19 | E07 (customer accounts) is outside the stage 0 tree | **Confirm the scope: out of the admin retrofit** | Not admin |
| P20 | The featured slider hides a card with no cue | **Storefront item, not in this spec** | Not admin |
| P21 | `cn` does not merge the project's token classes; a `className` override may do nothing | **Accept as a separate fix** in `cn/config` before phase 5 if an override is still needed. The admin retrofit avoids overrides (C6 notes `border-border`) | OA-9 |
| P22 | A variant needs at least two uses before it is added | **Accept.** The retrofit adds no new variant | Storybook section |
| P23 | A need that appears once stays in its screen, with tokens only | **Accept.** The sidebar item and the `AdminNavLink` state use tokens in the layout | Phase 1 |

## 📝 Review log

- 2026-10-26: spec written by the agent from the design docs listed above; the baseline is `origin/main` at `59cfc48`. Not yet reviewed by a second model family (course rule before phase 1 starts).
- 2026-10-26: **owner decision.** OA-1 to OA-9 approved, each with its recommended option (see the OA table): OA-1 dark sidebar; OA-2 and OA-3 Alert dialogs, with the used-category trigger disabled; OA-4 status badge map; OA-5 copy without the seed command; OA-6 stock history as a table; OA-7 sign-in in phase 6; OA-8 DS Checkbox; OA-9 no DS change in this retrofit.
- 2026-10-26: **owner decision.** The recommended options for Open questions Q1–Q10 are approved: Q1 `AdminNavLink` client component for `aria-current`; Q2 empty dashboard period with a link to Products; Q3 used-category delete trigger disabled, refusal kept; Q4 no no-JS fallback for the destructive dialogs, recorded as a known limit; Q5 scroll region on phones; Q6 no axe run added (Storybook `a11y` stays the gate); Q7 sign-in in phase 6; Q8 sentence case kept; Q9 `not-found` text kept, link becomes `TextLink`; Q10 stock history as `Table`.
- 2026-10-26: **status** moved to ready for the owner to merge. The P list recommendations are the agent's; the owner's acceptance of the P items is not recorded here and is left to the owner's merge review.

## What could not be verified

- No application run: the worktree has no `node_modules`, so `npm run check:tokens`, `npm run build-storybook` and the e2e suites were **not** run for this spec. The only check run was reading the files and `grep`.
- The palette audit was re-checked on `main` by grep, not in a browser. The admin was not opened (no owner account in this pass), so the sidebar, contrast and focus state of the current admin are not measured. The `audyt.md` admin measurements are from code only, as the audit says.
- `not-found.tsx` and the sign-in page were read only in part (line counts and the grep results), so their phase-6 items are less certain.
- The e2e suites' full selector list was taken from grep (`admin*.e2e.test.ts`); a run may show selectors not caught by the grep.
- The POSTEP P list (`WhatIsMissing.mdx` section 4) is not recorded as accepted or rejected anywhere; the recommendations above are the agent's, for the owner to decide.
- The "13 other fallbacks" count for bare loading text is from the grep of `Suspense fallback` in admin pages (12 with text, plus the session badge); the exact number may differ by one.
- The orders-spec and catalog-spec line numbers (255; 39, 75) are from the audit and grep of the specs on `main`; the rows should be re-read when the phases change them.
