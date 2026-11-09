# Release and rollback procedure

Owner: the Maintainer, or a release manager when the team names one (`SDLC.md`). Applies to every tagged release from 1.0.0. Hosting is not chosen yet. Steps marked **[to fill in when the platform is chosen]** name a platform action that this file cannot write yet. Do not invent them: fill each one in when the platform decision is made, and record the decision here.

Version rule: see [1.0.0.md, section 5](1.0.0.md#5-version-question-owner-decision). Until the owner decides, the git tag and `CHANGELOG.md` are the release version.

## 1. Before cutting a release

All of these must hold for the commit that will be tagged:

- CI is green on that commit. The jobs mirror the validation gate in `.ai/agentic.config.json`.
- `CHANGELOG.md` has an entry for the version, dated, in Keep a Changelog format.
- `docs/releases/<version>.md` exists: the operator notes (new environment variables, migrations in order, breaking changes or "none", known limitations).
- Every migration in the release has a `down` and a rollback note in its PR, as `SDLC.md` requires.
- QA has been done on the release candidate, and the release manager approves the release after QA.
- No open PR marked `risk-high` is in the release.

## 2. Cut the release from a tag

1. Update the local `main`: `git switch main` then `git pull --ff-only`.
2. Confirm the commit to release: `git log -1 --oneline`.
3. Create an annotated tag on that commit: `git tag -a vX.Y.Z -m "CommerceOS X.Y.Z"`, then push it: `git push origin vX.Y.Z`.
4. Create the GitHub Release from the tag and the operator notes. This writes to the remote, so the owner runs it or approves it: `gh release create vX.Y.Z --verify-tag --title "CommerceOS X.Y.Z" --notes-file docs/releases/X.Y.Z.md`.
5. Build from the tag, not from a branch: check out `vX.Y.Z` in a clean worktree, then `npm ci` and `npm run build`. Both must exit 0.

A published tag is never moved or deleted. If the tag points to a wrong commit, cut a new patch version.

## 3. Deploy

1. Take a database backup before anything changes. Keep it until the release has been stable for an agreed period. **[to fill in when the platform is chosen: the backup command and where it is kept]**
2. Set the environment variables listed in the release's operator notes. Never copy values into the repository or into a ticket.
3. Build and package the artifact from the tag. **[to fill in when the platform is chosen: image or bundle, and the build command]**
4. Run the migrations before the new code serves traffic: `npm run db:migrate`. The command runs every pending migration, in file-name order. **[to fill in when the platform is chosen: where the command runs, and whether `tsx` is in the runtime image]**
5. Start the app: `npm run start`, which runs `next start`. **[to fill in when the platform is chosen: the process manager, port and health-check wiring]**
6. Run the post-deploy checks (section 4).

Do not run `npm run db:seed` on a store with real orders. It regenerates demo data.

## 4. Post-deploy checks

Run them in this order. Stop and roll back (section 5) at the first failure that affects shoppers or the owner.

1. `GET /api/health` returns HTTP 200 with `"status": "ok"`. Each entry in `components` has `"status": "up"`. HTTP 503 with `"status": "degraded"` means a dependency is down; the `components` entry names it. Do not go on until it is 200.
2. The storefront home page `/` and the product list `/products` load without errors.
3. The owner signs in on `/admin` with the account created by `npm run admin:create`, and the dashboard loads.
4. A test order can be placed and found through `/orders/lookup` on the demo payment path, if the release includes the checkout. Use a test product and cancel the test order afterwards.
5. The application logs show no startup errors (missing environment variable, migration error). **[to fill in when the platform is chosen: where the logs are read]**

Record the result (time, version, who checked, pass or fail) in `.ai/runs/` or in the release notes.

## 5. Rollback

A release is rolled back when a post-deploy check fails and cannot be fixed within the agreed window, or when a serious defect is found afterwards.

Important limits, found while preparing 1.0.0:

- **There is no command that runs a `down` migration.** `packages/database/src/cli/migrate.ts` accepts `up` and `create` only. Each migration file has a `down`, but running it needs a one-off script that the owner approves and that is first tested with an integration test.
- Some `down` migrations refuse to run once data depends on them. For example, `orders_customer` refuses while any order has a `customer_id` (`BACKWARD_COMPATIBILITY.md`, section 5).
- Old code may not run against a new schema.

So the reliable order is:

1. **Stop the new version from serving traffic.** **[to fill in when the platform is chosen: how to switch traffic back]**
2. **Redeploy the previous tag.** Check out the previous `vX.Y.Z` in a clean worktree, `npm ci`, `npm run build`, and start it with the same environment variables. Do not run `db:migrate` again.
3. **Decide the database.** If the new release's migrations changed data or the schema, restore the backup taken in section 3, step 1 **[to fill in when the platform is chosen: the restore command]**. Data written after the backup is lost, so the release manager decides between a restore and a forward fix.
4. Run the post-deploy checks (section 4) on the rolled-back version.
5. Write a short note: the version rolled back to, the trigger, the time, and whether data was restored. Put it in `.ai/runs/` and link it from the next release's notes.

A fix that moves forward (a new patch version) is usually safer than a rollback once the schema has changed. The release manager decides.

## 6. Rehearsal

Before the first public deploy, rehearse the rollback in a temporary worktree at the previous tag: `git worktree add --detach <temp-dir> vX.Y.Z`, `npm ci`, `npm run typecheck`, `npm run build`, then remove the worktree with `git worktree remove`. The 1.0.0 tag passed this check on 2026-11-09 (see [1.0.0.md, section 6](1.0.0.md#6-verification-record)). A full rehearsal, with a restored database copy and the health check, needs the platform and a staging database. **[to fill in when the platform is chosen]**

## 7. Platform decisions still open

- Hosting platform and how the app is packaged (image, bundle or process).
- Where secrets are stored and how they are injected.
- Database provider, backup schedule and restore command.
- Log location and alerting.
- Traffic switch for a rollback.

Record each decision in this file when it is made, and remove the matching placeholder.
