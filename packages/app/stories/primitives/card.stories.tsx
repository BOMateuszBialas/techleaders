import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Card. Real components from `@/components/ui/card`. The heading level comes from the
 * caller, so every title here holds a real heading.
 */
const meta = {
  title: "Primitives/Card",
  component: Card,
  args: { size: "default" },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["default", "sm"],
      description: "`sm` uses the group-item spacing (16 px store, 12 px admin).",
      table: { defaultValue: { summary: "default" } },
    },
  },
  render: (args) => (
    <Card {...args} className="max-w-sm">
      <CardHeader>
        <CardTitle>
          <h2>Order summary</h2>
        </CardTitle>
        <CardDescription>2 items</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-related">
          <dt>Subtotal</dt>
          <dd className="text-right tabular-nums">498.00 PLN</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right font-semibold tabular-nums">498.00 PLN</dd>
        </dl>
      </CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>("[data-slot=card]");
    if (!card) throw new Error("Expected a card");
    const style = getComputedStyle(card);
    // Store density: 24 px panel padding, 12 px radius, no shadow, a 1 px outline.
    await expect(style.paddingTop).toBe("24px");
    await expect(style.borderTopLeftRadius).toBe("12px");
    await expect(style.boxShadow).toBe("none");
    await expect(style.borderTopWidth).toBe("1px");
  },
};

/** All parts: header with an action on the right, content and footer. */
export const AllParts: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>
          <h3>Restock the Vortex Wireless Mouse</h3>
        </CardTitle>
        <CardDescription>Based on the last 30 days of paid orders.</CardDescription>
        <CardAction>
          <Badge variant="warning">High priority</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>3 units left; 12 sold in the last 30 days.</p>
      </CardContent>
      <CardFooter className="gap-related">
        <Button size="sm">Save</Button>
        <Button size="sm" variant="outline">
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  ),
};

/** Admin scope: 16 px padding, 14 px text, 16 px title (a dashboard metric card). */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <Card className="max-w-xs">
      <CardHeader>
        <CardTitle>
          <h3>Revenue (paid orders)</h3>
        </CardTitle>
        <CardDescription>
          Sum of the totals of paid, processing and shipped orders in the period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="type-display">12,480.00 PLN</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement, canvas }) => {
    const card = canvasElement.querySelector<HTMLElement>("[data-slot=card]");
    if (!card) throw new Error("Expected a card");
    await expect(getComputedStyle(card).paddingTop).toBe("16px");
    const title = canvas.getByRole("heading", { name: "Revenue (paid orders)" });
    await expect(getComputedStyle(title).fontSize).toBe("16px");
  },
};

/** Small size: denser panels such as a sign-in card on a phone. */
export const Small: Story = {
  args: { size: "sm" },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>("[data-slot=card]");
    if (!card) throw new Error("Expected a card");
    await expect(getComputedStyle(card).paddingTop).toBe("16px");
  },
};

/** Long title at 320 px: it wraps and the card never overflows. */
export const LongTitleNarrow: Story = {
  render: () => (
    <Narrow>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Sign in to your CommerceOS demo store account</h2>
          </CardTitle>
          <CardDescription>
            Accounts in this demo store hold only demo orders and are removed with the demo data.
          </CardDescription>
        </CardHeader>
      </Card>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};
