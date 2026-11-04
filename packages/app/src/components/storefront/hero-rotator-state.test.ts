import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRotatorController,
  nextSlide,
  prefersReducedMotion,
  ROTATE_INTERVAL_MS,
} from "./hero-rotator-state";

/** The update functions the controller sent to `setIndex`, applied to `from`. */
function applied(setIndex: ReturnType<typeof vi.fn>, from: number): number[] {
  return setIndex.mock.calls.map(([update]) => (update as (current: number) => number)(from));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("nextSlide", () => {
  it("moves to the next collection and wraps to the first after the last", () => {
    expect(nextSlide(0, 3)).toBe(1);
    expect(nextSlide(2, 3)).toBe(0);
  });

  it("stays on the first collection when there are none", () => {
    expect(nextSlide(0, 0)).toBe(0);
  });
});

describe("createRotatorController", () => {
  it("moves to the next collection every interval", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(3, setIndex, () => false);

    const stop = controller.start();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS);

    expect(applied(setIndex, 0)).toEqual([1]);
    stop();
  });

  it("stops moving when the cleanup runs", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(3, setIndex, () => false);

    const stop = controller.start();
    stop();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS * 3);

    expect(setIndex).not.toHaveBeenCalled();
  });

  it("holds the collection while the reader hovers or focuses it, and resumes after", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(3, setIndex, () => false);

    const stop = controller.start();
    controller.pause();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS);
    expect(setIndex).not.toHaveBeenCalled();

    controller.resume();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS);
    expect(applied(setIndex, 0)).toEqual([1]);
    stop();
  });

  it("runs nothing for a single collection", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(1, setIndex, () => false);

    const stop = controller.start();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS * 2);
    stop();

    expect(setIndex).not.toHaveBeenCalled();
  });

  it("runs nothing for a reader who asked for reduced motion", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(3, setIndex, () => true);

    const stop = controller.start();
    vi.advanceTimersByTime(ROTATE_INTERVAL_MS * 2);
    stop();

    expect(setIndex).not.toHaveBeenCalled();
  });

  it("shows the collection of a dot that was clicked", () => {
    const setIndex = vi.fn();
    const controller = createRotatorController(3, setIndex, () => false);

    controller.goTo({
      currentTarget: { getAttribute: (name) => (name === "data-index" ? "2" : null) },
    });

    expect(applied(setIndex, 0)).toEqual([2]);
  });
});

describe("prefersReducedMotion", () => {
  it("reads the system setting for reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));

    expect(prefersReducedMotion()).toBe(true);
  });
});
