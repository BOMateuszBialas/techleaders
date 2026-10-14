# D06 — Keep Copilot's primary question; answer from available data and state what is unknown

- Date, owner: 2026-10-14, product owner (project author), in the `om-discover` session.
- Context and the options weighed: the skeptic review noted that spec §14 requires Copilot to answer "What should I focus on to improve sales this week?", while the approved tools (spec §6) provide no traffic or conversion data. Options offered by the agent: (a) change the demo question and the §14 criterion to one that order and stock data can answer; (b) keep the question and have Copilot answer from the data it has while stating explicitly what it cannot know; (c) something else.
- Decision and why: (b). The owner added that the demo can use fictional (seeded) data.
- Consequences, and what would make us revisit it: the §14 criterion is unchanged. Copilot's answers to the primary question must carry a limitations note naming missing traffic and conversion data whenever the question depends on it (R01). Fictional demo data must be clearly presented as demo data. Whether "fictional data" also means fictional traffic or conversion data was still to be clarified at brief confirmation, because that would add a data source outside the current tools (D01).
- Clarified at brief confirmation (2026-10-14): fictional data means both the usual seed data and fictional traffic and conversion data; see D07.
- Status: active
