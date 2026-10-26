# 2026-10-16 — Check validation rules against the seed data; a missing form field arrives as `""`

The spec's `https:`-only image rule would have made every seeded product unsavable, because the seed stores local `/demo/…` paths; the rule now also accepts those paths. Before shipping an input rule, run it against the values the seed (and existing rows) already hold. Also, `readFormValues` turns a missing field into `""`, so a Zod `.default()` never fires for it: map `""` to `undefined` with `z.preprocess` when blank must mean the default.
