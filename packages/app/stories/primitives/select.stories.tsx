import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { expect } from "storybook/test";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Select. Real component from `@/components/ui/native-select` (a native `<select>`,
 * owner decision Q1). Every select here has a label: one without fails the accessibility check.
 */
const meta = {
  title: "Primitives/Select",
  component: NativeSelect,
  args: { "aria-label": "Category", defaultValue: "" },
  argTypes: {
    disabled: { control: "boolean", description: "Not editable; greyed. Say why nearby." },
    "aria-invalid": { control: "boolean", description: "Marks an error: red outline." },
    required: { control: "boolean", description: "The form refuses an empty value." },
  },
  render: (args) => (
    <div className="max-w-sm">
      <NativeSelect {...args}>
        <NativeSelectOption value="">No category</NativeSelectOption>
        <NativeSelectOption value="mice">Mice</NativeSelectOption>
        <NativeSelectOption value="keyboards">Keyboards</NativeSelectOption>
        <NativeSelectOption value="headsets">Headsets</NativeSelectOption>
      </NativeSelect>
    </div>
  ),
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const CATEGORIES = [
  ["mice", "Mice"],
  ["keyboards", "Keyboards"],
  ["headsets", "Headsets"],
  ["controllers", "Controllers"],
] as const;

/** One look; options and option groups. */
export const Options: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-group-item">
      <Field>
        <FieldLabel htmlFor="o-category">Category</FieldLabel>
        <NativeSelect id="o-category" defaultValue="">
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {CATEGORIES.map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="o-status">Status</FieldLabel>
        <NativeSelect id="o-status" defaultValue="draft">
          <NativeSelectOptGroup label="Not visible in the store">
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
          </NativeSelectOptGroup>
          <NativeSelectOptGroup label="Visible in the store">
            <NativeSelectOption value="published">Published</NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </Field>
    </div>
  ),
};

function CategorySelect({ label, ...props }: { label: string } & ComponentProps<"select">) {
  return (
    <NativeSelect aria-label={label} defaultValue="mice" {...props}>
      <NativeSelectOption value="">No category</NativeSelectOption>
      <NativeSelectOption value="mice">Mice</NativeSelectOption>
    </NativeSelect>
  );
}

/** State matrix: hover does not change the select; focus and error as Input (B2.7). */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Hover", "Focus", "Error", "Error + focus", "Disabled"]}
      rows={[
        {
          label: "select",
          cells: [
            <CategorySelect key="d" label="Category, default" />,
            <CategorySelect key="h" label="Category, hover" data-preview-state="hover" />,
            <CategorySelect key="f" label="Category, focus" data-preview-state="focus" />,
            <CategorySelect key="e" label="Category, error" aria-invalid />,
            <CategorySelect
              key="ef"
              label="Category, error and focus"
              aria-invalid
              data-preview-state="focus"
            />,
            <CategorySelect key="x" label="Category, disabled" disabled />,
          ],
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    const errorFocus = canvas.getByRole("combobox", { name: "Category, error and focus" });
    const error = canvas.getByRole("combobox", { name: "Category, error" });
    const focus = canvas.getByRole("combobox", { name: "Category, focus" });
    await expect(getComputedStyle(errorFocus).borderTopColor).toBe(
      getComputedStyle(error).borderTopColor,
    );
    await expect(getComputedStyle(errorFocus).outlineColor).toBe(
      getComputedStyle(focus).outlineColor,
    );
    const disabled = canvas.getByRole("combobox", { name: "Category, disabled" });
    await expect(disabled).toBeDisabled();
    await expect(getComputedStyle(disabled).opacity).toBe("1");
  },
};

/** Keyboard choice and the submitted value: a native select, so `FormData` has it. */
export const Choosing: Story = {
  render: () => (
    <form aria-label="Catalog search" className="flex max-w-sm flex-col gap-group-item">
      <Field>
        <FieldLabel htmlFor="c-category">Category</FieldLabel>
        <NativeSelect id="c-category" name="category" defaultValue="">
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {CATEGORIES.map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </form>
  ),
  play: async ({ canvas, userEvent }) => {
    const select = canvas.getByRole("combobox", { name: "Category" });
    await userEvent.tab();
    await expect(select).toHaveFocus();
    await expect(getComputedStyle(select).outlineStyle).toBe("solid");
    await userEvent.selectOptions(select, "keyboards");
    await expect(select).toHaveValue("keyboards");
    const form = canvas.getByRole("form", { name: "Catalog search" }) as HTMLFormElement;
    await expect(new FormData(form).get("category")).toBe("keyboards");
    // Store density: 44 px tall, 16 px text.
    await expect(select.getBoundingClientRect().height).toBe(44);
    await expect(getComputedStyle(select).fontSize).toBe("16px");
  },
};

/** In a Field with a hint and an error from the server. */
export const InField: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="f-category">Category</FieldLabel>
      <NativeSelect
        id="f-category"
        defaultValue="archived"
        aria-invalid
        aria-describedby="f-category-hint f-category-error"
      >
        <NativeSelectOption value="">No category</NativeSelectOption>
        <NativeSelectOption value="archived">Retro (deleted)</NativeSelectOption>
        <NativeSelectOption value="mice">Mice</NativeSelectOption>
      </NativeSelect>
      <FieldDescription id="f-category-hint">
        Products without a category appear only under “All products”.
      </FieldDescription>
      <FieldError id="f-category-error">This category no longer exists. Choose another.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Category" });
    await expect(select).toBeInvalid();
    await expect(select).toHaveAccessibleDescription(
      "Products without a category appear only under “All products”. This category no longer exists. Choose another.",
    );
  },
};

/** Admin scope: 32 px tall, 14 px text on a desktop. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="a-status">Status</FieldLabel>
      <NativeSelect id="a-status" defaultValue="draft">
        <NativeSelectOption value="draft">Draft</NativeSelectOption>
        <NativeSelectOption value="published">Published</NativeSelectOption>
      </NativeSelect>
    </Field>
  ),
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Status" });
    await expect(select.getBoundingClientRect().height).toBe(32);
    await expect(getComputedStyle(select).fontSize).toBe("14px");
  },
};

/** A long option at 320 px: the select keeps the frame width, the page never scrolls sideways. */
export const LongOptionNarrow: Story = {
  render: () => (
    <Narrow>
      <Field>
        <FieldLabel htmlFor="n-category">Category</FieldLabel>
        <NativeSelect id="n-category" defaultValue="long">
          <NativeSelectOption value="long">
            Streaming accessories: microphones, arms, capture cards and lights
          </NativeSelectOption>
          <NativeSelectOption value="mice">Mice</NativeSelectOption>
        </NativeSelect>
      </Field>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};
