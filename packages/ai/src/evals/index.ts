// Test and eval entry point (`@commerceos/ai/evals`): scripted models, replies and eval cases.
// Never import it from app code outside tests.
export * from "./cases/answered.cases";
export * from "./cases/declined.cases";
export * from "./eval-case";
export * from "./eval-store";
export * from "./replies";
export * from "./scripted-llm-provider";
export * from "./descriptions/description.cases";
export * from "./descriptions/eval-categories";
export * from "./descriptions/seeded-products";
export * from "./runner/case-result";
export * from "./runner/copilot-eval";
export * from "./runner/description-eval";
export * from "./runner/format-report";
export * from "./runner/recording-llm-provider";
export * from "./runner/run-eval-suite";
export * from "./cli/live-eval-env";
