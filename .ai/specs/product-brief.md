# CommerceOS — product brief

- Date: 2026-10-14
- Mode: own; Owner: product owner (project author); Pass: full
- Evidence basis: one practitioner account from the project author, who builds Shopify stores for clients (not an independent interview; no single dated case, no frequency or cost). Everything else is the team's decisions (D01–D07), the MVP specification, and workshop hypotheses from the discovery pack. No merchant interviews, data or checked benchmarks exist yet. Most consequential untested belief: A03, that order, catalog and stock data alone support useful "improve sales" advice.
- Coverage (last counted 2026-10-14, before D08 and D09): 35 claims — 32 sourced (interview 4, data 0, document 18, product 10, benchmark 0), 0 synthetic, 3 assumed; 1 entries on the collection plan. Tagged-line totals: the 4 interview lines come from one non-independent account, and the 18 document lines are the team's own decisions.
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: product owner, for the portfolio path only (D04); ready for: implementation planning of the whole MVP P0 scope (D01), including the Copilot week since Q05 and Q01 were decided on 2026-10-15 (D08, D09) and the spec was updated. Not ready for any market-facing claim; the problem rests on one non-independent account (see DoR addendum). Customer accounts (D11) are ready for spec writing; the motivation is a course requirement, not shopper evidence.
- Updated: 2026-10-24 (D11 adds customer accounts as a second role, for the course certificate; D08, D09 answer Q05 and Q01; D10 switches the demo catalog to gaming accessories)
- Sources: `.ai/specs/research/interviews/2026-10-14-practitioner-shopify-builder.md`, `.ai/specs/research/decisions/D01`–`D11`, `.ai/specs/2026-10-13-commerceos-mvp.md`, `.ai/specs/research/2026-10-14-*.md` (discovery pack: hypotheses, plans and templates, no research results)

## Decision summary

The decision is to build CommerceOS as a 5-week portfolio and course project (D04) with the scope of the MVP specification (D01). It is agreed by the product owner.
The problem it aims at comes from the owner's practitioner experience: small-store owners have analytics data but do not know which changes to make, and agencies they hire recommend changes from misread or incomplete tracking data (see Problems). That is one practitioner's generalized account. No store owner has been interviewed.
Now: a storefront, an admin, and a Commerce Copilot that recommends actions using only the store's own order, catalog and stock data, with the evidence shown and no autonomous changes (D01, D02, R01–R06). Store management itself must be clear enough that the owner sees cause and effect (D05).
Also Now (D11): shoppers may create a customer account. Orders placed while signed in are attached to the account and listed under "My orders"; guest checkout stays. A customer never sees another customer's orders and never reaches the admin (R08–R10). This is added for the course certificate's two-role requirement, not from shopper evidence.
**Gap and how Now handles it:** the practitioner's described gap is missing sessions, traffic and conversion data. The spec's approved Copilot tools cover only orders, line items and stock (spec §6). The owner therefore added fictional traffic and conversion data with a bounded Copilot tool to the demo (D07), which widens D01. It is P0 in a minimal form: sessions by source, the store funnel and per-product views, read by `getTrafficSummary` (D08). Copilot answers seven named questions and declines those needing data the demo lacks (D09). The demo shows the idea on fictional data only; a real tracking source is Later (Q04). Copilot keeps the primary question and names any data it does not have (D06). Problem and target users remain an untested hypothesis (A01, A02).
Next: plan implementation and file the backlog, Copilot included (owner: product owner). Check which team-chosen merchant questions the approved tools can answer (A03). This tests answerability only, not usefulness to owners. Optionally collect concrete client cases (Collection plan).

## Vision

Help small online-store owners go from their store's own data to a concrete, explainable decision about what to change. This is the team's intended direction, not a demonstrated benefit. `[DOCUMENT]` decisions/D05, `.ai/specs/research/2026-10-14-miro-board-vision-target-needs.md`

## Target group and stakeholders

- Customer (pays): not relevant on the portfolio path (D04); deferred.
- User (uses): owner of a small online store (chosen; medium and large stores later). `[DOCUMENT]` decisions/D05
- User situation (hypothesis, not the chosen definition): an owner who has analytics data but does not know which changes to make. This rests on one practitioner's account; see Problems and A01.
- Secondary user: the store's shopper, who browses and checks out as a guest or with an optional customer account that lists their own orders. `[PRODUCT]` `.ai/specs/2026-10-13-commerceos-mvp.md` §2, §3; `[DOCUMENT]` decisions/D11
- Stakeholders: course and portfolio reviewers, who judge engineering quality and the demo. `[DOCUMENT]` decisions/D04
- Decider for scope decisions: product owner (project author).

## Problems, with evidence

- Store owners, even with analytics data, often do not know how or which changes to make so the store performs better. Agencies they hire give advice the practitioner judges wrong or ineffective. This is one practitioner's generalized account, with no single case, frequency or cost. `[INTERVIEW]` interviews/2026-10-14-practitioner-shopify-builder.md
- Agencies often set up a single simple tool without server-side tracking, so in the practitioner's words analytics covers "around 20%" of real data, and they still recommend changes from it. The 20% is the participant's own figure, not a measurement. `[INTERVIEW]` same note, follow-up
- The missing part of that data was sessions, traffic and conversion, not orders or revenue. `[INTERVIEW]` same note, second follow-up
- Inferred, untested: the cause is incomplete data plus misinterpretation, and an owner would act on recommendations derived from complete first-party store data (see A01, A02).

## Product and how it stands out

- What it is: a single-store e-commerce app (storefront and admin) with Commerce Copilot, an advisor using the store's own data (see Scope). `[PRODUCT]` `.ai/specs/2026-10-13-commerceos-mvp.md` §1
- What could make it different (hypothesis): recommendations computed from the store's own transactional records (orders, line items, stock), with the numbers, period and limitations shown, rather than from partial client-side tracking (A02).

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

Deferred: the pack holds a benchmark plan only (`2026-10-14-miro-board-competitors-benchmark.md`). Nothing has been checked, and the portfolio decision does not depend on it.

## Goals and success criteria

- Business goal: deliver a portfolio-quality MVP in 5 weeks that meets the spec's final acceptance criteria (D01, D04). `[PRODUCT]` `.ai/specs/2026-10-13-commerceos-mvp.md` §14
- User outcome: the owner can answer a concrete question about the store and decide what to do next, seeing the evidence behind each recommendation. This is a hypothesis from the pack, not observed (A01).
- Primary metric, baseline, threshold, date: not set. Candidate demo measures from the pack are the share of merchant questions answerable from available data, calculation correctness on a fixed question set, and the share of recommendations with evidence and limitations. Thresholds are open (Q02).
- What must not get worse: AI grounding, server-side validation, authorization, order consistency and setup docs are never cut for time. `[PRODUCT]` `.ai/specs/2026-10-13-commerceos-mvp.md` §11 scope adjustment rule

## Scope

- **Now:** the P0 of the MVP spec, which includes the minimal fictional traffic and conversion data and its one bounded Copilot tool (D07, D08): storefront, admin with real metrics and CRUD, orders, stock, and Copilot's one workflow of a performance summary plus 3 prioritized recommendations with evidence (D01). Store management is built to make cause and effect clear to the owner (D05). Customer accounts with "My orders" beside guest checkout (D11). Rules R01–R10 apply.
- **Later:** a real traffic or conversion tracking source (Q04); P1 items, including AI-drafted product descriptions (spec §3 P1; named by the owner in D05). Also medium and large stores (D05), and a real-product path with merchant interviews (D04).
- **Not doing:** see Non-goals.

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Paid order | Order whose verified payment state is paid | spec §6 | admin |
| Revenue | Paid-order totals under one documented definition (which states, tax and shipping are included) | spec §6 | admin, Copilot |
| AOV | Revenue divided by included orders; "not enough data" when zero | spec §6 | admin, Copilot |
| Top products | Ranked by paid order line items over a stated date range | spec §6 | admin, Copilot |
| Low stock | Published product at or below a configurable threshold | spec §6 | admin, Copilot |
| Recommendation | Copilot output: title, priority, observation, evidence, reasoning, suggested action, limitations | spec §6 | admin |
| Customer account | A shopper's self-registered account (role `customer`); separate from the owner account | D11 | customer |
| Account order | An order placed while signed in as a customer, attached to that account by the server; opened only with that customer's session | D11 | customer (own only), admin |
| Guest order | An order placed without an account; reachable only through its secret reference | spec §3 | shopper with the reference, admin |

## Key flows

- Current state (as described from client work): the owner has analytics, often from a single client-side tool with incomplete coverage. They hire an agency, the agency recommends changes from that data, and the advice often proves ineffective. `[INTERVIEW]` interviews/2026-10-14-practitioner-shopify-builder.md
- Future state, decided steps:
  1. A shopper buys with a test or demo checkout.
  2. The order appears in the admin.
  3. The owner asks Copilot "What should I focus on to improve sales this week?"
  4. Copilot calls approved metric tools.
  5. It returns up to 3 recommendations with evidence, next step and limitations.
  6. The owner saves, dismisses or completes each one.

  `[PRODUCT]` `.ai/specs/2026-10-13-commerceos-mvp.md` §2
- Customer account flow (D11), decided steps:
  1. A shopper registers or signs in, or continues as a guest.
  2. Checks out; a signed-in order is attached to the account by the server.
  3. Opens "My orders" and sees only their own orders, read-only.
  4. Opening another customer's order, or the admin, shows "not found" or the sign-in page, never the data.

  `[DOCUMENT]` decisions/D11

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Every metric value and product id in a Copilot answer comes from approved tool results; the answer shows the period and numeric basis, and says so plainly when data is missing | Copilot | `[DOCUMENT]` decisions/D02; spec §6 | active | trigger: change of D02 | superseding row approved by product owner | product owner | none |
| R02 | AI advises, the merchant decides: Copilot never changes products, prices, stock or orders and never issues refunds | Copilot | `[DOCUMENT]` decisions/D02; spec §1 | active | trigger: change of D02 | superseding row approved by product owner, with permissions, audit and failure scenarios (D02) | product owner | none |
| R03 | Checkout never implies a real payment; sandbox or clearly labelled demo; card data is never stored | checkout | `[DOCUMENT]` decisions/D03 | active | trigger: change of D03 | superseding row approved by product owner | product owner | none |
| R04 | Price and stock are validated server-side at checkout; stock cannot be oversold | checkout, orders | `[PRODUCT]` spec §3, §14 | active | unknown | superseding row approved by product owner | product owner | none |
| R05 | Metric definitions are documented in code and UI and used consistently; no causal claims from correlations | admin, Copilot | `[PRODUCT]` spec §6 | active | unknown | superseding row approved by product owner | product owner | none |
| R07 | Demo and seed data are clearly presented as demo data, never as real customer or store data | admin, Copilot, demo | `[PRODUCT]` spec §9, §12 rule 6; decisions/D07 | superseded by R11 (2026-10-26) | unknown | superseding row approved by product owner | product owner | none |
| R06 | When the LLM is unavailable, the UI shows an explicit fallback or deterministic insights, never a fabricated answer | Copilot | `[PRODUCT]` spec §3 | active | unknown | superseding row approved by product owner | product owner | none |
| R08 | A customer sees and reaches only orders attached to their own account; ownership is decided on the server from the session on every page, action and API, including the public order and demo payment pages; another customer's order answers "not found", never revealing that it exists | customer accounts, orders | `[DOCUMENT]` decisions/D11 | active | trigger: change of D11 | superseding row approved by product owner | product owner | none |
| R09 | Roles are separate: a customer session never grants admin access and an owner session is not a customer session; customer accounts cannot become owners through any request | auth, admin | `[DOCUMENT]` decisions/D11; admin-auth spec Q2/Q4 | active | trigger: change of D11 | superseding row approved by product owner | product owner | none |
| R10 | Guest checkout remains available; an account is never required to buy, and the order owner is set by the server, never by submitted data | checkout | `[DOCUMENT]` decisions/D11 | active | trigger: change of D11 | superseding row approved by product owner | product owner | none |
| R11 | Demo data is labelled as demo data wherever fictional figures appear as results: the admin dashboard, the demo traffic views and Copilot answers (D08). Machine markers stay in the database: `DEMO-` SKUs and `DEMO-` order references, with the demo badge on those orders. The storefront shows no demo banner and no "demo store" wording. Its demo framing is limited to the payment note "Test payment. No money is taken.", the fictional company block in the footer, the labelled example values on the product page and the labelled example delivery text. Product, category and customer text carries no "[DEMO]" prefix | admin, Copilot, storefront, checkout, demo | owner decision 1 (2026-10-26; owner answers Q1, Q3, Q4, Q7); D08 | active | trigger: a real customer, a real payment, or a change of D08 | superseding row approved by product owner | product owner | R07 |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Multi-store or multi-tenant SaaS, marketplace | 5-week single-store scope | product owner | active | trigger: change of D01 | superseding row approved by product owner | `[DOCUMENT]` decisions/D01 | none |
| N02 | Real payments, shipping, refunds or tax automation | scope and risk (D03) | product owner | active | trigger: change of D01/D03 | superseding row approved by product owner | `[DOCUMENT]` decisions/D01, D03 | none |
| N03 | Integration with Shopify or other external commerce platforms | 5-week scope | product owner | active | trigger: change of D01 | superseding row approved by product owner | `[DOCUMENT]` decisions/D01 | none |
| N04 | Autonomous AI actions on store data | trust and testability (D02) | product owner | active | trigger: change of D02 | superseding row approved by product owner | `[DOCUMENT]` decisions/D02 | none |
| N05 | A custom analytics warehouse or event-streaming platform | excluded by the MVP spec. Separately, the spec §6 tool list includes no traffic or conversion source; D07 adds a fictional one for the demo, but no real tracking | product owner | active | trigger: change of D01 | superseding row approved by product owner | `[PRODUCT]` spec §3 out of scope, §6 tools | none |
| N06 | Customer self-service beyond reading own orders: order cancellation or returns, profile and address book, password reset or email verification by email, social login, attaching past guest orders to an account, account deletion | keeps D11 to the certificate's isolation proof; no email service exists; claiming orders by an unverified email would leak other people's orders | product owner | active | trigger: change of D11 | superseding row approved by product owner | `[DOCUMENT]` decisions/D11 | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-10-14 | 5-week MVP scope: one demo store, catalog, demo checkout, orders, admin, Copilot with bounded tools | full end-to-end flow plus AI within 5 weeks | product owner | active | trigger: discovery evidence plus a time estimate showing a change matters more | superseding row approved by product owner | `[DOCUMENT]` decisions/D01 | none |
| D02 | 2026-10-14 | Copilot is grounded in explicit tools and makes no changes itself | lowers the risk of invented metrics and unwanted actions; testable | product owner | active | trigger: proposal to let Copilot act | new decision with tests, explicit confirmation, permissions and audit | `[DOCUMENT]` decisions/D02 | none |
| D03 | 2026-10-14 | Payments are test or demo only | real payments add scope and risk the portfolio does not need | product owner | active | trigger: real-product path | superseding row approved by product owner | `[DOCUMENT]` decisions/D03 | none |
| D04 | 2026-10-14 | Build as a portfolio/course project; the merchant problem is accepted as an untested hypothesis | chosen over first validating with interviews (alternative offered by the agent) | product owner | active | trigger: decision to pursue a real product | superseding row approved by product owner; run merchant interviews first | `[DOCUMENT]` decisions/D04 | none |
| D06 | 2026-10-14 | Keep Copilot's primary question and the §14 criterion; answer from available data and name what is unknown (traffic, conversion); the demo uses fictional seeded data | chosen over changing the demo question (option a, offered by the agent) | product owner | active | trigger: a traffic or conversion data source is added | superseding row approved by product owner | `[DOCUMENT]` decisions/D06 | none |
| D07 | 2026-10-14 | Seed fictional traffic and conversion data and give Copilot one bounded tool to read it; widens D01 | lets the demo show the primary question drawing on traffic and conversion data; the real gap the practitioner describes stays open (Q04) | product owner | active | trigger: a real tracking source is added (Q04) | superseding row approved by product owner; update spec §3 and §6 | `[DOCUMENT]` decisions/D07 | none |
| D08 | 2026-10-15 | Fictional traffic data is P0 (minimal): daily sessions by source, store funnel, per-product views; read by `getTrafficSummary`; conversion is store-wide only | without it the demo misses the practitioner's gap; per-product views make recommendations actionable | product owner | active | trigger: Copilot week runs short (cut per-product views, then funnel) or a real tracking source (Q04) | superseding row approved by product owner | `[DOCUMENT]` decisions/D08 | none |
| D09 | 2026-10-15 | Copilot answers the four spec questions plus traffic sources, funnel drop-off and views-without-sales; declines margin, ad spend/ROAS, demographics, competitors, forecasts, per-source conversion and causal claims | traffic questions are answerable once D08 is P0 | product owner | active | trigger: a new data source (Q04) or P1 item | superseding row approved by product owner | `[DOCUMENT]` decisions/D09 | none |
| D05 | 2026-10-14 | Primary user is a small-store owner (medium and large later); store management is part of the value, not plumbing | the owner rejected treating the admin as data plumbing; cause and effect must be clear to the owner | product owner | active | trigger: leaving the portfolio path | superseding row approved by product owner | `[DOCUMENT]` decisions/D05 | none |
| D10 | 2026-10-15 | The demo store sells gaming accessories (mice, keyboards, headsets, controllers, mousepads) instead of coffee | the product owner wants a gaming shop; switching before orders and Copilot data refer to the catalog is cheapest | product owner | active | trigger: the product owner picks another demo vertical | superseding row approved by product owner | `[DOCUMENT]` decisions/D10 | none |
| D11 | 2026-10-24 | Customer accounts as a second role beside `owner`: self-registration on a separate auth instance, orders attached to the account, read-only "My orders"; an account order opens only with its owner's session; guest checkout stays | the course certificate requires two roles with per-user data isolation; a customer account gives a natural A↔B and role↔role test; spec §3 already named order history for a demo account | product owner | active | trigger: leaving the portfolio path or dropping the certificate | superseding row approved by product owner | `[DOCUMENT]` decisions/D11 | none |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Small-store owners with data struggle to decide which changes to make `[ASSUMPTION]` practitioner account plus pack VPC | high for a real product, low for the portfolio | one generalized practitioner account (interviews note) | the value proposition targets a non-problem | interviews using `2026-10-14-interview-guide-merchant.md` about the last time the owner reviewed results and decided a change | product owner | unknown | accepted untested (D04) |
| A02 | Recommendations that combine complete store data with traffic and conversion data, showing the evidence, are more useful to owners than agency advice built on partial tracking `[ASSUMPTION]` practitioner account | high | the practitioner says the data agencies lacked was sessions, traffic and conversion; CommerceOS demos this on fictional traffic data only (D07); no comparison observed | the differentiator does not hold, or depends on a real tracking source (Q04) | show owners Copilot recommendations next to their current reports or agency advice and observe what they act on | product owner | unknown | accepted untested (D04) |
| A03 | Order, catalog and stock data, plus the fictional traffic and conversion data (D07), are enough for useful "improve sales" recommendations `[ASSUMPTION]` no material | high | none; a demo on fictional data shows mechanics, not real-world usefulness | Copilot's main question gets shallow or misleading answers | answerability check on team-chosen questions: record which ones the approved tools can answer, with limitations shown when not. This tests whether answers can be produced, not whether they are useful to owners. Usefulness stays untested on the portfolio path (D04). The evaluation dataset is P1 in the spec (§3), so it may be cut for time (§11) | product owner | Copilot week (spec §11 week 4) | untested |

## Kill criteria

On the portfolio path, stopping is not in question; revision is. If the A03 check shows the primary question cannot be answered well from the approved tools, the question and the spec §14 criterion stay. Copilot answers from the data it has, names any data it lacks (R01, D06), and labels traffic and conversion figures as fictional demo data (R07, D07). `[DOCUMENT]` decisions/D06. No numeric threshold has been decided (Q02).

## Hypotheses to test

None. No synthetic walkthrough has been run.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Which merchant questions should Copilot answer in the demo, and which does it decline because they need data the demo does not hold? | no for starting implementation; yes for finalizing Copilot tools and prompts | product owner | answered 2026-10-15 (D09) |
| Q02 | Thresholds for the demo measures (answerable share, calculation correctness, evidence share) | no | product owner | open |
| Q04 | Should a traffic or conversion data source (e.g. server-side tracking) come later, given that this is the gap the practitioner describes? | no (Later; would supersede part of N05/D01) | product owner | open |
| Q05 | Is the fictional traffic and conversion data and its Copilot tool (D07) P0 or P1, and what exactly does it hold (sessions, sources, funnel steps)? The spec update must also reword §14 ("real store metrics") so seeded fictional traffic data read through an approved tool qualifies | yes for implementation planning of the Copilot week; no for starting the storefront and admin | product owner | answered 2026-10-15 (D08; spec §3, §6, §7, §11, §14 updated) |
| Q03 | What changes for medium and large stores (roles, scale, data sources)? | no (Later) | product owner | open |

## Definition of Ready addendum (own)

Problems and Target group have one supporting source: a practitioner account that is not independent and describes no single case. It supports that the author has seen this pattern, not how common or costly it is. The owner explicitly accepted building on that untested basis for the portfolio path (D04). That acceptance makes the whole P0 scope ready for implementation planning, including the Copilot week (Q05 and Q01 answered by D08 and D09, spec updated on 2026-10-15). It does not validate the merchant problem, and no market-facing claim may rely on it. All decisions Now depends on are active (D01–D09). The traffic and conversion gap the practitioner describes is addressed only on fictional demo data (D07, D08, A02). Customer accounts (D11) rest on a course requirement, not on shopper research; no claim about shopper demand may rely on them.

## Collection plan

### Concrete client cases of advice built on incomplete or misread data

- What decision or work needs it: strengthens A01 and A02 and would inform Q01 (which questions Copilot should answer). It does not block the portfolio build.
- Who can answer it: store owners from the product owner's own client work.
- How: short interviews per `2026-10-14-interview-guide-merchant.md`, or the product owner writing up recent client cases they witnessed (what data, what advice, what happened).
- Owner and by when: product owner; date unknown.
- Template: `.ai/specs/research/2026-10-14-interview-notes-template.md`
