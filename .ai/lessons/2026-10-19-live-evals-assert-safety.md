# 2026-10-19 — Live evals: assert safety, report outcome; "absent" lists must survive faithful output; show the cause code

- A model's outcome (shown or fallback) is nondeterministic, so `npm run eval -- --live` asserts only the safety properties and reports an acceptance rate.
- An `absent` string must be something no correct answer would contain. `"Bluetooth"` on a case whose notes say "no Bluetooth" would fail a faithful draft; leave that to the re-run grounding check.
- The first live smoke hit a bare `provider_error` that the report could not explain. Eval reports now carry the log-safe cause code. Record it whenever a run spends real calls.
- From a worktree, `npx tsx --env-file=../<main checkout>/.env …` uses the root key without copying `.env`.
