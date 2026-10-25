import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { TextLink } from "@/components/ui/text-link";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Error state. Real component from `@/components/ui/error-state`: a destructive
 * Alert with a fixed `role="alert"`, a required title and description and an optional action
 * (owner decision Q4).
 */
const meta = {
  title: "Primitives/Error state",
  component: ErrorState,
  args: {
    title: "The catalog is temporarily unavailable",
    description: "Try again in a moment.",
    className: "max-w-xl",
  },
  argTypes: {
    title: { control: "text", description: "What happened, as a fact. Required." },
    description: { control: "text", description: "What to do now. Required." },
    action: { control: false, description: "Optional `Button` or `TextLink`." },
  },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("The catalog is temporarily unavailable");
    await expect(alert).toHaveTextContent("Try again in a moment.");
    await expect(alert.querySelector("svg")).not.toBeNull();
  },
};

const retry = fn();

/** A section that failed to load, with "Try again" (the `error.tsx` reset). */
export const WithRetry: Story = {
  args: {
    title: "Recommendations could not be loaded",
    description: "Your saved recommendations are safe. Try again.",
    action: (
      <Button size="sm" variant="outline" onClick={retry}>
        Try again
      </Button>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(retry).toHaveBeenCalledTimes(1);
    // Focus is not moved to the message (the role announces it).
    await expect(canvas.getByRole("alert")).not.toHaveFocus();
  },
};

/** A page-level error: the title holds the page's `<h1>`, the action leads back. */
export const PageHeading: Story = {
  args: {
    title: <h1>Something went wrong on this page</h1>,
    description: "Your cart and orders are not affected. Go back and try again.",
    action: (
      <TextLink variant="standalone" href="/">
        Back to the home page
      </TextLink>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Something went wrong on this page",
    );
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Back to the home page" })).toHaveFocus();
  },
};

/** Admin density and 320 px: the text wraps, the icon stays on the first line. */
export const AdminNarrow: Story = {
  globals: { density: "admin" },
  args: {
    title: "The dashboard metrics could not be loaded",
    description:
      "The database did not answer in time. Reload the page; if it keeps failing, check the system status.",
    className: undefined,
  },
  render: (args) => (
    <Narrow>
      <ErrorState {...args} />
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    await expect(getComputedStyle(canvas.getByRole("alert")).fontSize).toBe("14px");
  },
};
