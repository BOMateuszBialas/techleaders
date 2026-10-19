import { fileURLToPath } from "node:url";
import { GeminiLlmProvider } from "../../adapters/gemini-llm-provider";
import { loadEnvFileIfPresent, runEvalCli } from "./run-eval-cli";

/** Entry point of `npm run eval`. All logic lives in run-eval-cli.ts. */
const ROOT_ENV_FILE = fileURLToPath(new URL("../../../../../.env", import.meta.url));

export const done = runEvalCli({
  argv: process.argv.slice(2),
  env: process.env,
  loadEnv: () => loadEnvFileIfPresent(ROOT_ENV_FILE),
  createLiveProvider: (env) =>
    new GeminiLlmProvider({ apiKey: env.LLM_API_KEY, model: env.LLM_MODEL }),
  write: (text) => process.stdout.write(text),
  error: (text) => process.stderr.write(text),
}).then((code) => {
  process.exitCode = code;
});
