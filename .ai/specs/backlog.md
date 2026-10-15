# Backlogs

## .ai/specs/product-brief.md

Backlog source: .ai/specs/product-brief.md
Last filed: 2026-10-15

| Id          | Issue | Title                                                                                       | Epic | Depends on                   | Adopted |
| ----------- | ----- | ------------------------------------------------------------------------------------------- | ---- | ---------------------------- | ------- |
| E01         | #8    | Catalog browsing for shoppers                                                               | —    | —                            | no      |
| E02         | #9    | Cart and demo checkout                                                                      | —    | —                            | no      |
| E03         | #10   | Store owner access and catalog management                                                   | —    | —                            | no      |
| E04         | #11   | Orders and dashboard for the store owner                                                    | —    | —                            | no      |
| E05         | #12   | Commerce Copilot                                                                            | —    | —                            | no      |
| E06         | #13   | Later (parked)                                                                              | —    | —                            | no      |
| E01-S01     | #14   | A shopper browses published products by category and sees their details                     | #8   | —                            | no      |
| E01-S02     | #15   | A shopper finds products by search and category filter                                      | #8   | E01-S01 (#14)                | no      |
| E02-S01     | #16   | A shopper manages a cart                                                                    | #9   | E01-S01 (#14)                | no      |
| E02-S02     | #17   | A shopper checks out with server-validated price and stock and cannot oversell              | #9   | E02-S01 (#16)                | no      |
| E02-S02-T01 | #29   | Migration for orders and order items with snapshots and total constraints                   | #9   | E02-S02 (#17)                | no      |
| E02-S03     | #18   | A shopper completes a clearly labelled demo payment and sees an order confirmation          | #9   | E02-S02 (#17)                | no      |
| E03-S01     | #19   | A store owner signs in; only signed-in owners reach admin pages and mutations               | #10  | —                            | no      |
| E03-S02     | #20   | A store owner manages products and categories and sees what each change affects             | #10  | E03-S01 (#19)                | no      |
| E03-S03     | #21   | A store owner adjusts stock manually and sees the effect on availability                    | #10  | E03-S01 (#19)                | no      |
| E04-S01     | #22   | A store owner lists orders, opens one and moves it through the status workflow              | #11  | E02-S03 (#18), E03-S01 (#19) | no      |
| E04-S02     | #23   | A store owner reads a dashboard of real metrics with visible definitions                    | #11  | E04-S01 (#22)                | no      |
| E04-S03     | #24   | A store owner sees a populated, clearly labelled demo store on first run                    | #11  | E02-S03 (#18)                | no      |
| E05-S01     | #25   | A store owner asks what to focus on and gets up to 3 grounded, prioritized recommendations  | #12  | E03-S01 (#19), E04-S02 (#23) | no      |
| E05-S02     | #26   | A store owner saves, dismisses or completes a recommendation, and the action is recorded    | #12  | E05-S01 (#25)                | no      |
| E05-S03     | #27   | A store owner sees an explicit fallback when the AI provider is unavailable                 | #12  | E05-S01 (#25)                | no      |
| E05-S04     | #28   | Copilot answers traffic, funnel and views-without-sales questions from fictional demo data  | #12  | E05-S01 (#25), E04-S03 (#24) | no      |

Not filed (non-goals): N01–N05, quoted in #13.

### Where work starts

1. **E03-S01 (#19), sign-in.** `priority-high`, no dependencies, and spec §11 week 1 ends with "protected admin shell works". Write its spec first, because it must choose the auth library (an open stack decision).
2. **E01-S01 (#14), catalog**, then **E03-S02 (#20)**. They unblock the cart, checkout and admin catalog.
3. **The E02 checkout chain (#16 → #17/#29 → #18)**, then E04 and E05. The Copilot's LLM provider is chosen in the E05-S01 spec.
