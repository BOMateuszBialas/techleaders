# Eval script: one command for the Copilot and description evals, with an opt-in live run

- Backlog: P1 item "an eval script" (AGENTS.md "Scope", MVP spec §3 P1 and §"AI evaluation": "a small repeatable evaluation script"). No story issue yet.
- Status: **proposed** (2026-10-19).
- Design authority: `.ai/specs/2026-10-13-commerceos-mvp.md` §"AI evaluation"; AGENTS.md "Commerce Copilot rules" (Evaluation), "Testing", "Security and validation"; `.ai/specs/implemented/2026-10-17-commerce-copilot.md` A4, A19 ("a live run against a real provider is the P1 eval script"); `.ai/specs/implemented/2026-10-18-ai-product-descriptions.md` A2, A13, A16, step 7.
- **Entry gate:** P0 stable (met); both eval sets exist in `packages/ai/src/evals/` (met).

## 📝 TLDR

Today the Copilot eval set (`run-evals.test.ts`) and the description eval set (`run-description-evals.test.ts`) run only inside the Vitest unit suite, against scripted models; the output is a test log, and nothing can run the same cases against the real model. **Proposed (future behaviour):** `npm run eval` runs both sets with the scripted models and prints a readable report (one row per case, each property pass/fail, a summary, exit code 1 on any failure). `npm run eval -- --live` runs a flagged subset against the provider configured in `LLM_*`, bounded by an explicit call budget (default 5, hard ceiling 20), refuses to run under CI, and never prints prompts, model text or the key. The property checks move out of the two test files into one module that both the tests and the script call, so there is one definition of "passing".

## 📝 Resolved assumptions (autonomous defaults)

Each was an Open Question. The answer is the most reversible option with the least new surface. None changes what data leaves the system beyond what the Copilot (A3) and the descriptions spec (A1) already send, so none is marked ⚠; all are listed for override.

| #   | Question | Default chosen | Rationale |
| --- | -------- | -------------- | --------- |
| A1  | Where does the script live, and how does it read the LLM settings? | **`packages/ai/src/evals/cli/`**, run with `tsx` from a root `npm run eval`. The entry loads the root `.env` only in live mode (a `loadEnvFileIfPresent` helper like `run-create-owner.ts`: a missing `.env` is not an error, and variables already set win) and validates **only** `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` with a small Zod schema that mirrors `packages/app/src/server/env.ts` (blank = unset; provider `gemini`; key and model required). The CLI builds `GeminiLlmProvider` itself | The evals already live in `ai`; `ai` may not import `app` or `database`, and the app's `getEnv()` requires `DATABASE_URL` and `BETTER_AUTH_SECRET`, which an eval run does not need. The schema is three fields; a unit test pins parity with `parseEnv` for them (same accepted and rejected values). AGENTS.md "Testing" names this as the one documented exception to "read env only through `getEnv()`" |
| A2  | Live budget: the store's shared daily cap or its own? | **Its own explicit budget**: `--max-calls` (default **5**, hard ceiling **20**, counted per `generateStructured` attempt, retries included). A case starts only when the remaining budget covers its worst case (2 attempts); the rest are reported as `skipped (budget)`. A budget-enforcing provider wrapper also refuses any call past the budget. The store's `copilot:llm:day` bucket is **not** touched | The script runs without a database (`ai` cannot reach `rate_limit_buckets`), and a developer run must not eat the store's 100 daily attempts. The ceiling bounds one run to 20 calls; the provider's own free-tier quota still applies |
| A3  | Which cases run live? | A **flagged subset** (`live: true` on the case): cases whose input is what is being evaluated, not a scripted failure. Copilot: `grounded-answer`, `prompt-injection-obeyed` (injected store; it carries the `absent` list for the injected claim), `insufficient-data`, `traffic-demo-labels`. Descriptions: `grounded-mouse`, `injection-in-notes-obeyed`, `injection-in-name`, `feature-negated-in-notes` (no `absent` list: a faithful draft may say "no Bluetooth"; `draft_rechecked` catches a Bluetooth claim), `commerce-talk-from-notes`, `demo-product`. **`--live` runs only flagged cases** (offline runs every case). Order: alternating between the sets (Copilot, description, Copilot, …), each in file order; `--set` and `--case` narrow it | Scripted failures (timeout, invalid JSON, 429) test our code, not the model; running them live is meaningless. `causal-claim` is left out: its `absent` phrase comes from the scripted reply, so live it would assert almost nothing. With the default budget of 5, two cases run (the grounded Copilot answer and the grounded mouse draft); a larger budget or `--case` reaches the rest |
| A4  | What does "pass" mean live, where the model is nondeterministic? | **Safety properties are pass/fail; the outcome is an observation.** Live, the expected `origin`/`kind`, `fallbackReason` and call count are not asserted: a rule-based fallback after a rejected draft is a correct, safe result. Every other property is asserted exactly as offline (contract valid, no `absent` text shown, demo labels, fallback equals the rules answer, real related ids only, no id or SKU sent, canonical question, a shown draft passes the checks again, log holds no field value). The summary reports the **acceptance rate** (model answers shown / live cases run), the rate both AI specs say the evals track | AGENTS.md: "Assert properties, not exact wording". A model that triggers the fallback is a quality signal, not a safety failure |
| A5  | What if the provider fails live (auth, quota, timeout)? | The case is reported `unavailable (<reason>)`, not failed; its safety properties are still checked. After the **provider** fails with `auth`, `not_configured` or `rate_limited` (read from the recording wrapper's own record of the provider error, so a budget refusal, which has its own cause `eval_budget`, never counts as a provider 429), the run **stops** scheduling live cases (no budget burnt on a dead key). Exit code 1 if a property failed; **3 when no live case completed** (every one unavailable or skipped), so a dead key never looks like a green run; otherwise 0. The summary names the reason | A dead key is an environment problem, not an eval failure; stopping saves the free-tier quota |
| A6  | Report format and storage | **Plain text** to stdout by default (one line per case, the failing properties with a log-safe detail, then a summary); `--format json` prints the same data as JSON; `--format markdown` prints a table (for a PR comment or a CI job summary). Nothing is written to disk, and no report is committed | Readable in a terminal demo; machine-readable on request; no new artefact directory. Live results are nondeterministic, so committing them would churn |
| A7  | Does CI run the script? | **No new CI job.** CI already runs the same checks through the unit suite (the tests call the shared module). The offline mode needs no env, network or database, so a later CI step (`npm run eval -- --format markdown >> $GITHUB_STEP_SUMMARY`) is a one-line addition. Live mode **refuses to start when `CI` is set** (exit 2), whatever the flags | Keeps the gate in `.ai/agentic.config.json` and `ci.yml` unchanged; AGENTS.md "CI never calls a real provider" |
| A8  | What may the report print? | Case id, set, the property names with pass/fail, a detail built only from eval-authored constants (for example "shown text contains a forbidden string: 'FREE SHIPPING'"), the outcome (`llm`, `rules: invalid_output`, `draft`, `unavailable: timeout`), attempts, latency, token counts, description issue codes, model id, prompt versions. **Never** the prompt, the model's text (summary, recommendations, draft), field values beyond the case id, or any `LLM_*` value except the model id | Same rule as the `copilot.answer` and `description.draft` logs (Copilot #27, descriptions A13); a demo screen can show the report safely |
| A9  | One spec or two (offline report, live mode)? | **One spec, one PR.** Live mode reuses the runner and report; the offline report alone is the main deliverable and works without it | Scope-cohesion check: live mode is not independently useful without the runner |
| A10 | Interactive confirmation before live calls? | **No prompt.** `--live` is the opt-in; the script prints the provider, model and budget before the first call | Prompts block unattended use; the flag plus the budget is the guard |

## 📝 Problem Statement

- The MVP spec asks for "a small repeatable evaluation script"; the Copilot spec (A19) and the descriptions spec (A16) both deferred the live run to this P1 item. Today the eval sets are only Vitest tests: a demo shows `✓ grounded-answer…` lines, not which property passed, and there is no summary.
- No command runs the cases against the configured model, so "the evals track the rejection rate" (Copilot spec, risks; descriptions spec, step 11) has no tool behind it: the last smoke tests were hand-written scripts (lessons 2026-10-18 and 2026-10-19).
- The property checks are written inline in two test files; a script that re-implemented them would drift from the tests.

## 📝 Proposed Solution

1. **Shared checks.** Move the per-case property checks out of `run-evals.test.ts` and `run-description-evals.test.ts` into `evals/runner/` as pure functions returning a list of `{ property, passed, detail }`. Each existing `expect` becomes one named property. The two test files keep their structure (one `it` per case, the coverage and injection tests) and assert that every property passed, printing the failing ones. Behaviour is unchanged: same cases, same assertions.
2. **Runner and report.** A runner executes a list of cases with a provider factory (scripted offline, real live) and returns a report object; a formatter renders text, markdown or JSON.
3. **CLI.** `runEvalCli({ argv, env, write, createLiveProvider })` parses flags, runs, writes the report and returns an exit code; a thin entry calls it (the `create-owner.ts` pattern, so the entry is unit-tested too).
4. **Live mode.** `--live` swaps each flagged case's scripted provider for the real one wrapped in a budget counter, with live expectations (A4).

**Alternatives considered.**

| Option | Why not |
| --- | --- |
| A Vitest project `eval-live` with `LIVE=1` | Vitest output is still a test log; the budget and "never in CI" rules would hide in config; harder to demo |
| promptfoo or a similar eval framework | A new dependency and a second definition of the cases and properties; our checks are code (grounding, rule equality), not string asserts |
| Live run through the running app's API (`POST /api/admin/copilot/answers`) | Needs a database, a session and the seeded store; draws on the store's daily cap; measures the seeded store instead of the fixed eval stores |
| Counting live calls against `copilot:llm:day` | Needs the database from `ai` (forbidden boundary) or a CLI in `app`; a developer run would cut the demo store's daily answers |

## 📝 Architecture

```mermaid
flowchart LR
  cli["npm run eval (new)<br/>evals/cli/eval.ts → run-eval-cli.ts"]:::new
  runner["evals/runner (new)<br/>run cases, collect properties"]:::new
  checks["evals/runner checks (new, moved<br/>from the two test files)"]:::new
  report["evals/runner/format-report (new)"]:::new
  tests["run-evals.test.ts / run-description-evals.test.ts (existing, slimmer)"]
  cases["eval cases (existing, + live flag)"]
  uc["AskCopilotUseCase / DraftProductDescriptionUseCase (existing, unchanged)"]
  scripted["ScriptedLlmProvider (existing)"]
  budget["BudgetedLlmProvider (new)"]:::new
  gemini["GeminiLlmProvider (existing)"]
  cli --> runner --> uc
  tests --> runner
  runner --> checks
  runner --> cases
  cli --> report
  uc --> scripted
  uc --> budget --> gemini
  classDef new fill:#e6f4ea,stroke:#2e7d32
```

Takeaway: the script and the unit tests share one runner and one set of checks; the use cases, prompts, grounding and adapters run unchanged, so a live run measures exactly what production would show for the eval stores.

| Package | Path | Purpose |
| --- | --- | --- |
| `ai` | `evals/runner/copilot-eval.ts` | `buildEvalCopilot(store, provider)` (moved from the test), `runCopilotCase(case, provider, mode)` → `CaseResult` with properties |
| `ai` | `evals/runner/description-eval.ts` | Same for descriptions (`buildEvalDescriptionUseCase`, `runDescriptionCase`) |
| `ai` | `evals/runner/case-result.ts` | `PropertyResult`, `CaseResult` (`set`, `id`, `covers`, `mode`, `status: passed | failed | unavailable | skipped`, `outcome`, `attempts`, `latencyMs`, `usage`, `issueCodes`, `properties`) |
| `ai` | `evals/runner/run-eval-suite.ts` | Selects cases (`--set`, `--case`, live flag), applies the budget reservation, stop rules (A5), builds `EvalReport` with the summary (counts, acceptance rate) |
| `ai` | `evals/runner/budgeted-llm-provider.ts` | Decorator over `LlmProviderPort`: counts attempts, refuses past the budget with `LlmProviderUnavailableError` (`rate_limited`, cause `eval_budget`), exposes `used` |
| `ai` | `evals/runner/format-report.ts` | `text`, `markdown`, `json` renderers; only the fields A8 allows |
| `ai` | `evals/cli/live-eval-env.ts` | Zod schema for the three `LLM_*` variables (A1) |
| `ai` | `evals/cli/run-eval-cli.ts` | Flag parsing (`--live`, `--max-calls`, `--set copilot|descriptions`, `--case <id>` repeatable, `--format text|markdown|json`, `--help`), CI refusal, exit codes |
| `ai` | `evals/cli/eval.ts` | Entry: loads the root `.env` in live mode, calls `runEvalCli`, sets `process.exitCode` |
| `ai` | `evals/cases/*.ts`, `evals/descriptions/description.cases.ts`, `evals/eval-case.ts` | `live?: true` on the A3 cases |
| root | `package.json` | `"eval": "tsx packages/ai/src/evals/cli/eval.ts"` (`tsx` is already a root devDependency) |

Boundaries: everything stays in `ai` (imports `core` and its own modules; the Gemini SDK is still imported only by `GeminiLlmProvider`). No app, database or DI change. `@commerceos/ai/evals` keeps its "never import from app code outside tests" rule.

## 📝 API Contracts

No HTTP or schema change. The new developer-facing contract is the command:

```
npm run eval [-- [--live] [--max-calls N] [--set copilot|descriptions] [--case ID]... [--format text|markdown|json]]
```

| Exit code | Meaning |
| --- | --- |
| 0 | No property failed and (live) at least one case completed |
| 1 | At least one property failed |
| 2 | Usage or configuration error: unknown flag or case id, `--max-calls` outside 1–20, `--live` without a valid `LLM_*` configuration, `--live` with `CI` set |
| 3 | Live only: no case completed (all unavailable or skipped), e.g. a rejected key or an exhausted quota |

Text report shape (illustrative, not a wording contract):

```
CommerceOS evals · offline (scripted models) · 43 cases
copilot  grounded-answer           PASS  llm · 1 attempt
copilot  fabricated-number-twice   PASS  rules: invalid_output · 2 attempts
descr.   invented-brand            FAIL  unavailable: invalid_output · 2 attempts
         ✗ absent_text: shown result contains a forbidden string: "Logitech"
Summary: 44 passed, 1 failed · properties 301/302
```

Live adds a header line (`live · gemini · <model> · budget 5 calls`), per-case latency and tokens, and a summary line `live: 2 run, 3 skipped (budget) · accepted 2/2 · calls used 2/5 · tokens in/out/thinking`.

## 📝 Edge Cases & Failure Scenarios

| Scenario | Behaviour |
| --- | --- |
| `--live` without `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL` (lesson 2026-10-19: `.env` may hold the key only) | Exit 2: "Live evals need LLM_PROVIDER=gemini, LLM_API_KEY and LLM_MODEL", naming the missing variable names, never their values |
| `CI` set (any non-empty value) with `--live` | Exit 2 before any env read or network call |
| `--max-calls 0`, `21`, `abc` | Exit 2 with the allowed range |
| Budget smaller than one case's worst case (1) | No live case runs; all `skipped (budget)`; exit 0 with the reason in the summary |
| A case's second attempt would exceed the budget | Cannot happen (2 reserved per case); the wrapper still refuses as a safety net and the case shows `unavailable: rate_limited (eval_budget)` |
| Provider `auth`/`rate_limited`/`not_configured` live | Case `unavailable`; later live cases `skipped (provider)` (A5) |
| Provider timeout live | Case `unavailable: timeout`; the run continues (a timeout can be transient) |
| A live answer mentions an `absent` string (injection obeyed and not caught) | Property `absent_text` fails, exit 1: the exact signal the eval exists for |
| Unknown `--case` id | Exit 2 listing the valid ids of the selected set |
| `--case` names a case without `live: true` in live mode | Exit 2: "not a live case" (scripted-failure cases cannot run live) |
| Offline run with `LLM_*` set in the shell | Ignored: offline never builds a real provider and never loads `.env` |

## 📝 Risks & Impact Review

- **Refactoring the eval tests.** Moving the checks must not weaken them. Mitigation: each existing `expect` maps to exactly one named property (listed in step 1), the tests assert all properties pass, and a unit test feeds deliberately broken answers to each check to prove it can fail.
- **Spending.** At most 20 calls per run on a free-tier key ($0); the budget cannot be raised by a flag. A paid key would cost a few cents per run at Flash prices.
- **Data sent live.** The same payloads the app sends (Copilot A3, descriptions A1) built from the fictional eval stores and seeded product copy: no personal data.
- **Live flakiness.** Nondeterministic outcomes are never a failure by themselves (A4), so the script is safe to demo; a failing safety property live is a real finding to file.
- **Reversibility.** Additive: one npm script, new files under `evals/`, an optional field on cases. Removing the script leaves the unit evals intact.

## 📝 Decisions in play

Relies on product-brief R01 (evidence), R05 (no causation), R06 (no fabricated answer), R07 (demo labelling), D08 (demo traffic). Supersedes nothing. Copilot A19 and descriptions A16 named this spec as the place for the live run.

## 📋 Phasing

One phase, one PR (`risk-medium`: evals and a script that can call a real provider; no runtime change to the app).

## 📋 Implementation Plan

1. **Shared checks (refactor, no behaviour change).** `case-result.ts`, `copilot-eval.ts`, `description-eval.ts`. Copilot properties: `outcome` (kind, origin, fallbackReason, attempts; offline only), `contract`, `absent_text`, `missing_data`, `demo_labels`, `fallback_is_rules`, `no_ids_sent`, `canonical_question`, `related_ids_real`. Description properties: `outcome` (kind, reason, attempts; offline only), `issue_codes` (offline only), `absent_text`, `draft_rechecked`, `demo_marked`, `no_partial_draft`, `no_ids_sent`, `log_has_no_values`. Rewrite both test files on top of them; unit tests that each check fails on a broken input (every failure branch and its detail, for the 100% gate). Lands as its own commit so review can map each former `expect` to one property. `npm test` shows the same cases passing.
2. **Runner and report.** `run-eval-suite.ts` (selection, summary), `format-report.ts` (text, markdown, json), unit tests with scripted providers and a failing fake case.
3. **CLI, offline.** `run-eval-cli.ts`, `eval.ts`, root `npm run eval`; tests for flags, exit codes, `--help`, unknown ids; the entry's test mocks `runEvalCli` (create-owner pattern).
4. **Live mode.** `live?: true` flags (A3), `live-eval-env.ts`, `budgeted-llm-provider.ts`, live expectations (A4), stop rules (A5), CI refusal; unit tests with a fake live provider (budget reservation, refusal past budget, stop after `auth`, skip messages, no model text in any format).
5. **Docs and smoke.** README "Tests and CI" and "Commerce Copilot" (how to run, what live sends, the budget, never in CI), AGENTS.md "Testing" one line (the command, and the A1 env exception), `.env.example` unchanged (no new variable). Manual live smoke with the root `.env` key, **at most 5 calls**, recorded in the run log (counts and outcomes only). Full gate; move this spec to `implemented/`.
