import type { ReactElement, ReactNode } from "react";
import type * as ReactModule from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The stepper keeps its quantity in React state. These tests call the component outside a
// renderer: `useState` is replaced by a plain value whose setter applies the updater at once, and
// the buttons' click handlers are then invoked from the element tree they return.
const hooks = vi.hoisted(() => ({
  quantity: 1,
  setQuantity: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    useState: () => [hooks.quantity, hooks.setQuantity],
  };
});

// Imported after the mock so the component sees the replaced hook.
const { QuantityStepper, clampQuantity, startingQuantity } = await import("./quantity-stepper");

type Props = { children?: ReactNode; [key: string]: unknown };

function elements(node: ReactNode): ReactElement<Props>[] {
  if (node === null || node === undefined || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => elements(child));
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}

type ControlProps = { onClick: () => void; disabled: boolean; "aria-label": string };

/** Renders the stepper from `initial` and returns its "−" and "+" buttons, as the view gets them. */
function buttons(initial: number) {
  hooks.quantity = startingQuantity(initial);
  const tree = QuantityStepper({ initial }) as ReactElement<Props>;
  const view = elements(tree).find((element) => element.props.decrease !== undefined);
  if (!view) throw new Error("the stepper view is missing");
  return {
    minus: view.props.decrease as ReactElement<ControlProps>,
    plus: view.props.increase as ReactElement<ControlProps>,
  };
}

function click(button: ReactElement<ControlProps>) {
  button.props.onClick();
}

describe("quantity stepper", () => {
  beforeEach(() => {
    hooks.setQuantity.mockReset();
    hooks.setQuantity.mockImplementation((update: number | ((current: number) => number)) => {
      hooks.quantity = typeof update === "function" ? update(hooks.quantity) : update;
    });
  });

  it("starts from what the server sent, and from 1 when that is not a number", () => {
    expect(startingQuantity(3.7)).toBe(3);
    expect(startingQuantity(100)).toBe(100);
    expect(startingQuantity(Number.NaN)).toBe(1);
    expect(startingQuantity(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("keeps a click inside 1 to 99", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(5)).toBe(5);
    expect(clampQuantity(150)).toBe(99);
  });

  it("steps down and up by one, and stops at 1 and at 99", () => {
    click(buttons(3).minus);
    expect(hooks.quantity).toBe(2);

    click(buttons(98).plus);
    expect(hooks.quantity).toBe(99);

    click(buttons(99).plus);
    expect(hooks.quantity).toBe(99);

    click(buttons(1).minus);
    expect(hooks.quantity).toBe(1);
  });

  it("disables the buttons at the ends of the range", () => {
    expect(buttons(1).minus.props.disabled).toBe(true);
    expect(buttons(1).plus.props.disabled).toBe(false);
    expect(buttons(99).plus.props.disabled).toBe(true);
    expect(buttons(2).minus.props.disabled).toBe(false);
  });

  it("names its buttons for screen readers", () => {
    expect(buttons(2).minus.props["aria-label"]).toBe("Decrease quantity");
    expect(buttons(2).plus.props["aria-label"]).toBe("Increase quantity");
  });
});
