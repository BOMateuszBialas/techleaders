import { DECLINED_CATEGORIES, type DeclinedCategory } from "../../copilot/intents";
import type { EvalCase } from "../eval-case";

const QUESTIONS: Readonly<Record<DeclinedCategory["id"], string>> = {
  margin: "What is my profit margin on keyboards?",
  ad_spend: "What is my ROAS?",
  demographics: "Which customer segments buy the most?",
  competitors: "What do competitors charge for headsets?",
  forecast: "How much will I sell next month?",
  conversion_by_source: "What is the conversion rate of social traffic?",
};

/** Every declined D09 category: answered without a model call, naming the missing data. */
export const DECLINED_CASES: EvalCase[] = Object.values(DECLINED_CATEGORIES).map((category) => ({
  id: `declined-${category.id}`,
  covers: "declined",
  description: `"${QUESTIONS[category.id]}" is declined, naming ${category.missingData}.`,
  store: "demo",
  request: { question: QUESTIONS[category.id] },
  script: [],
  expected: {
    kind: "declined",
    origin: "rules",
    fallbackReason: null,
    llmCalls: 0,
    missingData: category.missingData,
  },
}));
