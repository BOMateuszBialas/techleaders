import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { StructuredGenerationRequest } from "../ports/llm-provider.port";
import { evalStore } from "./eval-store";
import { groundedReply, insufficientDataReply, wrongProductReply } from "./replies";
import { ScriptedLlmProvider, promptDataOf, type PromptData } from "./scripted-llm-provider";

function requestWith(data: PromptData | null): StructuredGenerationRequest<unknown> {
  return {
    messages: [
      { role: "system", content: "rules" },
      ...(data === null
        ? []
        : [
            { role: "user" as const, content: `Question: q\nData (JSON): ${JSON.stringify(data)}` },
          ]),
    ],
    schema: z.unknown(),
    maxOutputTokens: 10,
    timeoutMs: 10,
  };
}

const fact = (id: string, metric: string, product?: string) => ({
  id,
  metric,
  value: "1",
  period: "Now",
  source: "s",
  demo: false,
  ...(product ? { product } : {}),
});

describe("eval replies", () => {
  it("fail loudly when the data lacks what the scripted model needs", () => {
    expect(() => groundedReply(requestWith({ facts: [], products: [] }))).toThrow(
      "The data has no paid orders",
    );
    const orphan = {
      facts: [fact("f1", "Paid orders"), fact("f2", "Units sold: X", "p9")],
      products: [],
    };
    expect(() => groundedReply(requestWith(orphan))).toThrow("The data has no product p9");
    const noTitan = {
      facts: [
        fact("f1", "Paid orders"),
        fact("f2", "Units sold: X", "p1"),
        fact("f3", "Stock: X", "p1"),
      ],
      products: [{ alias: "p1", name: "X", sku: null }],
    };
    expect(() => wrongProductReply(requestWith(noTitan))).toThrow("no Titan MMO Mouse");
    expect(() =>
      insufficientDataReply(requestWith({ facts: [fact("f1", "Paid orders")], products: [] })),
    ).toThrow("The data has no orders placed");
  });

  it("need a data line in a user message", () => {
    expect(() => promptDataOf(requestWith(null))).toThrow("The prompt carries no data line");
    const noData = requestWith(null);
    expect(() =>
      promptDataOf({ ...noData, messages: [{ role: "user", content: "Question: q" }] }),
    ).toThrow("The prompt carries no data line");
  });
});

describe("ScriptedLlmProvider", () => {
  it("fails when the script has no reply left, instead of inventing one", async () => {
    const provider = new ScriptedLlmProvider([]);
    await expect(provider.generateStructured(requestWith(null))).rejects.toThrow(
      "The script has no reply for call 1",
    );
  });
});

describe("evalStore", () => {
  it("reports its demo order count like the real metrics port", async () => {
    expect(await evalStore("empty").demoOrderCount({ from: new Date(0), to: new Date(1) })).toBe(0);
    expect(await evalStore("demo").demoOrderCount({ from: new Date(0), to: new Date(1) })).toBe(31);
  });
});
