import { useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Primitives / Alert dialog. Real component from `@/components/ui/alert-dialog` (Base UI
 * `AlertDialog`). The popup renders in a portal in `<body>`, so play functions query `screen`,
 * not the story canvas. Examples are the two retrofit uses: delete a category, cancel an order.
 */
const meta = {
  title: "Primitives/Alert dialog",
  component: AlertDialog,
  argTypes: {
    defaultOpen: { control: "boolean", description: "Open on first render (uncontrolled)." },
    open: { control: "boolean", description: "Controlled open state, with `onOpenChange`." },
  },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete category
      </AlertDialogTrigger>
      <DeleteCategoryContent />
    </AlertDialog>
  ),
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const DELETE_DESCRIPTION =
  "The category has no products. Links to /products?category=mousepads stop working. This cannot be undone.";

function DeleteCategoryContent({ onSubmit }: { onSubmit?: (data: FormData) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(new FormData(event.currentTarget));
  };
  return (
    <AlertDialogContent>
      <form aria-label="Delete category Mousepads" onSubmit={submit} className="contents">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category Mousepads?</AlertDialogTitle>
          <AlertDialogDescription>{DELETE_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <input type="hidden" name="categoryId" value="cat-mousepads" />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit">Delete category</AlertDialogAction>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}

export const Playground: Story = {};

/** Waits until the alert dialog has left the DOM (the exit transition runs first). */
async function closed() {
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
}

/**
 * Success closes the dialog (in the app the server action redirects or refreshes) and the page
 * reports the result: while the dialog is open the page under it is inert and hidden from
 * assistive technology, so a status there would not be announced.
 */
function DeleteCategory() {
  const [result, setResult] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-group-item">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Delete category
        </AlertDialogTrigger>
        <DeleteCategoryContent
          onSubmit={(data) => {
            setResult(`Deleted ${String(data.get("categoryId"))}.`);
            setOpen(false);
          }}
        />
      </AlertDialog>
      {result ? <p role="status">{result}</p> : null}
    </div>
  );
}

/**
 * Delete an empty category (owner decision Q6): role, name and description; focus starts on
 * "Cancel"; Tab stays inside; a backdrop click does nothing; Escape closes and returns focus.
 */
export const DeleteCategoryConfirmation: Story = {
  render: () => <DeleteCategory />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Delete category" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog", { name: "Delete category Mousepads?" });
    await expect(dialog).toHaveAccessibleDescription(DELETE_DESCRIPTION);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toHaveFocus());
    // Tab moves to the confirmation, and a second Tab wraps back inside the dialog.
    await userEvent.tab();
    await expect(screen.getByRole("button", { name: "Delete category" })).toHaveFocus();
    await userEvent.tab();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    // A click on the backdrop never closes an alert dialog.
    const viewport = document.querySelector("[data-slot=alert-dialog-viewport]");
    if (viewport) await userEvent.click(viewport);
    await expect(screen.getByRole("alertdialog")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** The confirmation submits the real `<form>` inside the dialog (B4.16), then the page reports. */
export const SubmitsTheForm: Story = {
  render: () => <DeleteCategory />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete category" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.textContent === "Delete category",
    );
    await expect(confirm).toBeDefined();
    await expect(confirm?.getAttribute("type")).toBe("submit");
    await expect(confirm?.closest("form")).not.toBeNull();
    if (confirm) await userEvent.click(confirm);
    await closed();
    await expect(await canvas.findByRole("status")).toHaveTextContent("Deleted cat-mousepads.");
  },
};

const CANCEL_DESCRIPTION =
  "2 units go back to stock. The customer is not refunded by this demo store.";

function CancelOrder() {
  const [data, setData] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setData(`status=${String(form.get("status"))}&confirm=${String(form.get("confirm"))}`);
    setOpen(false);
  };
  return (
    <div className="flex flex-col items-start gap-group-item">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Cancel order
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form aria-label="Cancel order CO-GWP9H" onSubmit={submit} className="contents">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel order CO-GWP9H?</AlertDialogTitle>
              <AlertDialogDescription>{CANCEL_DESCRIPTION}</AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="status" value="cancelled" />
            {/* The server checks the confirmation again (orders spec UI/UX). */}
            <input type="hidden" name="confirm" value="yes" />
            <AlertDialogFooter>
              <AlertDialogCancel>Keep order</AlertDialogCancel>
              <AlertDialogAction type="submit">Cancel order</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {data ? <p role="status">{data}</p> : null}
    </div>
  );
}

/**
 * Cancel an order (owner decision Q5): the dialog replaces the required checkbox and keeps the
 * hidden `confirm=yes` for the server. The way out is "Keep order", never a second "Cancel".
 */
export const CancelOrderConfirmation: Story = {
  render: () => <CancelOrder />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Cancel order" }));
    await screen.findByRole("alertdialog", { name: "Cancel order CO-GWP9H?" });
    await expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    // Enter on the focused "Keep order" closes without submitting.
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep order" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await closed();
    await expect(canvas.queryByRole("status")).toBeNull();
    // Open with the keyboard this time and confirm.
    await userEvent.keyboard("{Enter}");
    const again = await screen.findByRole("alertdialog");
    const confirm = Array.from(again.querySelectorAll("button")).find(
      (button) => button.textContent === "Cancel order",
    );
    if (confirm) await userEvent.click(confirm);
    await closed();
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "status=cancelled&confirm=yes",
    );
  },
};

/**
 * While the action runs: the confirmation is `aria-busy` (B1.6) and "Cancel" is disabled, so the
 * dialog cannot close half-way. A server error shows inside the dialog with `role="alert"`.
 */
export const PendingAndError: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete category
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete category Mice?</AlertDialogTitle>
          <AlertDialogDescription>
            Links to /products?category=mice stop working. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            The category still has 3 products. Move them to another category first.
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel disabled>Cancel</AlertDialogCancel>
          <AlertDialogAction type="submit" aria-busy="true">
            Deleting…
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("alertdialog", { name: "Delete category Mice?" });
    await expect(screen.getByRole("alert")).toHaveTextContent("still has 3 products");
    await expect(screen.getByRole("button", { name: "Deleting…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await expect(cancel).toHaveAttribute("data-disabled");
    await expect(dialog).toBeVisible();
  },
};

/**
 * Store density (the default): 24 px padding, 44 px buttons, the overlay surface and the
 * `--backdrop` token without blur; the popup is at most 448 px wide.
 */
export const StoreDensity: Story = {
  render: () => <DeleteCategory />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete category" }));
    const dialog = await screen.findByRole("alertdialog");
    await expect(getComputedStyle(dialog).paddingTop).toBe("24px");
    await expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(448);
    await expect(screen.getByRole("button", { name: "Cancel" }).offsetHeight).toBe(44);
    const backdrop = document.querySelector("[data-slot=alert-dialog-overlay]");
    await expect(backdrop).not.toBeNull();
    if (backdrop) {
      await expect(getComputedStyle(backdrop).backdropFilter).toBe("none");
      // The --backdrop token is translucent (50% light, 60% dark): the computed color has an alpha.
      await expect(getComputedStyle(backdrop).backgroundColor).toMatch(/\/ 0\.[56]\)$/);
    }
  },
};

/**
 * Admin density in a portal (B4.6). The app sets `data-density="admin"` on a `div` in the admin
 * layout, not on `<html>`; the dialog renders in `<body>`, outside that `div`, and still gets the
 * admin scale through `:root:has([data-density="admin"])`: 16 px padding, 32 px buttons.
 */
export const AdminDensityInPortal: Story = {
  render: () => (
    <div data-density="admin">
      <DeleteCategory />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(document.documentElement.getAttribute("data-density")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Delete category" }));
    const dialog = await screen.findByRole("alertdialog");
    await expect(dialog.closest("[data-density]")).toBeNull();
    await expect(getComputedStyle(dialog).paddingTop).toBe("16px");
    await expect(screen.getByRole("button", { name: "Cancel" }).offsetHeight).toBe(32);
  },
};
