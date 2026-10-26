# 2026-10-18 — A shared cleanup assumed every rate-limit window was at most an hour

`DatabaseRateLimiter` deleted windows older than an hour whenever any key opened a new one, which silently reset the Copilot's 24 h LLM cap. Only an integration test that read the bucket after a real consume caught it. When a shared store gains a longer-lived key, re-check every cleanup and TTL that touches it; the limiter now refuses windows longer than its cleanup keeps.
