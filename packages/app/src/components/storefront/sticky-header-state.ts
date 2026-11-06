/**
 * The storefront header's sticky behaviour (owner request, 2026-11-04). No React here: the rule
 * for showing and hiding is unit-tested with fake scroll positions, and `sticky-header.tsx` only
 * connects it to the window.
 *
 * The header stays at the top of the page. Scrolling down hides it, scrolling up brings it back, and
 * it is always shown near the top of the page. Small movements are ignored, so the header does not
 * flicker on a trackpad.
 */

/** Within this many pixels of the top of the page the header is always shown. */
export const REVEAL_AT_TOP_PX = 80;

/** A scroll of less than this many pixels is not a direction (it does not hide or show the header). */
export const SCROLL_TOLERANCE_PX = 6;

/** Whether the header should be shown after a scroll from `previous` to `current`. */
export function nextVisibility(previous: number, current: number, visible: boolean): boolean {
  if (current <= REVEAL_AT_TOP_PX) return true;
  if (current > previous + SCROLL_TOLERANCE_PX) return false;
  if (current < previous - SCROLL_TOLERANCE_PX) return true;
  return visible;
}

export type HeaderController = {
  /** Reads the window's scroll position and publishes the header's visibility. */
  update(): void;
  /** Listens to scrolling; returns the cleanup. */
  subscribe(): () => void;
};

/**
 * The controller of the header. `setVisible` receives the new visibility after each scroll. The
 * position of the last scroll is kept here, not in React state, so scrolling does not re-render.
 */
export function createHeaderController(setVisible: (visible: boolean) => void): HeaderController {
  let lastY = 0;
  let visible = true;

  function update() {
    const current = globalThis.scrollY;
    visible = nextVisibility(lastY, current, visible);
    lastY = current;
    setVisible(visible);
  }

  return {
    update,
    subscribe() {
      globalThis.addEventListener("scroll", update, { passive: true });
      return () => globalThis.removeEventListener("scroll", update);
    },
  };
}

/** The classes of the header in each state: pinned to the top, sliding out of view when hidden. */
export function headerClassName(visible: boolean): string {
  const base =
    "storefront-frame sticky top-0 z-40 border-b bg-frame transition-transform duration-300";
  return visible ? base : `${base} -translate-y-full`;
}
