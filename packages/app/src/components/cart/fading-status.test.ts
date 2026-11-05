import type * as ReactModule from "react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The status keeps the token it has finished with in React state, and an effect starts the timer.
// These tests call the component outside a renderer: `useState` returns the stored value, and the
// effect is captured so the test can run it and advance the timers.
const hooks = vi.hoisted(() => ({
  hiddenFor: undefined as unknown,
  setHiddenFor: vi.fn(),
  effect: undefined as undefined | (() => (() => void) | void),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    useState: () => [hooks.hiddenFor, hooks.setHiddenFor],
    useEffect: (effect: () => (() => void) | void) => {
      hooks.effect = effect;
    },
  };
});

// Imported after the mock so the component sees the replaced hooks.
const { FadingStatus, STATUS_VISIBLE_MS } = await import("./fading-status");

describe("FadingStatus", () => {
  beforeEach(() => {
    hooks.hiddenFor = undefined;
    hooks.setHiddenFor.mockReset();
    hooks.effect = undefined;
    vi.useFakeTimers();
  });

  it("shows the message as a green line with a status role, with no box", () => {
    const token = { status: "success" };
    const tree = FadingStatus({ message: "Added to cart.", token }) as ReactElement<{
      role: string;
      className: string;
      children: unknown[];
    }>;
    expect(tree.props.role).toBe("status");
    expect(tree.props.className).toContain("text-success");
    expect(tree.props.className).not.toContain("border");
    expect(tree.props.className).not.toContain("bg-");
    expect(tree.props.children).toContain("Added to cart.");
  });

  it("hides after three seconds, for the token it was shown with", () => {
    const token = { status: "success" };
    FadingStatus({ message: "Added to cart.", token });
    const cleanup = hooks.effect?.();
    vi.advanceTimersByTime(STATUS_VISIBLE_MS - 1);
    expect(hooks.setHiddenFor).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hooks.setHiddenFor).toHaveBeenCalledWith(token);
    if (typeof cleanup === "function") cleanup();
  });

  it("renders nothing once its token has finished, and shows a new token again", () => {
    const token = { status: "success" };
    hooks.hiddenFor = token;
    expect(FadingStatus({ message: "Added to cart.", token })).toBeNull();
    expect(
      FadingStatus({ message: "Added to cart.", token: { status: "success" } }),
    ).not.toBeNull();
  });

  it("stops the timer when the token changes before it fires", () => {
    FadingStatus({ message: "Cart updated.", token: {} });
    const cleanup = hooks.effect?.();
    if (typeof cleanup === "function") cleanup();
    vi.advanceTimersByTime(STATUS_VISIBLE_MS);
    expect(hooks.setHiddenFor).not.toHaveBeenCalled();
  });
});
