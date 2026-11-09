# AI SDLC for a small shop: synthetic case (lesson 23)

Date: 2026-11-09. Status: plan only. Nothing here has been run, measured or observed.

> **SYNTHETIC CASE.** The company, its people, its numbers and its initiative are invented for this exercise. "Nowak Stationery" is a fictional small online shop with four people and a freelance reviewer. It is not a real business, and no figure in this document comes from a real team. The CommerceOS repository is used only as the reference for conventions (`SDLC.md`, `.ai/runs/`, the task card format). Every number that is an assumption is marked **ASSUMPTION**. The evaluation in section 6 is a plan. It has no results, and nothing in it may be quoted as evidence.

## 1. Initiative canvas (fictional)

| Item | Value |
|---|---|
| Initiative | Shorten the time from a merchant's request to a live storefront change, for small changes only (copy, banners, product attributes, filters). |
| Result to show in one quarter | Median calendar lead time for a small change falls from the as-is baseline (section 6) by at least the threshold in section 6.3. No order or payment regression. |
| Sponsor | Shop owner (role). Gives time and a budget cap for tokens and tools, and protects the pilot from ad-hoc requests. |
| Leader | Lead developer (role). Speaks business and technology; owns the harness and the evaluation. |
| Volunteers | One developer (part-time) and the support person, who already checks the storefront every Monday. |
| Expected resistance | Support fears that the agent will change prices or stock; the developer fears review load will grow. Both are addressed by the guardrails in section 4. |

## 2. Process canvas: as-is and choice

Two candidate processes were written as-is:

| Process | As-is owner path | Typical lead time (ASSUMPTION) | Handoffs | Readiness | Impact on result |
|---|---|---|---|---|---|
| A. Small storefront change (copy, banner, attribute) | Owner -> developer -> reviewer (freelancer) -> support -> developer | 5 working days | 5 | High: changes are small and testable | High: this is the work that waits most |
| B. Monthly price-list update from a supplier spreadsheet | Owner -> support -> developer | 2 working days, done monthly | 2 | Low: needs supplier data and money rules | Medium |

Choice: **process A.** It has the most handoffs and waiting time, its changes can be tested in staging, and it does not touch money rules. Process B involves prices, so it needs its own gate first: the agent may advise on a price list, but the merchant decides. Process B is kept for a later cycle and needs a separate gate.

## 3. Process map: idea to release (process A)

### 3.1 Steps, owners (roles), time and handoffs

| # | Step | Owner (role) | Time of work (ASSUMPTION) | Wait before the step (ASSUMPTION) | Handoff out |
|---|---|---|---|---|---|
| 1 | Idea and request, free text with a screenshot | Shop owner | 10 min | 0 | to triage |
| 2 | Triage: accept, reject or defer; set size (S, M) | Lead developer | 5 min | 1 working day | to spec |
| 3 | Write ticket: goal, acceptance criteria, out of scope, open questions | Lead developer | 30 min | 0.5 working day | to build |
| 4 | Implement and write tests in a branch | Developer | 1.5 h | 0.5 working day | to review |
| 5 | Review the pull request (code, tests, guardrails) | Reviewer (freelancer) | 30 min | 1 working day | back to 4 if changes, else to QA |
| 6 | QA on staging against the checklist; test order if checkout is touched | Support person | 45 min | 0.5 working day | back to 4 if failed, else to release |
| 7 | Release to production (merge, deploy, note in changelog) | Lead developer | 15 min | 0 | to post-release check |
| 8 | Post-release check: storefront smoke test, order count, support inbox | Support person | 15 min | 0 | to owner: done |

Totals (ASSUMPTION): about 4 hours of hands-on work across five roles, about 3.5 working days of waiting, so a typical lead time is about 4 to 5 working days. The waiting, not the work, dominates. That is why the pilot targets handoffs first.

### 3.2 Handoffs that the pilot changes

- Steps 2 to 3 (triage to ticket): the agent drafts the ticket from the owner's request, so the lead developer only accepts or corrects it.
- Steps 4 to 5 (build to review): the agent prepares the pull request with tests and a first-pass review, so the reviewer starts from a short list of checked points, not from the raw diff.
- Steps 5 to 6 (review to QA): the QA agent runs the checklist in staging and attaches evidence, so the support person decides instead of clicking through.

### 3.3 Who does what (matrix)

Cell codes: **A** = agent does it alone (human sees the result), **H+A** = agent drafts or runs, a human decides, **H** = human only.

| Step | Shop owner | Lead developer | Developer | Reviewer | Support | Agents |
|---|---|---|---|---|---|---|
| 1 Idea | H | | | | | |
| 2 Triage | H+A (agent suggests size) | H | | | | A (size suggestion) |
| 3 Ticket | | H+A | | | | A (draft ticket, T1) |
| 4 Build | | | H+A | | | A (branch, tests, PR, T2) |
| 5 Review | | | | H+A | | A (first-pass review, comments only) |
| 6 QA | | | | | H+A | A (checklist run, evidence, T3) |
| 7 Release | | H | | | | |
| 8 Post-release | H | | | | H+A | A (log summary) |

Human-only decisions, in every cell where they apply: accepting the ticket, approving the merge, releasing, rolling back, and anything that touches prices, stock values, payments or orders. Gate: any change that touches those paths needs a second human reviewer and a human QA sign-off, whatever the agent says. If a gate and the agent disagree, the human decides.

## 4. Task cards

Format follows the CommerceOS style (goal, input, output, check, who). Each card is one agent task with clear start and end, as lesson 23 requires.

### T1. Draft a change ticket from a merchant request (intake)

- **Goal:** turn a free-text request into a ticket that the lead developer can accept in five minutes or less.
- **Input:** the owner's request text and optional screenshot; the ticket template (`goal`, `acceptance criteria`, `out of scope`, `open questions`); read-only access to the tracker and the storefront's public pages.
- **Output:** a ticket draft in the tracker, labelled `draft-by-agent`. It contains testable acceptance criteria, an explicit out-of-scope list, and open questions. It proposes a size (S or M).
- **Check:** each acceptance criterion can be checked by a yes/no observation; no criterion mentions a price, stock number or payment rule unless the request did; open questions are listed rather than guessed; the draft is under 400 words. The lead developer accepts or edits it. Time limit 10 minutes of agent run (ASSUMPTION).
- **Who:** agent drafts; lead developer accepts (owns the card). Shop owner is the requester.

### T2. Implement a storefront change behind the ticket (build)

- **Goal:** a pull request that meets every acceptance criterion of the accepted ticket, with tests, and nothing else.
- **Input:** the accepted ticket; the repository; the harness instructions file; the test commands (lint, format check, typecheck, unit tests, build).
- **Output:** a branch and a draft pull request with a short description, one test per acceptance criterion, and a run log in `.ai/runs/` (section 5).
- **Check:** every validation command exits 0; the diff touches only the files named in the ticket (or explains why not); no change to checkout, price, stock or payment code without the gate in section 3.3; no secrets; no change to the harness or CI files. The developer reads the diff before marking the PR ready. The reviewer decides.
- **Who:** agent implements; developer owns the card and the PR.

### T3. Verify a release candidate in staging (QA)

- **Goal:** evidence that the checklist passes on staging for the release candidate, with a clear PASS, FAIL or NOT RUN for each check.
- **Input:** the staging URL; the release checklist (home page, a product page, search, add to cart, a test checkout to the demo payment step, the admin product list); the previous run's report; test accounts stored outside the repository.
- **Output:** a report with one row per check: result, time, and a screenshot. A short list of anything unexpected. A run log.
- **Check:** every row has evidence or is marked NOT RUN with a reason; nothing is marked PASS without a screenshot or a recorded response; the agent never runs against production; it creates test orders on staging only and names them in the report. The support person signs off, or rejects, after reading the report.
- **Who:** agent runs the checks; support person owns the card and the sign-off.

## 5. Harness design

### 5.1 Agents and their rights

| Agent | Does | May | May not |
|---|---|---|---|
| Intake agent (T1) | Drafts tickets and size suggestions | Read the tracker and public storefront pages; create a draft ticket with the `draft-by-agent` label | Accept tickets; change labels other than its own; read admin data |
| Build agent (T2) | Implements a ticket | Create a branch; edit files named in the ticket; run the validation commands; open a draft PR; write run logs | Merge; push to the default branch; deploy; edit CI, agent settings or the harness; read or write secrets or `.env` files; change prices, stock values, payments or orders data; use production |
| Review agent | First-pass review of the PR | Read the diff and CI results; post review comments | Approve; merge; request a release |
| QA agent (T3) | Runs the staging checklist and writes evidence | Use a browser against staging; create test orders on staging; write a report | Run against production; change product or price data; sign off |

Rules for every agent: "AI advises; the merchant decides" (the product principle of CommerceOS). Agents propose; humans accept, approve, merge, release and roll back. An agent that cannot finish a step writes that down and stops; it does not work around a failed check.

### 5.2 Guardrails (copied in spirit from CommerceOS)

- Deny rules for secret files and credential folders, and a pre-tool hook that blocks recursive deletion and download-to-shell pipes (CommerceOS `.claude/settings.json` and `.claude/hooks/pre-tool-use.sh` are the reference; the company adopts the same pattern with its own file names).
- The build agent works in its own worktree or branch, so a failed run leaves the default branch untouched.
- Budget cap per run in tokens and minutes (ASSUMPTION: 200 k tokens, 60 minutes per T2 run).
- Changes to guardrails, CI or agent settings are never made by an agent; they go through the lead developer.

### 5.3 Logs

- Location: `.ai/runs/YYYY-MM-DD-<slug>.md` in the repository, one file per autonomous run, the same convention as CommerceOS. Runs of T1 and T3 are logged there too.
- Required fields: task card id; agent and model name; start and end time; human time spent (minutes, per role); validation commands run and their results; files changed; errors, retries and what was done about each; token or cost figure if the tool reports it; the human decision (accepted, changed, rejected) with a reason; link to the ticket and PR.
- Review: the lead developer reads the run logs of the week every Friday (ASSUMPTION: 15 minutes). The logs are the source for the evaluation in section 6.

## 6. Evaluation plan (plan only)

### 6.1 Question

Does the agent-assisted process A shorten the lead time of small storefront changes without a regression in orders, prices or payments, and at no more human cost than the as-is process?

### 6.2 Human baseline (measure before the pilot)

Measure the as-is process for **12 small changes** over four weeks (ASSUMPTION: 12 changes, half of them S and half M). Do not change the process during the baseline. For each change record:

- calendar lead time, from request to production (working days);
- hands-on minutes per role (owner, lead developer, developer, reviewer, support);
- wait time per handoff (from the tracker timestamps, where they exist);
- number of rework loops (review or QA rejections);
- defects found in the first 7 days after release, with severity;
- orders placed in the 7 days after each release, compared with the 7 days before (a simple regression signal, not a causal test).

Also write the owner's estimate of the lead time before each change starts. This is the "what we thought it would take" check that lesson 23 asks for.

### 6.3 Pilot measurement

Run process A with the agents for **12 changes** of the same size mix (ASSUMPTION), with the same measurements. Add per run: agent run time, validation results, token or cost figure, number of human corrections, and the QA result.

### 6.4 Thresholds (ASSUMPTION, to be agreed with the sponsor before the pilot starts)

| Measure | Baseline (to measure) | Go threshold | Stop threshold |
|---|---|---|---|
| Median lead time, working days | from section 6.2 | at least 30% lower | less than 10% lower, or higher |
| Median hands-on minutes per change (all roles) | from section 6.2 | not higher than baseline | more than 20% higher after two improvement cycles |
| Reviewer minutes per change | from section 6.2 | not higher than baseline | more than 30% higher |
| Rework loops per change | from section 6.2 | not higher | higher in two consecutive cycles |
| High-severity defects in the first 7 days | from section 6.2 | zero in price, stock, checkout or payment paths | any in those paths |
| Orders in 7 days after release vs before | from section 6.2 | no drop beyond normal weekly variation (ASSUMPTION: 15%) | a drop that the defect list does not explain |
| Run log completeness | n/a | at least 95% of runs have all required fields | below 80% |

### 6.5 Verdict

- **Go (develop):** all Go thresholds met over the 12 pilot changes. Next step: extend the same process to process B, with its own price gate.
- **Improve:** the lead time gain is between 10% and 30%, or one Stop threshold is hit once and the cause is clear (for example a poor task card or a missing check). Fix the task card, guardrail or check, then run six more changes and measure again.
- **Stop:** any high-severity defect in the price, stock, checkout or payment path that the agent caused; or no lead-time gain after two improvement cycles; or human time above the Stop threshold after two cycles. Record the reason and return the handoffs to the as-is process.

The verdict is decided by the sponsor with the leader, from the measured data, and written to `.ai/analysis/`. A verdict of "improve" is the expected outcome when a pilot starts; a verdict of "stop" is a valid result, not a failure of the exercise.

### 6.6 What this plan does not show

- It does not show that agents are faster than people in general. The baseline is one shop's small changes.
- Twelve changes per phase is a small sample (ASSUMPTION). A single large change can move the median, so report the individual runs next to the median.
- The order-volume comparison is a signal, not proof: seasonality and promotions also move orders.

## 7. Open questions for the pilot

1. Who owns the decision to add a new agent tool or a new token budget? (Proposed: the sponsor, with the lead developer.)
2. Does the company's hosting allow a staging environment that the QA agent can reach? (ASSUMPTION: yes, a staging copy of the shop.)
3. Which test accounts and payment sandbox are used on staging? They must be stored outside the repository.
4. Who is the reviewer when the freelancer is unavailable? (Proposed: the sponsor, for S changes only; M changes wait.)
