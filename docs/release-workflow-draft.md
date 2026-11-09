# Release workflow (draft)

Status: **draft, not installed.** `.github/workflows/` belongs to the maintainer (`.github/CODEOWNERS`), so this file describes the job and does not add it. The maintainer decides whether and how to add it. Open decisions are listed at the end.

## Goal

A manual GitHub Actions job that publishes a version: the owner picks the bump, the job updates the version, commits, tags, and publishes a GitHub Release whose notes come from `CHANGELOG.md`. The tag makes it possible to return to that version later (see [`deployment.md`](deployment.md#rollback)).

## Trigger and inputs

- `on: workflow_dispatch` only. No automatic release on push.
- `bump`: a choice of `patch`, `minor`, `major` or `custom`.
- `version`: used only when `bump` is `custom` (a semver string such as `1.0.1`, without the `v`).
- The job runs on `main` only: it refuses to start on any other ref.

## Permissions

```yaml
permissions:
  contents: write   # release commit, tag and GitHub Release
```

Nothing else. The job uses the built-in `GITHUB_TOKEN`; no personal access token and no API key is stored or pasted.

## Steps

1. **Checkout** with full history and tags (`fetch-depth: 0`), on `main`.
2. **Set up Node** 22.17 or newer (the `engines` value in `package.json`).
3. **Compute the new version** from the current `version` in the root `package.json` and the chosen bump. A `custom` value must be valid semver and greater than the current version.
4. **Refuse an existing tag:** `git rev-parse -q --verify "refs/tags/v$NEW"` must find nothing. The job stops with a clear message instead of overwriting a tag.
5. **Check the changelog entry:** `CHANGELOG.md` must contain a section for `$NEW`. Without it, the job stops.
6. **Bump every workspace** `package.json` (root and `packages/*`) to `$NEW`, with `npm version --no-git-tag-version` in each workspace, or with a short script that edits the `version` field and nothing else. Then run `npm install --package-lock-only` so `package-lock.json` matches.
7. **Validate:** `npm ci`, then the validation gate that `CI` runs (`npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build`). A failing gate stops the release.
8. **Release commit:** `chore(release): v$NEW`, with the `Co-Authored-By` trailer the repository uses for agent commits, if any.
9. **Tag:** `git tag -a "v$NEW" -m "v$NEW"`, then push the commit and the tag. Use a branch rule that allows the job to push to `main`, or open a pull request instead (decision below).
10. **GitHub Release:** `gh release create "v$NEW" --verify-tag --title "v$NEW" --notes-file <section of CHANGELOG.md for $NEW>`. The notes file is extracted from the changelog section, never typed by hand.

## Sketch

A sketch of the job, not a file to copy as is:

```yaml
release:
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  permissions:
    contents: write
  steps:
    - uses: actions/checkout@v4          # pin to a commit SHA before use
      with:
        fetch-depth: 0
    - uses: actions/setup-node@v4        # pin to a commit SHA before use
      with:
        node-version: "22.17"
    - name: Compute version, refuse existing tag, check changelog
      run: ./scripts/release/next-version.sh "${{ inputs.bump }}" "${{ inputs.version }}"  # to be written
    # bump workspaces, validate, commit, tag, push, gh release create (steps 6-10)
```

Action references must be pinned to commit SHAs, and the helper script (`scripts/release/…`) is not written yet. Both are part of the maintainer's review.

## Safety rules

- Never overwrite an existing tag or release. Re-running a failed release with the same version must stop at step 4.
- Never publish a release from a branch other than `main`.
- The release commit and the tag point to the same commit that passed the validation gate.
- Secrets: none in the workflow. A deploy step, if one is added later, uses the platform's own secret store (see `deployment.md`).
- The job never changes application data or the production database.

## Open decisions for the owner

1. **Source of truth for the version:** the `package.json` files (today `0.1.0`) or the latest tag (`v1.0.0`). Until this is decided, the job does not bump anything.
2. **Direct push or pull request:** whether the job may push the release commit to `main` (needs a branch rule exception for the `GITHUB_TOKEN`), or opens a release pull request that a human merges before the tag is created.
3. **Whether `v1.0.0` gets a GitHub Release** now, from the existing tag and the changelog section, before the job exists.
4. **Image publishing:** whether the release job also builds and pushes the Docker image tagged with the version. Depends on the platform decision.
