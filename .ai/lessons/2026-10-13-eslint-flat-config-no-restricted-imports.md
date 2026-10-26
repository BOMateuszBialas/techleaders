# 2026-10-13 — ESLint flat config `no-restricted-imports`

A later config object with the same rule *replaces* (does not merge) the options of an earlier one for overlapping files. Keep package-boundary blocks on non-overlapping globs (`packages/<name>/src/**`) and carve out exceptions with `ignores`.
