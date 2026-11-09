# Run: checkout account switch (issue #105)

- Plan: issue #105 comment (2026-11-09), followed as written.
- Design: the account form carries `checkoutAccountId`; `decideCheckoutAccount` (core) compares it with the session; a switch returns `checkout_account_switched` with the new account, no order, `refresh()`.
- Gates run: typecheck, `test:coverage` (100%), `build`, `test:e2e` for the new file plus checkout, purchase, customer-isolation and customer-auth suites, `check:tokens`, `check:agents`, eslint and prettier on changed files.
- Not run: whole-repo lint, integration tests (no repository touched), `test:storybook:themes`.
- Deviation from the plan: none in design. `ActionState` gained an optional `account` field (additive).
- Guest-to-account: a guest form stays a guest order, as A24 requires (no session read); the decision is unit-tested.
