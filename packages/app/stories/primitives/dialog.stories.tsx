import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Primitives / Dialog. Real component from `@/components/ui/dialog` (Base UI `Dialog`, modal).
 * The product has no dialog yet (owner decision Q3): the examples show the anatomy on a short
 * task that could live in one. The popup renders in a portal, so play functions query `screen`.
 */
const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  argTypes: {
    defaultOpen: { control: "boolean", description: "Open on first render (uncontrolled)." },
    open: { control: "boolean", description: "Controlled open state, with `onOpenChange`." },
    modal: {
      control: "boolean",
      description: "Trap focus and lock page scroll. Keep the default `true`.",
      table: { defaultValue: { summary: "true" } },
    },
  },
  render: (args) => <RenameDialog {...args} />,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function RenameDialog(props: React.ComponentProps<typeof Dialog>) {
  return (
    <Dialog {...props}>
      <DialogTrigger render={<Button variant="outline" />}>Rename category</DialogTrigger>
      <DialogContent>
        <form
          aria-label="Rename category"
          className="contents"
          onSubmit={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              The address /products?category=mice does not change.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="rename-name">Name</FieldLabel>
            <Input
              id="rename-name"
              name="name"
              defaultValue="Mice"
              aria-describedby="rename-hint"
            />
            <FieldDescription id="rename-hint">
              Shown in the store menu and footer.
            </FieldDescription>
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Save name</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function closed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

export const Playground: Story = {};

/**
 * Opening moves focus to the first field; the page under it cannot scroll; Escape closes and
 * focus returns to the trigger.
 */
export const FocusAndEscape: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Rename category" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Rename category" });
    await expect(dialog).toHaveAccessibleDescription(
      "The address /products?category=mice does not change.",
    );
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus());
    // Base UI locks page scroll while a modal dialog is open.
    const locked = [document.documentElement, document.body].some(
      (element) => getComputedStyle(element).overflow === "hidden",
    );
    await expect(locked).toBe(true);
    await userEvent.keyboard("{Escape}");
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** A click on the backdrop closes a dialog (unlike an alert dialog); so do the X and "Cancel". */
export const BackdropXAndCancel: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Rename category" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    const viewport = document.querySelector("[data-slot=dialog-viewport]");
    if (viewport) await userEvent.click(viewport);
    await closed();

    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await closed();

    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

const TERMS = Array.from({ length: 14 }, (_, index) => ({
  title: `Section ${index + 1}`,
  body: "Orders in this demo store are fictional. No payment is taken and nothing is shipped; stock changes only when an order is placed, cancelled or adjusted by the owner.",
}));

/**
 * Long content: the popup stays inside the window; the body scrolls (and takes focus so the
 * keyboard can scroll it) while the title and the buttons stay visible (B4.9).
 */
export const LongContent: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button variant="outline" />}>Read the demo terms</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo store terms</DialogTitle>
          <DialogDescription>What this store does and does not do.</DialogDescription>
        </DialogHeader>
        <DialogBody role="group" aria-label="Terms">
          <div className="flex flex-col gap-group-item">
            {TERMS.map((term) => (
              <section key={term.title} className="flex flex-col gap-1">
                <h3 className="type-h3">{term.title}</h3>
                <p className="max-w-measure">{term.body}</p>
              </section>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button />}>Close terms</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Demo store terms" });
    await expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    const body = screen.getByRole("group", { name: "Terms" });
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const footerButton = screen.getByRole("button", { name: "Close terms" });
    await expect(footerButton.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );
  },
};

/** Admin scope: 16 px padding, 32 px buttons, admin title size (16 px). */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  args: { defaultOpen: true },
  play: async () => {
    const dialog = await screen.findByRole("dialog");
    await expect(getComputedStyle(dialog).paddingTop).toBe("16px");
    await expect(screen.getByRole("button", { name: "Save name" }).offsetHeight).toBe(32);
    const title = screen.getByRole("heading", { name: "Rename category" });
    await expect(getComputedStyle(title).fontSize).toBe("16px");
  },
};
