# L06 detector: layout sweep on the live app

`.ai/scripts/layout-sweep.mjs` is the repeatable check for lesson 06 ("no page scroll" is not
"readable on a phone"). It opens the storefront home and the admin dashboard, orders and Copilot
pages at 320, 768 and 1440 px, in light and dark, and reports:

- sideways overflow (`document.documentElement.scrollWidth` above the viewport width),
- uncaught page errors,
- console errors (dev-tool noise filtered out),
- HTTP 5xx responses.

It uses Playwright from `node_modules`. It stores no credentials.

## Usage

Start the app, then run the script from the repository root:

```bash
npm run dev            # or: npm run build && npm run start
LAYOUT_SWEEP_ADMIN_EMAIL=owner@example.com \
LAYOUT_SWEEP_ADMIN_PASSWORD='your-owner-password' \
node .ai/scripts/layout-sweep.mjs
```

| Variable | Default | Purpose |
|---|---|---|
| `LAYOUT_SWEEP_BASE_URL` | `http://localhost:3000` | App address |
| `LAYOUT_SWEEP_ADMIN_EMAIL` | none | Owner email (`npm run admin:create`) for the admin pages |
| `LAYOUT_SWEEP_ADMIN_PASSWORD` | none | Owner password for the admin pages |
| `LAYOUT_SWEEP_JSON` | none | Optional path for the full results |

Output is one line per check: `OK`, `FAIL` (with the overflow in px, page and console error counts,
and the first messages), or `BLOCKED` (with the reason). Exit codes: `0` all checks passed, `1` at
least one `FAIL`, `2` no failure but at least one check could not run (server down or the owner
session was not accepted). A `BLOCKED` check is not a pass.

Dark mode is set through the `commerceos-theme` localStorage key (`packages/app/src/lib/theme/theme.ts`).

## Results

### Run on 2026-11-03 (this worktree, not a real store)

Environment: `next dev` on port 3000 with placeholder `DATABASE_URL` (no PostgreSQL in this
environment, Docker not running) and a placeholder `BETTER_AUTH_SECRET`. No `.env` file was read.

```
24 checks: 0 OK, 6 FAIL, 18 BLOCKED
```

- **Storefront home, 320/768/1440 px, light and dark: FAIL (6 of 6).** The page itself does not
  overflow (0 px at every width). It fails because the database refuses connections: the page logs
  `Page data could not be loaded` and `Customer session read failed` (`ECONNREFUSED`). The layout
  numbers for the home page therefore do not describe a page with products; rerun with a database.
- **Admin dashboard, orders, Copilot: BLOCKED (18 of 18).** The owner sign-in form is rendered by
  the server, then the client shows the error boundary because the session check needs the
  database. No owner can be created without a database (`npm run admin:create`). The sign-in
  path was run once with placeholder values and reported that reason.

So the first real results are: the detector runs and reports, the storefront home has no
sideways overflow at the three widths (but its data errors block a clean pass), and the admin
pages are not yet measured.

## Limits

- The admin pages and the owner sign-in path have not been run against a working database. Their
  checks are untested in this environment.
- The sweep measures overflow only. It does not check focus order, contrast or the content of the
  page, and it does not read the Storybook docs (see the Storybook sweep in the PR body instead).
- Dark mode is set by localStorage before the page loads. A change of theme after load is not
  covered.
- Results depend on the data in the database: an empty store and a full store can differ.

## Next

Start PostgreSQL (`npm run db:up`), run `npm run db:migrate` and `npm run db:seed` (see `README.md`),
create the owner with `npm run admin:create`, then run the sweep and record the numbers in this file.
