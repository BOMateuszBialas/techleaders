import { useRef, useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Field. Real parts from `@/components/ui/field`. The control points at its hint
 * and error with `aria-describedby` and carries `aria-invalid`; that wiring is the screen's job.
 */
const meta = {
  title: "Primitives/Field",
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

const PRICE_HINT =
  "For example 249.90 or 249,90. A published product needs a price above 0.00; a draft may be 0.00.";

/** Label, control, hint (B1.26). */
export const Playground: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="f-price">Price (PLN)</FieldLabel>
      <Input id="f-price" inputMode="decimal" required aria-describedby="f-price-hint" />
      <FieldDescription id="f-price-hint">{PRICE_HINT}</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Price (PLN)" })).toHaveAccessibleDescription(
      PRICE_HINT,
    );
  },
};

/** An error: red outline, icon and text; the label and hint keep their colors (B1.23). */
export const WithError: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="f-postal">Postal code</FieldLabel>
      <Input
        id="f-postal"
        autoComplete="postal-code"
        defaultValue="0950"
        aria-invalid
        aria-describedby="f-postal-error"
      />
      <FieldError id="f-postal-error">Enter a postal code like 00-950.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Postal code" });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription("Enter a postal code like 00-950.");
    // Not a live region: the form announces one summary instead (B1.23).
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** Optional fields say so; required ones are not marked (owner decision Q2). */
export const Optional: Story = {
  render: () => (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor="f-line1">Address</FieldLabel>
        <Input id="f-line1" autoComplete="address-line1" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="f-line2" optional>
          Address line 2
        </FieldLabel>
        <Input id="f-line2" autoComplete="address-line2" />
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Address line 2 (optional)" }),
    ).not.toBeRequired();
    await expect(canvas.getByRole("textbox", { name: "Address" })).toBeRequired();
  },
};

/** Vertical space between the first two fields around the given controls. */
function gapBetweenFirstFields(controls: HTMLElement[]): number {
  const [first, second] = controls.map((control) => control.closest("[data-slot=field]"));
  if (!first || !second) throw new Error("Expected two fields");
  return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
}

/** A named group of fields: legend, then fields `--space-group-item` apart. */
export const Group: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend>Shipping address</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="g-line1">Address</FieldLabel>
          <Input id="g-line1" autoComplete="address-line1" defaultValue="ul. Marszałkowska 1" />
        </Field>
        <Field>
          <FieldLabel htmlFor="g-city">City</FieldLabel>
          <Input id="g-city" autoComplete="address-level2" defaultValue="Warszawa" />
        </Field>
        <Field>
          <FieldLabel htmlFor="g-postal">Postal code</FieldLabel>
          <Input id="g-postal" autoComplete="postal-code" defaultValue="00-950" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Shipping address" })).toBeInTheDocument();
    // Store density: 16 px between fields.
    await expect(gapBetweenFirstFields(canvas.getAllByRole("textbox"))).toBe(16);
  },
};

/** The same group in the admin scope: 12 px between fields, 14 px labels. */
export const AdminDensity: Story = {
  ...Group,
  globals: { density: "admin" },
  play: async ({ canvas }) => {
    await expect(gapBetweenFirstFields(canvas.getAllByRole("textbox"))).toBe(12);
  },
};

/** A disabled field: label, value and outline in muted colors, the reason in the hint. */
export const Disabled: Story = {
  render: () => (
    <Field className="max-w-sm" data-disabled="true">
      <FieldLabel htmlFor="f-ref">Order reference</FieldLabel>
      <Input
        id="f-ref"
        className="font-mono"
        disabled
        defaultValue="CO-GWP9H-XS4PQ-YMB0S-181M8"
        aria-describedby="f-ref-hint"
      />
      <FieldDescription id="f-ref-hint">
        The reference is set when the order is placed.
      </FieldDescription>
    </Field>
  ),
};

/** A long hint and a long error wrap at 320 px; the icon stays on the first line. */
export const LongContentNarrow: Story = {
  render: () => (
    <Narrow>
      <Field>
        <FieldLabel htmlFor="n-desc">Description</FieldLabel>
        <Textarea id="n-desc" aria-invalid aria-describedby="n-desc-hint n-desc-error" />
        <FieldDescription id="n-desc-hint">
          Uses only the name, category, price and description in this form. Nothing is saved until
          you click Save.
        </FieldDescription>
        <FieldError id="n-desc-error">
          Write a description of at most 2000 characters, or leave it empty for a draft.
        </FieldError>
      </Field>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

const EMAIL_ERROR = "Enter a valid email address.";
const NAME_ERROR = "Enter your full name.";

/**
 * Story-only harness around the real parts: client checks on submit, then focus on the first
 * field with an error and keep what was typed (audit decision 5). The app validates on the
 * server; this shows the same states without one.
 */
function ValidationExample() {
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      name: String(data.get("name")).trim() === "" ? NAME_ERROR : undefined,
      email: String(data.get("email")).includes("@") ? undefined : EMAIL_ERROR,
    };
    setErrors(next);
    const first = next.name ? "v-name" : next.email ? "v-email" : null;
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#${first}`)?.focus();
  };
  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="flex max-w-sm flex-col gap-group">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="v-name">Full name</FieldLabel>
          <Input
            id="v-name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={errors.name !== undefined}
            aria-describedby={errors.name ? "v-name-error" : undefined}
          />
          <FieldError id="v-name-error">{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="v-email">Email</FieldLabel>
          <Input
            id="v-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email ? "v-email-error" : undefined}
          />
          <FieldError id="v-email-error">{errors.email}</FieldError>
        </Field>
      </FieldGroup>
      <div>
        <Button type="submit" variant="action">
          Place order
        </Button>
      </div>
    </form>
  );
}

/** Validation: submit with errors, focus moves to the first one, typed values stay. */
export const Validation: Story = {
  render: () => <ValidationExample />,
  play: async ({ canvas, userEvent }) => {
    const email = canvas.getByRole("textbox", { name: "Email" });
    await userEvent.type(email, "jan.example.com");
    await userEvent.click(canvas.getByRole("button", { name: "Place order" }));
    const name = canvas.getByRole("textbox", { name: "Full name" });
    await expect(name).toHaveFocus();
    await expect(name).toHaveAccessibleDescription(NAME_ERROR);
    await expect(email).toHaveAccessibleDescription(EMAIL_ERROR);
    await expect(email).toHaveValue("jan.example.com");
  },
};
