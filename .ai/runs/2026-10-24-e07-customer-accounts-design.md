# E07 customer accounts: brief update and spec (design only)

- Date: 2026-10-24
- Goal: turn the owner-approved E07 drafts (D11, brief diff, stories S01–S06, answers P1–P5) into a brief PR and a stacked draft spec PR, plus a cross-model review prompt.

## Steps

1. Read AGENTS.md, SDLC.md, CODE_REVIEW.md, `.ai/lessons.md`, the brief, the backlog, decision records, the admin-auth spec and `server/auth/`, the order actions, use cases and pages.
2. Branch `docs/e07-customer-accounts-brief` (worktree `wt-e07-brief`): added `research/decisions/D11-customer-accounts.md` (English, with P1–P5), applied the brief diff as new rows only (R08–R10, N06, D11, glossary, key flow, scope, DoR), and listed E07 in `backlog.md` as planned, not filed.
3. Branch `docs/e07-customer-accounts-spec` stacked on it (worktree `wt-e07-spec`): wrote `.ai/specs/2026-10-24-customer-accounts.md` with Phase 0 spike, Phases 1–3, an authorization test plan and a placeholder for the cross-model review; ran a fresh-context review and applied it.
4. Wrote the Polish cross-model review prompt in the session scratchpad.

## Decisions

- R08 and D11 in the brief name the public order and demo payment pages explicitly (owner answer P2).
- Spec defaults needing confirmation: A6 (reuse `BETTER_AUTH_SECRET`), A9 (sign-up cannot hide that an email is registered without email verification; the draft's AC asked for that).
- No GitHub issues filed (om-backlog does it after the brief merges). Nothing merged.

## Outcome

Brief PR (ready, user merges) and spec PR (draft, stacked). `npm run lint` and `npm run format:check` pass on both branches.

## Follow-ups

- Paste the spec into ChatGPT or Gemini with the prompt; fill "Recenzja innym modelem".
- Run the Phase 0 spike and fill "Spike results" before the spec PR merges.
- After the brief merges: `om-backlog` files E07.
