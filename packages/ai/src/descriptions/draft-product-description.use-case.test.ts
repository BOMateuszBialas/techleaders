import {
  descriptionDraftSchema,
  type GetCategoryUseCase,
  type RateLimiterPort,
} from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import { UnconfiguredLlmProvider } from "../adapters/unconfigured-llm-provider";
import { EVAL_CATEGORY_IDS, evalCategories } from "../evals/descriptions/eval-categories";
import {
  ScriptedLlmProvider,
  SCRIPTED_MODEL,
  type ScriptStep,
} from "../evals/scripted-llm-provider";
import type { CopilotLogValue } from "../ports/copilot-log.port";
import { LlmProviderUnavailableError, type LlmProviderPort } from "../ports/llm-provider.port";
import { PRODUCT_DESCRIPTION_PROMPT_VERSION } from "../prompts/product-description.prompt";
import { productDescriptionOutputSchema } from "../schemas/product-description-output.schema";
import {
  DRAFT_RATE_LIMITED_MESSAGE,
  DraftProductDescriptionUseCase,
  type DraftProductDescriptionDeps,
} from "./draft-product-description.use-case";

const OWNER = { id: "owner-1" };
const NOTES =
  "[DEMO] Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.";
const INPUT = descriptionDraftSchema.parse({
  name: "Vortex Wireless Mouse",
  categoryId: EVAL_CATEGORY_IDS.Mice,
  price: "249.00",
  notes: NOTES,
});
const GOOD =
  "The Vortex Wireless Mouse pairs a 26,000 DPI optical sensor with 70 hours of battery life, and its five programmable buttons keep every bind in reach.";
const BAD =
  "The Vortex Wireless Mouse adds Bluetooth and a 16,000 DPI sensor to 70 hours of battery life, with five programmable buttons for every bind you need.";

const reply =
  (description: string): ScriptStep =>
  () => ({ description });
const fail =
  (reason: "timeout" | "rate_limited", causeCode?: string): ScriptStep =>
  () => {
    throw new LlmProviderUnavailableError("The provider failed.", { reason, causeCode });
  };

type Events = Array<{ event: string; data: Record<string, CopilotLogValue> }>;

function setup(
  options: {
    provider?: LlmProviderPort;
    script?: ScriptStep[];
    perOwner?: boolean;
    daily?: boolean[];
    clockSteps?: number[];
    getCategoryUseCase?: GetCategoryUseCase;
  } = {},
) {
  const provider = options.provider ?? new ScriptedLlmProvider(options.script ?? []);
  const daily = [...(options.daily ?? [true, true])];
  const consume = vi.fn<RateLimiterPort["consume"]>(async (key) => {
    const allowed = key.startsWith("descriptions:draft:")
      ? (options.perOwner ?? true)
      : (daily.shift() ?? true);
    return { allowed, remaining: allowed ? 1 : 0 };
  });
  // Each clock read moves time on by the next step (ms), so a test can spend the deadline.
  const steps = [...(options.clockSteps ?? [])];
  let now = Date.parse("2026-10-19T10:00:00Z");
  const clock = () => {
    now += steps.shift() ?? 0;
    return new Date(now);
  };
  const events: Events = [];
  const deps: DraftProductDescriptionDeps = {
    llmProvider: provider,
    rateLimiter: { consume },
    getCategoryUseCase: options.getCategoryUseCase ?? evalCategories(),
    copilotLog: { info: (event, data) => events.push({ event, data }) },
    clock,
  };
  return { useCase: new DraftProductDescriptionUseCase(deps), provider, consume, events };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
}

describe("DraftProductDescriptionUseCase", () => {
  it("depends on no catalog-writing port (D02, N04)", () => {
    const deps: Record<keyof DraftProductDescriptionDeps, true> = {
      llmProvider: true,
      rateLimiter: true,
      getCategoryUseCase: true,
      copilotLog: true,
      clock: true,
    };
    expect(Object.keys(deps)).toEqual([
      "llmProvider",
      "rateLimiter",
      "getCategoryUseCase",
      "copilotLog",
      "clock",
    ]);
  });

  it("returns not_configured without a provider, before any lookup or limiter", async () => {
    const categories = evalCategories();
    const findById = vi.spyOn(categories, "execute");
    const { useCase, consume, events } = setup({
      provider: new UnconfiguredLlmProvider(),
      getCategoryUseCase: categories,
    });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "not_configured",
    });
    expect(consume).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
    expect(events).toEqual([
      {
        event: "description.draft",
        data: expect.objectContaining({
          outcome: "unavailable",
          fallbackReason: "not_configured",
          provider: "unconfigured",
          attempts: 0,
          promptVersion: null,
          nameChars: null,
        }),
      },
    ]);
  });

  it("answers an unknown category with a field error on categoryId", async () => {
    const { useCase, consume, events } = setup({ script: [reply(GOOD)] });
    const error = await rejection(
      useCase.execute({ ...INPUT, categoryId: "0b6c5c1e-1a11-4c6e-9d70-0000000000ff" }, OWNER),
    );
    expect(error).toMatchObject({
      code: "VALIDATION_FAILED",
      fieldErrors: { categoryId: ["Choose an existing category."] },
    });
    expect(consume).not.toHaveBeenCalled();
    expect(events[0]?.data.outcome).toBe("invalid_category");
  });

  it("lets a database failure through as an error", async () => {
    const categories = evalCategories();
    vi.spyOn(categories, "execute").mockRejectedValue(new Error("connect ECONNREFUSED"));
    const { useCase, provider, events } = setup({
      script: [reply(GOOD)],
      getCategoryUseCase: categories,
    });
    await expect(useCase.execute(INPUT, OWNER)).rejects.toThrow("ECONNREFUSED");
    expect((provider as ScriptedLlmProvider).requests).toHaveLength(0);
    expect(events[0]?.data.outcome).toBe("error");
  });

  it("returns insufficient_input without a call or a limiter step (A5)", async () => {
    const { useCase, provider, consume } = setup({ script: [reply(GOOD)] });
    expect(
      await useCase.execute(
        descriptionDraftSchema.parse({ name: "Mouse", notes: "Light." }),
        OWNER,
      ),
    ).toEqual({ kind: "unavailable", reason: "insufficient_input" });
    expect(consume).not.toHaveBeenCalled();
    expect((provider as ScriptedLlmProvider).requests).toHaveLength(0);
  });

  it("refuses a sixth draft in ten minutes per owner with 429", async () => {
    const { useCase, provider, consume, events } = setup({
      script: [reply(GOOD)],
      perOwner: false,
    });
    const error = await rejection(useCase.execute(INPUT, OWNER));
    expect(error).toMatchObject({ code: "RATE_LIMITED", message: DRAFT_RATE_LIMITED_MESSAGE });
    expect(consume).toHaveBeenCalledWith("descriptions:draft:owner-1", 5, 600);
    expect(consume).toHaveBeenCalledTimes(1);
    expect((provider as ScriptedLlmProvider).requests).toHaveLength(0);
    expect(events[0]?.data.outcome).toBe("rate_limited");
  });

  it("returns a grounded draft with the demo prefix, and logs no text", async () => {
    const { useCase, provider, consume, events } = setup({
      script: [reply(`[DEMO] ${GOOD}`)],
    });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "draft",
      text: `[DEMO] ${GOOD}`,
      model: SCRIPTED_MODEL,
      promptVersion: PRODUCT_DESCRIPTION_PROMPT_VERSION,
      fieldsUsed: ["name", "category", "price", "notes"],
      demoMarked: true,
    });
    expect(consume.mock.calls).toEqual([
      ["descriptions:draft:owner-1", 5, 600],
      ["copilot:llm:day", 100, 86_400],
    ]);
    const [request] = (provider as ScriptedLlmProvider).requests;
    expect(request).toMatchObject({
      schema: productDescriptionOutputSchema,
      maxOutputTokens: 1500,
      timeoutMs: 15_000,
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(request?.messages[1]?.content).toContain('"category":"Mice"');

    expect(events).toHaveLength(1);
    const data = events[0]?.data ?? {};
    expect(Object.keys(data).sort()).toEqual(
      [
        "attempts",
        "categoryChars",
        "demo",
        "draftChars",
        "fallbackReason",
        "issueCodes",
        "latencyMs",
        "model",
        "nameChars",
        "notesChars",
        "outcome",
        "priceChars",
        "promptVersion",
        "provider",
        "providerCause",
        "usageInput",
        "usageOutput",
        "usageThinking",
      ].sort(),
    );
    expect(data).toMatchObject({
      outcome: "draft",
      fallbackReason: null,
      attempts: 1,
      model: SCRIPTED_MODEL,
      provider: "scripted",
      nameChars: 21,
      categoryChars: 4,
      priceChars: 10,
      demo: true,
      usageInput: 1000,
    });
    const logged = JSON.stringify(events);
    for (const text of ["Vortex", "26,000", "Mice", "249", "programmable"]) {
      expect(logged).not.toContain(text);
    }
  });

  it("returns a draft without a prefix for a product that is not demo content", async () => {
    const { useCase } = setup({ script: [reply(GOOD)] });
    const result = await useCase.execute({ ...INPUT, notes: NOTES.slice(7) }, OWNER);
    expect(result).toMatchObject({ kind: "draft", text: GOOD, demoMarked: false });
  });

  it("retries once after a grounding failure, with codes and terms but not the draft", async () => {
    const { useCase, provider, consume, events } = setup({ script: [reply(BAD), reply(GOOD)] });
    expect(await useCase.execute(INPUT, OWNER)).toMatchObject({ kind: "draft" });
    const requests = (provider as ScriptedLlmProvider).requests;
    expect(requests).toHaveLength(2);
    const note = requests[1]?.messages.at(-1)?.content ?? "";
    expect(note).toContain("Do not mention: bluetooth.");
    expect(note).not.toContain("16,000");
    expect(note).not.toContain(BAD);
    expect(requests[1]?.messages.slice(0, 2)).toEqual(requests[0]?.messages);
    expect(consume).toHaveBeenCalledTimes(3);
    expect(events[0]?.data).toMatchObject({
      attempts: 2,
      issueCodes: ["unsupported_feature", "ungrounded_number"],
    });
  });

  it("shows nothing after two failed attempts (invalid_output)", async () => {
    const { useCase, events } = setup({ script: [reply(BAD), () => ({ description: "short" })] });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "invalid_output",
    });
    expect(events[0]?.data).toMatchObject({
      attempts: 2,
      issueCodes: ["unsupported_feature", "ungrounded_number", "schema"],
      draftChars: null,
    });
  });

  it("skips the second attempt when less than 10 s of the deadline remain", async () => {
    // Reads: deadline, attempt 1, attempt 2 (21 s later: 9 s left).
    const { useCase, provider } = setup({ script: [reply(BAD)], clockSteps: [0, 0, 21_000] });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "invalid_output",
    });
    expect((provider as ScriptedLlmProvider).requests).toHaveLength(1);
  });

  it("gives the second attempt only the time left, at most 15 s", async () => {
    const { useCase, provider } = setup({
      script: [reply(BAD), reply(GOOD)],
      clockSteps: [0, 0, 18_000],
    });
    await useCase.execute(INPUT, OWNER);
    expect((provider as ScriptedLlmProvider).requests[1]?.timeoutMs).toBe(12_000);
  });

  it("does not retry a provider failure, and logs its cause", async () => {
    const { useCase, provider, events } = setup({ script: [fail("rate_limited", "http_429")] });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "rate_limited",
    });
    expect((provider as ScriptedLlmProvider).requests).toHaveLength(1);
    expect(events[0]?.data).toMatchObject({ providerCause: "http_429", attempts: 1 });
  });

  it("ends with the last attempt's failure: a timed-out retry is a timeout", async () => {
    const { useCase } = setup({ script: [reply(BAD), fail("timeout")] });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({ kind: "unavailable", reason: "timeout" });
  });

  it("treats an unclassified provider error as provider_error, not a 500", async () => {
    const { useCase } = setup({
      script: [
        () => {
          throw new Error("adapter bug");
        },
      ],
    });
    expect(await useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "provider_error",
    });
  });

  it("counts every attempt against the shared daily cap and stops when it is spent", async () => {
    const first = setup({ script: [reply(GOOD)], daily: [false] });
    expect(await first.useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "daily_limit",
    });
    expect((first.provider as ScriptedLlmProvider).requests).toHaveLength(0);

    const second = setup({ script: [reply(BAD), reply(GOOD)], daily: [true, false] });
    expect(await second.useCase.execute(INPUT, OWNER)).toEqual({
      kind: "unavailable",
      reason: "daily_limit",
    });
    expect((second.provider as ScriptedLlmProvider).requests).toHaveLength(1);
    expect(second.events[0]?.data.attempts).toBe(1);
  });
});
