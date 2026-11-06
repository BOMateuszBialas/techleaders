import type { RecommendationStatus } from "@commerceos/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  statusChangedMessage,
  type RecommendationStatusState,
} from "@/components/admin/copilot/recommendation-copy";
import { RecommendationStatusFormView } from "@/components/admin/copilot/recommendation-status-form-view";

/**
 * Patterns / Copilot / Recommendation status. Real `RecommendationStatusFormView` with fixed
 * action results: the status the card shows, the owner's next actions and the result of the last
 * action (success or conflict). The form posts nothing in Storybook.
 */

const RECOMMENDATION = { id: "rec-1", title: "Restock the mouse pad before the weekend" };

const CONFLICT_MESSAGE = "This recommendation is already completed. Nothing was changed.";

type Props = {
  status: RecommendationStatus;
  state: RecommendationStatusState;
};

const meta = {
  title: "Patterns/Copilot/Recommendation status",
  parameters: { layout: "padded", a11y: { test: "error" } },
  render: ({ status, state }: Props) => (
    <div className="max-w-3xl">
      <RecommendationStatusFormView
        action={() => undefined}
        state={state}
        pending={false}
        recommendation={{ ...RECOMMENDATION, status }}
      />
    </div>
  ),
} satisfies Meta<Props>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A saved recommendation: the owner can dismiss it or mark it completed. */
export const SavedActions: Story = {
  args: { status: "saved", state: { status: "idle" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^Dismiss:/ })).toBeVisible();
    await expect(canvas.getByRole("button", { name: /^Mark completed:/ })).toBeVisible();
  },
};

/** The save went through: the card shows "Status: Saved" and the result is announced as a status. */
export const SaveSucceeded: Story = {
  args: {
    status: "new",
    state: {
      status: "success",
      message: statusChangedMessage("saved"),
      currentStatus: "saved",
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Recommendation saved.");
    await expect(canvas.getByRole("button", { name: /^Dismiss:/ })).toBeVisible();
  },
};

/** Completed: no further actions, and the success message says Copilot changed nothing. */
export const CompletedNoFurtherActions: Story = {
  args: {
    status: "completed",
    state: {
      status: "success",
      message: statusChangedMessage("completed"),
      currentStatus: "completed",
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No further actions.")).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("Copilot did not change anything");
  },
};

/**
 * Another tab completed the recommendation first: the card shows the server's status, offers no
 * refused action, and the conflict is an alert.
 */
export const Conflict: Story = {
  args: {
    status: "saved",
    state: { status: "error", message: CONFLICT_MESSAGE, currentStatus: "completed" },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(CONFLICT_MESSAGE);
    await expect(canvas.getByText("No further actions.")).toBeVisible();
  },
};
