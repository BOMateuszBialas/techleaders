# 2026-10-13 — agent-browser daemon keeps stdout open

The first command of a session starts a background daemon that inherits the CLI's stdout pipe, so `execFile` (which resolves on stdio *close*) hung until its 30 s timeout, and a catch that read `error.stdout` silently swallowed the timeout. Run the CLI with `spawn` and resolve on the `exit` event (`packages/app/e2e/support/agent-browser.ts`); never treat a timeout as a normal result.
