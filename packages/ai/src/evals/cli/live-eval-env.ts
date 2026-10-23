import { z } from "zod";

/** An empty string counts as unset, as in the app's env schema (`packages/app/src/server/env.ts`). */
const blankAsUnset = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

/**
 * The three `LLM_*` variables a live eval run needs (eval-script spec A1), validated the way the
 * app's `parseEnv` validates them: `gemini` is the only provider, and it needs a key and a model.
 * The app's `getEnv()` also requires a database URL and an auth secret, which an eval run does
 * not use; a parity test pins both schemas to the same answers for these fields.
 */
const liveEvalEnvSchema = z.object({
  LLM_PROVIDER: blankAsUnset(z.enum(["gemini"]).optional()),
  LLM_API_KEY: blankAsUnset(z.string().optional()),
  LLM_MODEL: blankAsUnset(z.string().optional()),
});

export type LiveEvalEnv = { LLM_PROVIDER: "gemini"; LLM_API_KEY: string; LLM_MODEL: string };

/**
 * Either the live settings or the problems, named by variable only: a value (the key above all)
 * is never part of a message.
 */
export function parseLiveEvalEnv(
  source: Record<string, string | undefined>,
): { ok: true; env: LiveEvalEnv } | { ok: false; problems: string[] } {
  const parsed = liveEvalEnvSchema.safeParse(source);
  if (!parsed.success) {
    return { ok: false, problems: ["LLM_PROVIDER: must be gemini (the only adapter)"] };
  }
  const { LLM_PROVIDER, LLM_API_KEY, LLM_MODEL } = parsed.data;
  const problems = [
    ...(LLM_PROVIDER ? [] : ["LLM_PROVIDER: is required (gemini)"]),
    ...(LLM_API_KEY ? [] : ["LLM_API_KEY: is required"]),
    ...(LLM_MODEL ? [] : ["LLM_MODEL: is required"]),
  ];
  if (!LLM_PROVIDER || !LLM_API_KEY || !LLM_MODEL) return { ok: false, problems };
  return { ok: true, env: { LLM_PROVIDER, LLM_API_KEY, LLM_MODEL } };
}
