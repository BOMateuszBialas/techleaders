# Changelog

All notable changes to CommerceOS. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-11-03

First release of CommerceOS: a single-store e-commerce MVP with a storefront, a merchant admin and Commerce Copilot, an AI advisor that answers from the store's own data. It is a capstone project. It is not production-ready, and the demo store takes no money.

### Storefront

- Catalogue, product pages, search and categories; the category menu works on a phone.
- Cart as a drawer, with a full cart page as fallback.
- Guest checkout. Stock and prices are checked on the server at checkout.
- Demo payment, an order confirmation with an order reference, and order lookup.
- Customer accounts: sign-up, sign-in and "My orders". A customer sees only their own orders.

### Admin

- Owner sign-in. The owner account is created with `npm run admin:create`.
- Dashboard with period comparison.
- Products and categories, with a delete confirmation for categories.
- CSV product import with a preview before anything is saved.
- Stock panel.
- Orders: list, detail, status changes, and a confirmation before destructive actions.

### Commerce Copilot

- Recommendations drawn from the store's data. Each answer shows the evidence it is based on.
- Optional LLM (Gemini, free tier). A rule-based answer is used when the LLM is off or fails.
- Advice only. The Copilot never changes prices, publishes products, issues refunds or modifies orders. The merchant decides.

### Design system

- Storybook with design tokens, light and dark themes, primitives, patterns and documentation pages.
- Accessibility checks run as errors in the Storybook tests.

### Quality and safety

- Unit tests at 100% coverage. Integration tests on PostgreSQL (Testcontainers). End-to-end tests.
- Agent guardrails: deny rules and a PreToolUse hook for coding agents.
- CI runs lint, format, design-token and agent-instruction checks, unit tests, build, integration, end-to-end and Storybook jobs.

### Known limitations

- Payments, shipping and taxes are simulated.
- No public deployment yet.
- Owner review on 320, 768, 1024 and 1440 px in light and dark is still pending for the admin and Copilot screens.
- On 320 px, seven primitive documentation pages in Storybook still scroll sideways by about 30 px. The state tables no longer cause it.
