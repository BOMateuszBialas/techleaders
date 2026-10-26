# A new port field reaches every fixture; copy a tracked binary from git, not the shell

Context: storefront v2 Phase 4 (PR #127).

- Adding a required field to a port row (`LowStockRow.slug`) breaks every literal fixture in other packages (core, ai, app). `npm run typecheck` lists them all at once, so run it before the unit tests.
- A file another branch already tracks can be copied byte-exact with `git show HEAD:<path> > <dest>`. The destination folder must exist first (a Write creates it). Check the copy with `git hash-object <dest>` against `git rev-parse HEAD:<path>`.
- `check:tokens` rejects arbitrary aspect ratios such as `aspect-[4/3]`; use `aspect-video` or another semantic class.
