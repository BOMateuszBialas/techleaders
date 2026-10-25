import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { TextLink } from "@/components/ui/text-link";
import { StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Disclosure. Real components from `@/components/ui/disclosure`: native `<details>`
 * and `<summary>` (owner decision Q5), so it opens without JavaScript.
 */
const meta = {
  title: "Primitives/Disclosure",
  component: Disclosure,
  args: { open: false },
  argTypes: {
    open: { control: "boolean", description: "Open on first render (the native attribute)." },
    name: {
      control: "text",
      description: "Disclosures with the same name open one at a time (native exclusive group).",
    },
  },
  render: (args) => (
    <Disclosure {...args} className="max-w-xl">
      <DisclosureTrigger>How these metrics are calculated</DisclosureTrigger>
      <DisclosureContent>
        <p className="max-w-measure text-muted-foreground">
          Revenue is the sum of paid orders in the period, in PLN. Average order value is revenue
          divided by the number of paid orders.
        </p>
      </DisclosureContent>
    </Disclosure>
  ),
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A click opens and closes; the content is visible only when open. */
export const Click: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const details = canvasElement.querySelector("details");
    const trigger = canvas.getByText("How these metrics are calculated");
    await expect(canvas.getByText(/Revenue is the sum/)).not.toBeVisible();
    await userEvent.click(trigger);
    await expect(details).toHaveAttribute("open");
    await expect(canvas.getByText(/Revenue is the sum/)).toBeVisible();
    await userEvent.click(trigger);
    await expect(details).not.toHaveAttribute("open");
  },
};

/**
 * Keyboard: Tab reaches the summary and shows the focus outline. Enter and Space come from the
 * browser (native `<summary>`); a play function cannot press them, because simulated (untrusted)
 * key events have no default action, so this checks the native structure that gives them.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const details = canvasElement.querySelector("details");
    const summary = canvasElement.querySelector("summary");
    await userEvent.tab();
    await expect(summary).toHaveFocus();
    await expect(summary && getComputedStyle(summary).outlineStyle).toBe("solid");
    // The summary is the first child of <details>: the browser's own disclosure button.
    await expect(details?.firstElementChild).toBe(summary);
    await expect(summary?.querySelector("button, a, [tabindex]")).toBeNull();
  },
};

/** State matrix: closed, hover (underline), focus, open (chevron turned). */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Closed", "Hover", "Focus", "Open"]}
      rows={[
        {
          label: "disclosure",
          cells: [
            <Disclosure key="c">
              <DisclosureTrigger>Details</DisclosureTrigger>
              <DisclosureContent>Closed content.</DisclosureContent>
            </Disclosure>,
            <Disclosure key="h">
              <DisclosureTrigger data-preview-state="hover">Details</DisclosureTrigger>
              <DisclosureContent>Hover content.</DisclosureContent>
            </Disclosure>,
            <Disclosure key="f">
              <DisclosureTrigger data-preview-state="focus">Details</DisclosureTrigger>
              <DisclosureContent>Focus content.</DisclosureContent>
            </Disclosure>,
            <Disclosure key="o" open>
              <DisclosureTrigger>Details</DisclosureTrigger>
              <DisclosureContent>Open content.</DisclosureContent>
            </Disclosure>,
          ],
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const summaries = canvasElement.querySelectorAll<HTMLElement>("summary");
    const [closed, hover, focus, open] = Array.from(summaries);
    await expect(closed && getComputedStyle(closed).textDecorationLine).toBe("none");
    await expect(hover && getComputedStyle(hover).textDecorationLine).toBe("underline");
    await expect(focus && getComputedStyle(focus).outlineStyle).toBe("solid");
    const rotation = (summary: HTMLElement | undefined) => {
      const chevron = summary?.querySelector("svg");
      return chevron ? getComputedStyle(chevron).rotate : null;
    };
    await expect(rotation(open)).toBe("180deg");
    await expect(rotation(closed)).not.toBe("180deg");
  },
};

/**
 * The store menu on a phone: a button-shaped trigger (`buttonVariants({ variant: "outline" })`
 * through `className`, no new variant, B3.27). Works without JavaScript (spec G13).
 */
export const ButtonShaped: Story = {
  render: () => (
    <Disclosure>
      <DisclosureTrigger
        className={cn(buttonVariants({ variant: "outline" }), "hover:no-underline")}
      >
        Menu
      </DisclosureTrigger>
      <DisclosureContent>
        <nav aria-label="Store" className="flex flex-col gap-related">
          <TextLink variant="standalone" href="/products">
            All products
          </TextLink>
          <TextLink variant="standalone" href="/cart">
            Cart
          </TextLink>
        </nav>
      </DisclosureContent>
    </Disclosure>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const summary = canvasElement.querySelector<HTMLElement>("summary");
    await expect(summary?.getBoundingClientRect().height).toBe(44);
    await userEvent.click(canvas.getByText("Menu"));
    await expect(canvas.getByRole("link", { name: "Cart" })).toBeVisible();
  },
};

/** Admin density: 16 px chevron, 14 px text (the Copilot metric definitions). */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  args: { open: true },
  play: async ({ canvasElement }) => {
    const summary = canvasElement.querySelector<HTMLElement>("summary");
    await expect(summary && getComputedStyle(summary).fontSize).toBe("14px");
    await expect(summary?.querySelector("svg")?.getBoundingClientRect().width).toBe(16);
  },
};
