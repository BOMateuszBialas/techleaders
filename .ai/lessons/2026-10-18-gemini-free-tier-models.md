# 2026-10-18 — Gemini free tier: 2.5 models are closed to new keys, 3 Flash thinks slowly by default

The model list still shows `gemini-2.5-flash`, but new keys must use a 3.x Flash model, which thinks at a high level by default and missed a 20 s attempt timeout; `thinkingLevel: LOW` fixed it. A real-key smoke test also showed the model citing numbers in `reasoning` without citing their fact: grounding rejected it correctly, and spelling the rule out in the prompt made the retry pass. Smoke-test a prompt against the real model before calling the grounding too strict.
