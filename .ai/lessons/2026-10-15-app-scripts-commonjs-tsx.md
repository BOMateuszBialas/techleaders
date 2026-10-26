# 2026-10-15 — `packages/app` scripts run as CommonJS under tsx

The package has no `"type": "module"`, so top-level `await` fails in a `.ts` entry run by tsx. Use `run().then(...)` in CLI entry points, and keep the logic in an injectable, unit-tested `run*` function so the entry needs no coverage exclusion.
