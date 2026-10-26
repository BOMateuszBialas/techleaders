# 2026-10-26 — Git Bash rewrites `ref:path` in `git show`, and Base UI focus is checked after its guards

on Windows the Bash tool turns `git show origin/branch:.ai/...` into a Windows path (`origin\branch;...`); run it as `MSYS_NO_PATHCONV=1 git show "origin/branch:path"`. In a Base UI modal, Tab lands on a focus guard before the popup, so a focus-trap assertion must wait (`waitFor`) for the focus to settle inside the drawer.
