import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Radio group. Real components from `@/components/ui/radio-group` (Base UI
 * `RadioGroup` and `Radio`, owner decisions Q2, Q3). Each option is a horizontal Field; the group
 * is named by its legend.
 */
const meta = {
  title: "Primitives/Radio group",
  component: RadioGroup,
  args: { defaultValue: "30", name: "period" },
  argTypes: {
    defaultValue: { control: "text", description: "The option chosen on first render." },
    disabled: { control: "boolean", description: "The whole group is not changeable." },
    name: { control: "text", description: "The form field name." },
    required: { control: "boolean", description: "The form refuses an empty choice." },
  },
  render: (args) => <PeriodGroup {...args} />,
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const PERIODS = [
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
] as const;

/** A future dashboard choice (POSTEP §5): the period of the metrics. */
function PeriodGroup(props: ComponentProps<typeof RadioGroup>) {
  return (
    <FieldSet className="max-w-sm">
      <FieldLegend id="period-legend" variant="label">
        Period
      </FieldLegend>
      <RadioGroup aria-labelledby="period-legend" {...props}>
        {PERIODS.map(([value, label]) => (
          <Field key={value} orientation="horizontal">
            <RadioGroupItem id={`period-${value}`} value={value} />
            <FieldContent>
              <FieldLabel htmlFor={`period-${value}`}>{label}</FieldLabel>
            </FieldContent>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}

export const Playground: Story = {};

/** Options with a hint each. */
export const WithHints: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend id="theme-legend" variant="label">
        Theme
      </FieldLegend>
      <RadioGroup aria-labelledby="theme-legend" defaultValue="system">
        {[
          ["light", "Light", "White pages, dark text."],
          ["dark", "Dark", "Dark pages, light text."],
          ["system", "System", "Follows the setting of this device."],
        ].map(([value, label, hint]) => (
          <Field key={value} orientation="horizontal">
            <RadioGroupItem
              id={`theme-${value}`}
              value={value}
              aria-describedby={`theme-${value}-hint`}
            />
            <FieldContent>
              <FieldLabel htmlFor={`theme-${value}`}>{label}</FieldLabel>
              <FieldDescription id={`theme-${value}-hint`}>{hint}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    await expect(canvas.getByRole("radio", { name: "System" })).toBeChecked();
  },
};

/** State matrix, unchecked and checked (B2.10, B2.12). */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Hover", "Focus", "Error", "Disabled"]}
      rows={[false, true].map((checked) => {
        const name = checked ? "checked" : "unchecked";
        const cell = (key: string, label: string, props: Record<string, unknown> = {}) => (
          <RadioGroup
            key={key}
            aria-label={`${name}, ${label}`}
            defaultValue={checked ? "a" : undefined}
            disabled={label === "disabled"}
          >
            <RadioGroupItem value="a" aria-label={`${name}, ${label} option`} {...props} />
          </RadioGroup>
        );
        return {
          label: name,
          cells: [
            cell("d", "default"),
            cell("h", "hover", { "data-preview-state": "hover" }),
            cell("f", "focus", { "data-preview-state": "focus" }),
            cell("e", "error", { "aria-invalid": true }),
            cell("x", "disabled"),
          ],
        };
      })}
    />
  ),
  play: async ({ canvas }) => {
    const checked = canvas.getByRole("radio", { name: "checked, default option" });
    const disabled = canvas.getByRole("radio", { name: "checked, disabled option" });
    await expect(checked).toBeChecked();
    await expect(getComputedStyle(disabled).backgroundColor).not.toBe(
      getComputedStyle(checked).backgroundColor,
    );
    await expect(getComputedStyle(disabled).opacity).toBe("1");
  },
};

/** One Tab stop; arrow keys move the choice; the form submits the chosen value. */
export const Keyboard: Story = {
  render: () => (
    <form aria-label="Dashboard range">
      <PeriodGroup name="period" defaultValue="7" />
    </form>
  ),
  play: async ({ canvas, userEvent }) => {
    const first = canvas.getByRole("radio", { name: "Last 7 days" });
    const second = canvas.getByRole("radio", { name: "Last 30 days" });
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await expect(getComputedStyle(first).outlineStyle).toBe("solid");
    await userEvent.keyboard("{ArrowDown}");
    await expect(second).toHaveFocus();
    await expect(second).toBeChecked();
    const form = canvas.getByRole("form", { name: "Dashboard range" }) as HTMLFormElement;
    await expect(new FormData(form).get("period")).toBe("30");
    // Tab leaves the group: one stop for the whole group.
    await userEvent.tab();
    await expect(second).not.toHaveFocus();
    await expect(first).not.toHaveFocus();
  },
};

/** A click on the label chooses the option. */
export const LabelClick: Story = {
  render: () => <PeriodGroup defaultValue="7" />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Last 90 days"));
    await expect(canvas.getByRole("radio", { name: "Last 90 days" })).toBeChecked();
  },
};

/** Admin scope: 16 px circles. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => <PeriodGroup defaultValue="30" />,
  play: async ({ canvas }) => {
    const radio = canvas.getByRole("radio", { name: "Last 30 days" });
    await expect(radio.getBoundingClientRect().height).toBe(16);
  },
};

/** Long option labels at 320 px wrap next to the circle. */
export const LongLabelsNarrow: Story = {
  render: () => (
    <Narrow>
      <FieldSet>
        <FieldLegend id="n-legend" variant="label">
          Compare with
        </FieldLegend>
        <RadioGroup aria-labelledby="n-legend" defaultValue="previous">
          <Field orientation="horizontal">
            <RadioGroupItem id="n-previous" value="previous" />
            <FieldContent>
              <FieldLabel htmlFor="n-previous">
                The previous period of the same length, ending the day before this one starts
              </FieldLabel>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem id="n-none" value="none" />
            <FieldContent>
              <FieldLabel htmlFor="n-none">No comparison</FieldLabel>
            </FieldContent>
          </Field>
        </RadioGroup>
      </FieldSet>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};
