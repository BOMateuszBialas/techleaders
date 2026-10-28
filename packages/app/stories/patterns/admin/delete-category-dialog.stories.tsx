import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen } from "storybook/test";
import {
  DeleteCategoryDialogBody,
  DeleteCategoryView,
  type DeleteCategoryViewProps,
} from "@/components/admin/categories/delete-category-view";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { IDLE_ACTION_STATE } from "@/lib/action-state";

/**
 * Patterns / Admin / Delete category dialog. Real view (`DeleteCategoryView`) with fixed
 * categories: no server action, no database. An empty category opens an `AlertDialog` whose
 * title names it; a used category cannot be deleted, so its button is disabled and the reason is
 * shown above it. The open-dialog story renders the body in an open root; the popup renders in a
 * portal, so its play function queries `screen`.
 */

const EMPTY: DeleteCategoryViewProps["category"] = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  name: "Streaming",
  productCount: 0,
  products: [],
};

const USED: DeleteCategoryViewProps["category"] = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d02",
  name: "Mice",
  productCount: 2,
  products: [
    { id: "p-1", slug: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse" },
    { id: "p-2", slug: "titan-mmo-mouse", name: "Titan MMO Mouse" },
  ],
};

const meta = {
  title: "Patterns/Admin/Delete category dialog",
  component: DeleteCategoryView,
  parameters: { layout: "padded", a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div data-density="admin" className="max-w-4xl p-4 md:p-6">
        <Story />
      </div>
    ),
  ],
  args: { action: () => undefined, state: IDLE_ACTION_STATE, pending: false, category: EMPTY },
} satisfies Meta<typeof DeleteCategoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An empty category: the destructive button opens the confirmation. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Delete category" })).toBeEnabled();
    await expect(canvas.queryByRole("alertdialog")).toBeNull();
  },
};

/** The confirmation of an empty category: its title names the category; Cancel closes it. */
export const EmptyDialogOpen: StoryObj = {
  render: () => (
    <div data-density="admin" className="max-w-4xl p-4 md:p-6">
      <AlertDialog open>
        <AlertDialogContent>
          <DeleteCategoryDialogBody
            action={() => undefined}
            state={IDLE_ACTION_STATE}
            pending={false}
            category={EMPTY}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
  play: async () => {
    await expect(
      await screen.findByRole("alertdialog", { name: "Delete category Streaming?" }),
    ).toBeVisible();
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  },
};

/** A used category: the products are listed, the refusal is stated and the button is disabled. */
export const Used: Story = {
  args: { category: USED },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Used by 2 products")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Delete category" })).toBeDisabled();
    await expect(canvas.queryByRole("alertdialog")).toBeNull();
  },
};
