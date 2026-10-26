# 2026-10-13 — Awilix cradle proxies in `expect`

Comparing objects whose fields are the cradle proxy with `toBe`/`not.toBe` can make Vitest walk the proxy and throw `AwilixResolutionError: Could not resolve 'size'`. Compare identity with `===` and assert the boolean.
