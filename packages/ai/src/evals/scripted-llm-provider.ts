import { z } from "zod";
import {
  LlmOutputInvalidError,
  type LlmProviderPort,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
} from "../ports/llm-provider.port";

/** The fact and product tables as the model receives them (`serializeFactContext`). */
const promptDataSchema = z.object({
  facts: z.array(
    z.object({
      id: z.string(),
      metric: z.string(),
      value: z.string(),
      period: z.string(),
      source: z.string(),
      demo: z.boolean(),
      product: z.string().optional(),
    }),
  ),
  products: z.array(z.object({ alias: z.string(), name: z.string(), sku: z.string().nullable() })),
});
export type PromptData = z.infer<typeof promptDataSchema>;

const DATA_PREFIX = "Data (JSON): ";

/** Reads the data a scripted model "sees", the way a real model would read the user message. */
export function promptDataOf(request: StructuredGenerationRequest<unknown>): PromptData {
  const user = request.messages.find((message) => message.role === "user")?.content ?? "";
  const line = user.split("\n").find((text) => text.startsWith(DATA_PREFIX));
  if (!line) throw new Error("The prompt carries no data line");
  return promptDataSchema.parse(JSON.parse(line.slice(DATA_PREFIX.length)));
}

/**
 * One scripted reply: the raw JSON value the "model" returns (validated against the request's
 * schema, as the Gemini adapter does), or a thrown error (a provider failure).
 */
export type ScriptStep = (request: StructuredGenerationRequest<unknown>) => unknown;

export const SCRIPTED_MODEL = "scripted-model";

/**
 * A fake LLM for tests and evals (Copilot spec A19): replies follow a script, so no test ever
 * calls a real provider. It records every request, so tests can assert what was sent.
 */
export class ScriptedLlmProvider implements LlmProviderPort {
  readonly name = "scripted";
  readonly isConfigured = true;
  readonly requests: StructuredGenerationRequest<unknown>[] = [];

  constructor(private readonly steps: readonly ScriptStep[]) {}

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    this.requests.push(request);
    const step = this.steps[this.requests.length - 1];
    if (!step) throw new Error(`The script has no reply for call ${this.requests.length}`);
    const parsed = request.schema.safeParse(step(request));
    if (!parsed.success) throw new LlmOutputInvalidError("The scripted reply fails the schema.");
    return {
      data: parsed.data,
      model: SCRIPTED_MODEL,
      latencyMs: 1,
      usage: { inputTokens: 1000, outputTokens: 200, thinkingTokens: null },
    };
  }
}
