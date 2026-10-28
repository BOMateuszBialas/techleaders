import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  CategoryFormView,
  type CategoryFormCategory,
} from "@/components/admin/categories/category-form-view";
import type { ActionState } from "@/lib/action-state";

/**
 * Patterns / Admin / Form. The category form (`CategoryFormView`, the same view the admin uses)
 * in its four states: idle, error after a submit, success, and pending. Each field is a `Field`
 * with a label; errors come from `FieldError` and the form-level result from one `Alert`
 * (`role="alert"` for an error, `role="status"` for a success). Fixed props: no server action.
 */

const CATEGORY: CategoryFormCategory = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  name: "Mice",
  slug: "mice",
  description: "Gaming mice",
  productCount: 0,
};

const IDLE: ActionState = { status: "idle" };

const ERROR: ActionState = {
  status: "error",
  message: "Check the highlighted fields.",
  fieldErrors: { name: ["Enter a category name."] },
  values: { name: "", slug: "mice", description: "Gaming mice" },
};

const SUCCESS: ActionState = {
  status: "success",
  message: "Saved. Shoppers find it at /products?category=mice.",
};

const meta = {
  title: "Patterns/Admin/Form",
  component: CategoryFormView,
  parameters: { layout: "padded", a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div data-density="admin" className="max-w-4xl p-4 md:p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    action: () => undefined,
    state: IDLE,
    pending: false,
    category: CATEGORY,
  },
} satisfies Meta<typeof CategoryFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Stored values, no message: nothing is announced before the first submit. */
export const Idle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Name" })).toHaveValue("Mice");
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** The failed submit keeps the typed values, marks the field and announces the error. */
export const ErrorAfterSubmit: Story = {
  args: { state: ERROR },
  play: async ({ canvas }) => {
    const name = canvas.getByRole("textbox", { name: "Name" });
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription("Enter a category name.");
    await expect(canvas.getByRole("alert")).toHaveTextContent("Check the highlighted fields.");
  },
};

/** The server confirmed the change: one status alert, the form keeps its values. */
export const Success: Story = {
  args: { state: SUCCESS },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Saved.");
    await expect(canvas.getByRole("button", { name: "Save changes" })).toBeEnabled();
  },
};

/** While the save runs the button is disabled and its text says so; a second click does nothing. */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Saving…" })).toBeDisabled();
  },
};
