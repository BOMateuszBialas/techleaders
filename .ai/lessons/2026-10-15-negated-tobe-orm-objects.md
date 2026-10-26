# 2026-10-15 — Negated `toBe` on ORM objects can take seconds (flaky CI timeout)

`expect(fresh.cradle.orm).not.toBe(orm)` made Vitest serialise the MikroORM instance. With 5 more entities that took 1.4 s locally and over 5 s in CI (test timeout on 3 of 5 runs), while `main` stayed fast. Compare identity with `===` and assert the boolean, the same rule as for cradle proxies. Profile a slow test step by step before guessing.
