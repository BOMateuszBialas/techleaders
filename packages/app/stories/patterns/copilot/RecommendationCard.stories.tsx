import type { CopilotAnswerRecommendation } from "@commerceos/ai";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RecommendationCardView } from "@/components/admin/copilot/copilot-answer-view";
import type { RecommendationStatusAction } from "@/components/admin/copilot/recommendation-copy";

/**
 * Patterns / Copilot / Recommendation card. Real `RecommendationCardView` with a fixed stored
 * recommendation (status "saved"): the priority badge, the status badge with its text, the
 * evidence and the status actions. The action is a stub: no server action runs in Storybook.
 */

const noopStatusAction: RecommendationStatusAction = async () => ({ status: "idle" });

const RECOMMENDATION: CopilotAnswerRecommendation = {
  id: "rec-1",
  status: "saved",
  title: "Restock the mouse pad before the weekend",
  priority: "high",
  observation: "Glide XL mouse pad has 3 units left and sold 9 units in the last 7 days.",
  evidence: [
    { metric: "Units in stock", value: "3", period: "Now", source: "getStockLevels" },
    { metric: "Units sold", value: "9", period: "Last 7 days", source: "getSalesSummary" },
  ],
  reasoning: "At this pace the stock lasts about two days, and orders would wait for a restock.",
  suggestedAction: "Check the supplier lead time and decide the order quantity.",
  relatedProductIds: ["prod-1"],
  relatedProducts: [{ id: "prod-1", name: "Glide XL mouse pad" }],
  limitations: ["Sales are the fictional demo store's."],
};

const meta = {
  title: "Patterns/Copilot/Recommendation card",
  parameters: { layout: "padded", a11y: { test: "error" } },
  render: () => (
    <div className="max-w-3xl">
      <RecommendationCardView recommendation={RECOMMENDATION} statusAction={noopStatusAction} />
    </div>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A saved recommendation: "High priority" and "Status: Saved" are text, not colour alone. */
export const SavedWithStatus: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("High priority")).toBeVisible();
    await expect(canvas.getByText("Status: Saved")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Glide XL mouse pad" })).toBeVisible();
  },
};
