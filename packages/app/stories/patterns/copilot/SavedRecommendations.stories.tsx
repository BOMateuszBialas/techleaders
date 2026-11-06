import type { CopilotRecommendationList, CopilotRecommendationRecord } from "@commerceos/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SavedRecommendationsView } from "@/components/admin/copilot/saved-recommendations-view";
import {
  EMPTY_RECOMMENDATIONS_TEXT,
  RECOMMENDATIONS_UNAVAILABLE_TITLE,
  type RecommendationStatusAction,
} from "@/components/admin/copilot/recommendation-copy";

/**
 * Patterns / Copilot / Saved recommendations. Real `SavedRecommendationsView` ("Your
 * recommendations") with fixed records: no network, no database. The status actions are stubs:
 * no server action runs in Storybook.
 */

const noopStatusAction: RecommendationStatusAction = async () => ({ status: "idle" });

const SAVED: CopilotRecommendationRecord = {
  id: "rec-1",
  answerId: "answer-1",
  intent: "low_stock",
  origin: "rules",
  model: null,
  title: "Restock the mouse pad before the weekend",
  priority: "high",
  observation: "Glide XL mouse pad has 3 units left and sold 9 units in the last 7 days.",
  evidence: [
    { metric: "Units in stock", value: "3", period: "Now", source: "getStockLevels" },
    { metric: "Units sold", value: "9", period: "Last 7 days", source: "getSalesSummary" },
  ],
  reasoning: "At this pace the stock lasts about two days, and orders would wait for a restock.",
  suggestedAction: "Check the supplier lead time and decide the order quantity.",
  limitations: ["Sales are the fictional demo store's."],
  relatedProducts: [{ id: "prod-1", name: "Glide XL mouse pad" }],
  status: "saved",
  statusChangedAt: new Date("2026-11-02T09:15:00.000Z"),
  createdAt: new Date("2026-11-01T10:00:00.000Z"),
};

const COMPLETED: CopilotRecommendationRecord = {
  ...SAVED,
  id: "rec-2",
  title: "Feature the wireless keyboard on the home page",
  priority: "medium",
  observation: "Wireless keyboard sold 6 units in the last 7 days with no featured placement.",
  evidence: [
    { metric: "Units sold", value: "6", period: "Last 7 days", source: "getSalesSummary" },
  ],
  reasoning: "The product sells steadily without a featured slot, so a slot may add sales.",
  suggestedAction: "Decide whether to feature it in the next home page update.",
  limitations: [],
  relatedProducts: [{ id: "prod-2", name: "Wireless keyboard" }],
  status: "completed",
  statusChangedAt: new Date("2026-11-03T14:30:00.000Z"),
  createdAt: new Date("2026-10-28T08:00:00.000Z"),
};

const LIST: CopilotRecommendationList = {
  rows: [SAVED, COMPLETED],
  page: 1,
  pageCount: 1,
  total: 2,
};

const meta = {
  title: "Patterns/Copilot/Saved recommendations",
  parameters: { layout: "padded", a11y: { test: "error" } },
  render: ({ list }: { list: CopilotRecommendationList | null }) => (
    <div className="max-w-3xl">
      <SavedRecommendationsView list={list} statusAction={noopStatusAction} />
    </div>
  ),
} satisfies Meta<{ list: CopilotRecommendationList | null }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Saved and completed recommendations, newest first, each with its status and its actions. */
export const SavedList: Story = {
  args: { list: LIST },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Your recommendations" })).toBeVisible();
    await expect(canvas.getAllByTestId("copilot-recommendation")).toHaveLength(2);
    await expect(canvas.getByText("Status: Saved")).toBeVisible();
    await expect(canvas.getByText("Status: Completed")).toBeVisible();
  },
};

/** Nothing saved yet: the empty state says where recommendations will appear. */
export const Empty: Story = {
  args: { list: { rows: [], page: 1, pageCount: 1, total: 0 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(EMPTY_RECOMMENDATIONS_TEXT)).toBeVisible();
  },
};

/** The list could not be loaded: an error state with what to do next, not a technical detail. */
export const NotLoaded: Story = {
  args: { list: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(RECOMMENDATIONS_UNAVAILABLE_TITLE);
  },
};

/** A page past the last one: no cards, and a link back to the first page. */
export const PastLastPage: Story = {
  args: { list: { rows: [], page: 3, pageCount: 1, total: 2 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Go to the first page" })).toHaveAttribute(
      "href",
      "/admin/copilot",
    );
  },
};
