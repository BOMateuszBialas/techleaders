import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  IDLE_COPILOT_STATE,
  PENDING_TEXT,
  type CopilotPanelState,
  type SuggestedQuestion,
} from "@/components/admin/copilot/copilot-copy";
import { CopilotPanelView } from "@/components/admin/copilot/copilot-panel-view";

/**
 * Patterns / Copilot / Question form. Real view from `copilot-panel-view.tsx` with fixed props:
 * no network, no provider. The counter is in the field description, not in a live region.
 */

const QUESTIONS: SuggestedQuestion[] = [
  { intent: "focus", question: "What should I focus on to improve sales this week?" },
  { intent: "low_stock", question: "Which products are low on stock?" },
];

const TYPED =
  "Which products are low on stock, and how many units of each are left in the warehouse now?";

type Props = {
  state: CopilotPanelState;
  pending: boolean;
  questionLength: number;
};

const meta = {
  title: "Patterns/Copilot/Question form",
  parameters: { layout: "padded" },
  render: ({ state, pending, questionLength }: Props) => (
    <div className="max-w-4xl">
      <CopilotPanelView
        action={() => undefined}
        state={state}
        pending={pending}
        questions={QUESTIONS}
        questionLength={questionLength}
        onQuestionChange={() => undefined}
      />
    </div>
  ),
} satisfies Meta<Props>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing typed: the counter reads 0 of 500 characters. */
export const Idle: Story = {
  args: { state: IDLE_COPILOT_STATE, pending: false, questionLength: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Or ask about your store" }),
    ).toHaveAccessibleDescription("Up to 500 characters, in English. 0 of 500 characters");
  },
};

/** A typed question keeps its text, and the counter follows its length. */
export const Typed: Story = {
  args: {
    state: { status: "idle", question: TYPED },
    pending: false,
    questionLength: TYPED.length,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Or ask about your store" }),
    ).toHaveAccessibleDescription(
      `Up to 500 characters, in English. ${TYPED.length} of 500 characters`,
    );
  },
};

/** While the answer is pending the field is read-only, the buttons are disabled, the form is busy. */
export const Pending: Story = {
  args: { state: IDLE_COPILOT_STATE, pending: true, questionLength: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent(PENDING_TEXT);
    await expect(canvas.getByRole("button", { name: "Ask" })).toBeDisabled();
  },
};
