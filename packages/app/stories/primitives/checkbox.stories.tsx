import { useState, type ComponentProps, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Checkbox. Real component from `@/components/ui/checkbox` (Base UI `Checkbox`,
 * owner decision Q2), always in a horizontal Field with a visible label.
 */
const meta = {
  title: "Primitives/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Featured on the home page" },
  argTypes: {
    defaultChecked: { control: "boolean", description: "Checked on first render (uncontrolled)." },
    disabled: { control: "boolean", description: "Not changeable; greyed. Say why nearby." },
    required: { control: "boolean", description: "The form refuses to submit it unchecked." },
    "aria-invalid": { control: "boolean", description: "Marks an error: red outline." },
    name: { control: "text", description: "The form field name." },
    value: { control: "text", description: "Submitted when checked (default `on`)." },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const FEATURED_HINT = "Shown in the home page slider while the product is published.";

/** The product form's "Featured": label, hint, error next to the box (B2.11). */
export const WithLabelAndHint: Story = {
  render: () => (
    <Field orientation="horizontal" className="max-w-sm">
      <Checkbox id="featured" name="featured" defaultChecked aria-describedby="featured-hint" />
      <FieldContent>
        <FieldLabel htmlFor="featured">Featured on the home page</FieldLabel>
        <FieldDescription id="featured-hint">{FEATURED_HINT}</FieldDescription>
      </FieldContent>
    </Field>
  ),
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox", { name: "Featured on the home page" });
    await expect(box).toBeChecked();
    await expect(box).toHaveAccessibleDescription(FEATURED_HINT);
    // A click on the label toggles the box.
    await userEvent.click(canvas.getByText("Featured on the home page"));
    await expect(box).not.toBeChecked();
    // Store density: 20 px box, row at least 40 px (44 px on a phone).
    await expect(box.getBoundingClientRect().height).toBe(20);
    const row = box.closest("[data-slot=field]");
    await expect(row?.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
  },
};

function StateBox({ label, ...props }: { label: string } & ComponentProps<typeof Checkbox>) {
  return <Checkbox aria-label={label} {...props} />;
}

/** State matrix, unchecked and checked. Hover does not change the box (B2.10). */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Hover", "Focus", "Error", "Disabled"]}
      rows={[false, true].map((checked) => {
        const name = checked ? "checked" : "unchecked";
        return {
          label: name,
          cells: [
            <StateBox key="d" label={`${name}, default`} defaultChecked={checked} />,
            <StateBox
              key="h"
              label={`${name}, hover`}
              defaultChecked={checked}
              data-preview-state="hover"
            />,
            <StateBox
              key="f"
              label={`${name}, focus`}
              defaultChecked={checked}
              data-preview-state="focus"
            />,
            <StateBox key="e" label={`${name}, error`} defaultChecked={checked} aria-invalid />,
            <StateBox key="x" label={`${name}, disabled`} defaultChecked={checked} disabled />,
          ],
        };
      })}
    />
  ),
  play: async ({ canvas }) => {
    const checked = canvas.getByRole("checkbox", { name: "checked, default" });
    const disabled = canvas.getByRole("checkbox", { name: "checked, disabled" });
    // Checked is the neutral primary, disabled a grey fill: different colors, no opacity.
    await expect(getComputedStyle(disabled).backgroundColor).not.toBe(
      getComputedStyle(checked).backgroundColor,
    );
    await expect(getComputedStyle(disabled).opacity).toBe("1");
    const error = canvas.getByRole("checkbox", { name: "unchecked, error" });
    const plain = canvas.getByRole("checkbox", { name: "unchecked, default" });
    await expect(getComputedStyle(error).borderTopColor).not.toBe(
      getComputedStyle(plain).borderTopColor,
    );
  },
};

/** Keyboard: Tab focuses, Space toggles; the form submits `name=value` only when checked. */
export const KeyboardAndForm: Story = {
  render: () => (
    <form aria-label="Product" className="flex max-w-sm flex-col gap-group-item">
      <Field orientation="horizontal">
        <Checkbox id="k-featured" name="featured" value="on" />
        <FieldContent>
          <FieldLabel htmlFor="k-featured">Featured on the home page</FieldLabel>
        </FieldContent>
      </Field>
    </form>
  ),
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole("checkbox", { name: "Featured on the home page" });
    const form = canvas.getByRole("form", { name: "Product" }) as HTMLFormElement;
    await expect(new FormData(form).get("featured")).toBeNull();
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await expect(getComputedStyle(box).outlineStyle).toBe("solid");
    await userEvent.keyboard(" ");
    await expect(box).toBeChecked();
    await expect(new FormData(form).get("featured")).toBe("on");
  },
};

/**
 * A required confirmation, as in the order status form ("Cancel this order"): the form does not
 * submit until it is checked; then the error disappears.
 */
function RequiredConfirmation() {
  const [submitted, setSubmitted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };
  return (
    <form
      aria-label="Cancel order"
      onSubmit={onSubmit}
      onInvalid={() => setInvalid(true)}
      className="flex max-w-sm flex-col gap-group-item"
    >
      <Field orientation="horizontal">
        <Checkbox
          id="confirm-cancelled"
          name="confirm"
          value="yes"
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "confirm-error" : undefined}
          onCheckedChange={(checked) => setInvalid(invalid && !checked)}
        />
        <FieldContent>
          <FieldLabel htmlFor="confirm-cancelled">
            Return 2 units to stock and cancel order CO-GWP9H
          </FieldLabel>
          {invalid ? (
            <FieldError id="confirm-error">Confirm the cancellation first.</FieldError>
          ) : null}
        </FieldContent>
      </Field>
      <div>
        <Button type="submit" variant="destructive">
          Cancel order
        </Button>
      </div>
      {submitted ? <p role="status">Order cancelled.</p> : null}
    </form>
  );
}

export const Required: Story = {
  render: () => <RequiredConfirmation />,
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Cancel order" });
    await userEvent.click(button);
    await expect(canvas.queryByRole("status")).toBeNull();
    const box = canvas.getByRole("checkbox", {
      name: "Return 2 units to stock and cancel order CO-GWP9H",
    });
    await userEvent.click(box);
    await expect(box).toBeChecked();
    await userEvent.click(button);
    await expect(canvas.getByRole("status")).toHaveTextContent("Order cancelled.");
  },
};

/** Admin scope: 16 px box, aligned to the 20 px label line. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <Field orientation="horizontal" className="max-w-sm">
      <Checkbox id="a-featured" defaultChecked />
      <FieldContent>
        <FieldLabel htmlFor="a-featured">Featured on the home page</FieldLabel>
        <FieldDescription>{FEATURED_HINT}</FieldDescription>
      </FieldContent>
    </Field>
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByRole("checkbox", { name: "Featured on the home page" });
    await expect(box.getBoundingClientRect().height).toBe(16);
    const label = canvas.getByText("Featured on the home page");
    const boxMiddle = box.getBoundingClientRect().top + 8;
    const labelMiddle = label.getBoundingClientRect().top + 10;
    await expect(Math.abs(boxMiddle - labelMiddle)).toBeLessThanOrEqual(1);
  },
};

/** A long label at 320 px wraps next to the box; the box stays on the first line. */
export const LongLabelNarrow: Story = {
  render: () => (
    <Narrow>
      <Field orientation="horizontal">
        <Checkbox id="n-confirm" />
        <FieldContent>
          <FieldLabel htmlFor="n-confirm">
            Return 2 units of Aurora Full-Size Keyboard with hot-swappable switches to stock and
            cancel the order
          </FieldLabel>
        </FieldContent>
      </Field>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};
