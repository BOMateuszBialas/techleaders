# 2026-10-17 — Windows Python cannot open Git Bash's `/tmp`

`python - <<EOF` with `open("/tmp/x.md")` failed (Python resolves `/tmp` on the current drive, not Git Bash's temp), and the following `gh issue edit --body-file /tmp/x.md` silently re-posted the unchanged body. Pass `$(cygpath -w /tmp/x.md)` to Python, or use the scratchpad with a Windows path, and chain with `&&`.
