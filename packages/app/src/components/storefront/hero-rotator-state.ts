/**
 * The hero's collection rotator (storefront refresh, 2026-11-04). No React here: the step, the
 * timer, the pause and the dots are unit-tested, and `hero-rotator.tsx` only connects them.
 *
 * The rotator moves to the next collection every `ROTATE_INTERVAL_MS`. It stops while the reader
 * hovers or focuses it, does not run for a single collection, and does not run for readers who ask
 * for reduced motion.
 */

/** How long one collection stays on screen before the next one (milliseconds). */
export const ROTATE_INTERVAL_MS = 5000;

/** The collection after `current`, wrapping to the first one after the last. */
export function nextSlide(current: number, count: number): number {
  return count > 0 ? (current + 1) % count : 0;
}

export type RotatorController = {
  /** Starts the timer; returns the cleanup that stops it. Runs nothing for one slide or reduced motion. */
  start(): () => void;
  /** A dot's click: its `data-index` is the collection to show. */
  goTo(event: { currentTarget: { getAttribute(name: string): string | null } }): void;
  pause(): void;
  resume(): void;
};

/**
 * The controller the rotator hands to the DOM. `setIndex` takes an update so the timer always moves
 * from the collection on screen. `reducedMotion` says whether the reader asked for less motion.
 */
export function createRotatorController(
  count: number,
  setIndex: (update: (current: number) => number) => void,
  reducedMotion: () => boolean,
): RotatorController {
  let paused = false;

  return {
    start() {
      if (count < 2 || reducedMotion()) return () => {};
      const timer = globalThis.setInterval(() => {
        if (!paused) setIndex((current) => nextSlide(current, count));
      }, ROTATE_INTERVAL_MS);
      return () => globalThis.clearInterval(timer);
    },
    goTo(event) {
      setIndex(() => Number(event.currentTarget.getAttribute("data-index")));
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
  };
}

/** Whether the reader asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Where a collection sits in the stage: in the middle, beside it on either side, or out of view. */
export type RotatorSlot = "center" | "left" | "right" | "hidden";

/**
 * The slot of collection `index` when `active` is in the middle. The stage wraps around, so the
 * collection after the last one sits on the right and the one before the first on the left.
 */
export function slotOf(index: number, active: number, count: number): RotatorSlot {
  if (count < 1) return "hidden";
  const distance = (((index - active) % count) + count) % count;
  if (distance === 0) return "center";
  if (distance === 1) return "right";
  if (distance === count - 1) return "left";
  return "hidden";
}
