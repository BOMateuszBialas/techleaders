/**
 * The featured-products carousel's rules (storefront refresh, 2026-11-04). No React here: the
 * pages, the arrows, the dots and the mouse drag are unit-tested with fake events, and the client
 * wrapper (`featured-carousel.tsx`) only connects them to the DOM.
 *
 * The track is a native scroll container, so touch and trackpad scrolling keep
 * working and the scrollbar is hidden. The track is read in pages: one page is one visible width
 * of the track. The dots show the pages, the arrows move one page, and the first and last pages
 * are the very start and very end of the track. Nothing is shown when the track does not overflow.
 * A mouse drag scrolls the track directly; a drag that moved is not followed by a click on a card.
 * No ref is used: every event carries its element, and a control finds the track by its id.
 */

/** The part of the track the carousel reads and moves. */
export type CarouselTrack = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  /** The cards of the track; each reports its position in the track. */
  children: ArrayLike<unknown>;
  scrollTo(options: { left: number; behavior: ScrollBehavior }): void;
};

/** The part of the document a control looks the track up in (a real `Document` satisfies it). */
export type CarouselDocument = { getElementById(id: string): CarouselTrack | null };

/** What the controls show: how many pages the track has, and the page the reader is on. */
export type CarouselView = { pages: number; active: number };

/** Before the browser has measured the track there is one page and no controls. */
export const INITIAL_CAROUSEL_VIEW: CarouselView = { pages: 1, active: 0 };

/** A pointer event on the track. Only a mouse drag scrolls; touch and pen keep native swiping. */
export type CarouselPointerEvent = {
  pointerType: string;
  clientX: number;
  currentTarget: CarouselTrack;
};

/** A click that may end a drag: it is cancelled when the drag moved. */
export type CarouselClickEvent = { preventDefault(): void; stopPropagation(): void };

/** A button's click: its owner document holds the track. */
export type CarouselButtonEvent = { currentTarget: { ownerDocument: CarouselDocument } };

/** A dot's click: `data-index` holds its page, and its owner document holds the track. */
export type CarouselDotEvent = CarouselButtonEvent & {
  currentTarget: { getAttribute(name: string): string | null };
};

/** Pixels a mouse must move before a press counts as a drag (not a click). */
export const DRAG_THRESHOLD_PX = 5;

/** How far the track can scroll. */
export function maxScroll(track: Pick<CarouselTrack, "scrollWidth" | "clientWidth">): number {
  return Math.max(0, track.scrollWidth - track.clientWidth);
}

/**
 * Where each card starts, in pixels from the first card (a child that reports no numeric position
 * is skipped). The positions come from the cards themselves, so the gap between them is counted.
 */
export function cardStarts(track: Pick<CarouselTrack, "children">): number[] {
  const offsets: number[] = [];
  for (let index = 0; index < track.children.length; index++) {
    const card = track.children[index];
    if (typeof card === "object" && card !== null && "offsetLeft" in card) {
      if (typeof card.offsetLeft === "number") offsets.push(card.offsetLeft);
    }
  }
  const first = offsets.slice(0, 1).reduce((_, offset) => offset, 0);
  return offsets.map((offset) => offset - first);
}

/** How many whole cards fit in the visible width (at least one). */
export function visibleCards(track: Pick<CarouselTrack, "children" | "clientWidth">): number {
  const pitch = cardStarts(track)
    .slice(1, 2)
    .reduce((_, start) => start, 0);
  if (pitch <= 0) return track.children.length;
  return Math.max(1, Math.floor(track.clientWidth / pitch));
}

/**
 * How many positions the track can show, one per card shift: the first card, then each card in
 * turn, until the last card is shown at the end. A track whose cards all fit has one position.
 */
export function pageCount(
  track: Pick<CarouselTrack, "children" | "scrollWidth" | "clientWidth">,
): number {
  const cards = track.children.length;
  if (maxScroll(track) === 0 || cards <= visibleCards(track)) return 1;
  return cards - visibleCards(track) + 1;
}

/** The scroll position of position `index`; the last position is the very end of the track. */
export function pageTarget(
  index: number,
  track: Pick<CarouselTrack, "children" | "scrollWidth" | "clientWidth">,
): number {
  if (index >= pageCount(track) - 1) return maxScroll(track);
  return Math.min(...cardStarts(track).slice(index, index + 1), maxScroll(track));
}

/** The position the reader is on: the one nearest to the scroll position. */
export function activePage(
  track: Pick<CarouselTrack, "children" | "scrollLeft" | "scrollWidth" | "clientWidth">,
): number {
  const pages = pageCount(track);
  let nearest = 0;
  let distance = Infinity;
  for (let index = 0; index < pages; index++) {
    const gap = Math.abs(pageTarget(index, track) - track.scrollLeft);
    if (gap < distance) {
      nearest = index;
      distance = gap;
    }
  }
  return nearest;
}

/** What the controls show for a track right now. */
export function viewOf(track: CarouselTrack): CarouselView {
  return { pages: pageCount(track), active: activePage(track) };
}

export type CarouselController = {
  /** Reads the track's pages and the reader's page again (on mount, a new list, a resize). */
  measure(): void;
  /** Keeps `measure` running on window resizes; returns the cleanup. */
  subscribe(): () => void;
  onScroll(event: { currentTarget: CarouselTrack }): void;
  goTo(event: CarouselDotEvent): void;
  prev(event: CarouselButtonEvent): void;
  next(event: CarouselButtonEvent): void;
  onPointerDown(event: CarouselPointerEvent): void;
  onPointerMove(event: CarouselPointerEvent): void;
  onPointerEnd(): void;
  onDragStart(event: { preventDefault(): void }): void;
  onClickCapture(event: CarouselClickEvent): void;
};

/**
 * The controller the wrapper hands to the DOM. `trackId` is the track's element id; `setView`
 * receives the pages and the page the reader is on. A control whose track is missing does nothing.
 */
export function createCarouselController(
  trackId: string,
  setView: (view: CarouselView) => void,
): CarouselController {
  /** The drag in progress (mouse only), or null. */
  let drag: { startX: number; startScroll: number; moved: boolean } | null = null;
  /** Set when a drag ended after moving: the click that follows it is cancelled once. */
  let suppressClick = false;

  function endDrag() {
    if (drag?.moved) suppressClick = true;
    drag = null;
  }

  /** The track of a button's event, or null when it is not in the document. */
  function trackOf(event: CarouselButtonEvent): CarouselTrack | null {
    return event.currentTarget.ownerDocument.getElementById(trackId);
  }

  function showPage(track: CarouselTrack, index: number) {
    track.scrollTo({ left: pageTarget(index, track), behavior: "smooth" });
    setView({ pages: pageCount(track), active: index });
  }

  function measure() {
    const track = globalThis.document.getElementById(trackId);
    if (track) setView(viewOf(track));
  }

  return {
    measure,
    subscribe() {
      globalThis.addEventListener("resize", measure);
      return () => globalThis.removeEventListener("resize", measure);
    },
    onScroll(event) {
      setView(viewOf(event.currentTarget));
    },
    goTo(event) {
      const track = trackOf(event);
      if (!track) return;
      showPage(track, Number(event.currentTarget.getAttribute("data-index")));
    },
    prev(event) {
      const track = trackOf(event);
      if (!track) return;
      showPage(track, Math.max(activePage(track) - 1, 0));
    },
    next(event) {
      const track = trackOf(event);
      if (!track) return;
      showPage(track, Math.min(activePage(track) + 1, pageCount(track) - 1));
    },
    onDragStart(event) {
      // A native drag of a link or photo would take the pointer away from the track.
      event.preventDefault();
    },
    onPointerDown(event) {
      if (event.pointerType !== "mouse") return;
      suppressClick = false;
      const track = event.currentTarget;
      drag = { startX: event.clientX, startScroll: track.scrollLeft, moved: false };
    },
    onPointerMove(event) {
      if (!drag) return;
      const distance = event.clientX - drag.startX;
      if (Math.abs(distance) >= DRAG_THRESHOLD_PX) drag.moved = true;
      event.currentTarget.scrollLeft = drag.startScroll - distance;
    },
    onPointerEnd() {
      endDrag();
    },
    onClickCapture(event) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
