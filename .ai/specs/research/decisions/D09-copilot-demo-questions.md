# D09 — Which merchant questions Copilot answers in the demo, and which it declines

- Date, owner: 2026-10-15, product owner (project author). Answers Q01.
- Context and the options weighed: (a) answer only the four example questions from spec §3; (b) answer those plus questions about traffic and conversion that the D08 data supports, and decline questions that need data the demo does not hold.
- Decision and why: (b). With D08 in P0, traffic and conversion questions are answerable from approved tools, and declining them would hide the demo's main point.
- Answered (from approved tools only):
  1. "What should I focus on to improve sales this week?" (the primary question)
  2. "Which products are selling best?"
  3. "Which products are low on stock?"
  4. "What could explain the recent change in sales?" (Copilot names the correlations it sees and states it cannot prove causes, R05)
  5. "Where does my traffic come from?"
  6. "Where in the funnel do visitors drop off?"
  7. "Which products get views but few sales?"
- Declined: Copilot says it cannot answer and names the missing data (D06, R01). This covers margin and profit (no cost data), ad spend and ROAS (no spend data), customer demographics or segments, competitor prices, sales forecasts, conversion by traffic source (orders carry no source), and any claim of cause.
- Consequences, and what would make us revisit it:
  - The intent routing and prompts cover the seven answered questions; the eval set (spec §6) gets at least one case per declined category.
  - Revisit when a data source is added (Q04) or a P1 item adds data (for example date-range comparison).
- Status: active
