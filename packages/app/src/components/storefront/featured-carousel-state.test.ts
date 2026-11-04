import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  activePage,
  cardStarts,
  createCarouselController,
  DRAG_THRESHOLD_PX,
  pageCount,
  pageTarget,
  viewOf,
  visibleCards,
  type CarouselDocument,
  type CarouselTrack,
} from "./featured-carousel-state";

type ScrollTo = (options: { left: number; behavior: ScrollBehavior }) => void;

/** A card of the track, at `offsetLeft` pixels from the track's content start. */
function card(offsetLeft: number) {
  return { offsetLeft };
}

/**
 * A track of 1000 px showing 400 px, with four cards 200 px apart (the last card starts at 600,
 * the scroll end). Two cards fit in the view, so the track has three positions: the first card
 * (0), the second (200) and the very end (600). Scrolled to `scrollLeft`.
 */
function track(
  scrollLeft: number,
  cards: readonly unknown[] = [card(0), card(200), card(400), card(600)],
) {
  return {
    scrollLeft,
    scrollWidth: 1000,
    clientWidth: 400,
    children: cards,
    scrollTo: vi.fn<ScrollTo>(),
  } satisfies CarouselTrack & { scrollTo: Mock<ScrollTo> };
}

/** A button's click event, whose owner document holds the given tracks by id. */
function buttonEvent(tracks: Record<string, CarouselTrack>) {
  const ownerDocument: CarouselDocument = {
    getElementById: (id) => tracks[id] ?? null,
  };
  return { currentTarget: { ownerDocument } };
}

/** A dot's click event, whose owner document holds the given tracks by id. */
function dotEvent(position: string, tracks: Record<string, CarouselTrack>) {
  const base = buttonEvent(tracks);
  return {
    currentTarget: {
      ownerDocument: base.currentTarget.ownerDocument,
      getAttribute: (name: string) => (name === "data-index" ? position : null),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cardStarts", () => {
  it("is the position of each card, counted from the first one", () => {
    expect(cardStarts(track(0))).toEqual([0, 200, 400, 600]);
  });

  it("skips a card that reports no numeric position", () => {
    expect(cardStarts({ children: [card(40), { label: "no position" }, card(240)] })).toEqual([
      0, 200,
    ]);
    expect(cardStarts({ children: [card(40), { offsetLeft: "n/a" }, card(240)] })).toEqual([
      0, 200,
    ]);
  });

  it("is empty for a track with no cards", () => {
    expect(cardStarts({ children: [] })).toEqual([]);
  });
});

describe("visibleCards", () => {
  it("is the number of whole cards in the visible width", () => {
    expect(visibleCards(track(0))).toBe(2);
  });

  it("is at least one card, and all the cards when their positions are unknown", () => {
    expect(visibleCards({ children: [card(0), card(500)], clientWidth: 100 })).toBe(1);
    expect(visibleCards({ children: [{ label: "a" }, { label: "b" }], clientWidth: 400 })).toBe(2);
  });
});

describe("pageCount", () => {
  it("is one position per card shift, from the first card to the last one shown at the end", () => {
    // Four cards, two in view: the positions are card 1, card 2 and the end.
    expect(pageCount(track(0))).toBe(3);
  });

  it("is one position when the cards all fit or the track does not scroll", () => {
    expect(pageCount(track(0, [card(0), card(200)]))).toBe(1);
    expect(pageCount({ ...track(0), scrollWidth: 300 })).toBe(1);
  });
});

describe("pageTarget", () => {
  it("is the scroll position of a card, and the last position is the very end", () => {
    expect(pageTarget(0, track(0))).toBe(0);
    expect(pageTarget(1, track(0))).toBe(200);
    expect(pageTarget(2, track(0))).toBe(600);
  });

  it("is the very end when the card positions are unknown, which leaves one position", () => {
    expect(pageTarget(0, track(0, [{ label: "a" }, { label: "b" }, { label: "c" }]))).toBe(600);
  });
});

describe("activePage", () => {
  it("is the position nearest to the scroll position", () => {
    expect(activePage(track(0))).toBe(0);
    expect(activePage(track(190))).toBe(1);
    expect(activePage(track(600))).toBe(2);
  });

  it("is the first position when the track does not scroll", () => {
    expect(activePage({ ...track(0), scrollWidth: 300 })).toBe(0);
  });
});

describe("viewOf", () => {
  it("is the position count and the active position together", () => {
    expect(viewOf(track(390))).toEqual({ pages: 3, active: 1 });
  });
});

describe("createCarouselController", () => {
  it("publishes the view of the scrolled track", () => {
    const setView = vi.fn();
    const controller = createCarouselController("featured", setView);

    controller.onScroll({ currentTarget: track(600) });

    expect(setView).toHaveBeenCalledWith({ pages: 3, active: 2 });
  });

  it("scrolls to a dot's position smoothly and shows it active", () => {
    const setView = vi.fn();
    const controller = createCarouselController("featured", setView);
    const current = track(0);

    controller.goTo(dotEvent("1", { featured: current }));

    expect(current.scrollTo).toHaveBeenCalledWith({ left: 200, behavior: "smooth" });
    expect(setView).toHaveBeenCalledWith({ pages: 3, active: 1 });
  });

  it("does nothing when the dot's track is not in the document", () => {
    const setView = vi.fn();
    const controller = createCarouselController("featured", setView);
    const other = track(0);

    controller.goTo(dotEvent("1", { other }));

    expect(other.scrollTo).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });

  it("moves one card forward with the next arrow, and stops at the very end", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(0);

    controller.next(buttonEvent({ featured: current }));
    expect(current.scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: "smooth" });

    const atSecond = track(200);
    controller.next(buttonEvent({ featured: atSecond }));
    expect(atSecond.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: "smooth" });

    const atEnd = track(600);
    controller.next(buttonEvent({ featured: atEnd }));
    expect(atEnd.scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: "smooth" });
  });

  it("moves one card back with the previous arrow, and stops at the very start", () => {
    const controller = createCarouselController("featured", vi.fn());
    const atEnd = track(600);

    controller.prev(buttonEvent({ featured: atEnd }));
    expect(atEnd.scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: "smooth" });

    const atStart = track(0);
    controller.prev(buttonEvent({ featured: atStart }));
    expect(atStart.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
  });

  it("does nothing for an arrow whose track is not in the document", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);

    controller.prev(buttonEvent({ other: current }));
    controller.next(buttonEvent({ other: current }));

    expect(current.scrollTo).not.toHaveBeenCalled();
  });

  it("measures the track from the document and shows its view", () => {
    const setView = vi.fn();
    const controller = createCarouselController("featured", setView);
    vi.stubGlobal("document", {
      getElementById: (id: string) => (id === "featured" ? track(0) : null),
    });

    controller.measure();

    expect(setView).toHaveBeenCalledWith({ pages: 3, active: 0 });
  });

  it("does not measure a track that is not in the document", () => {
    const setView = vi.fn();
    const controller = createCarouselController("featured", setView);
    vi.stubGlobal("document", { getElementById: () => null });

    controller.measure();

    expect(setView).not.toHaveBeenCalled();
  });

  it("measures again on a window resize, and stops listening on cleanup", () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("addEventListener", add);
    vi.stubGlobal("removeEventListener", remove);
    const controller = createCarouselController("featured", vi.fn());

    const cleanup = controller.subscribe();
    expect(add).toHaveBeenCalledWith("resize", controller.measure);

    cleanup();
    expect(remove).toHaveBeenCalledWith("resize", controller.measure);
  });

  it("drags the track with the mouse", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);

    controller.onPointerDown({ pointerType: "mouse", clientX: 300, currentTarget: current });
    controller.onPointerMove({ pointerType: "mouse", clientX: 250, currentTarget: current });

    expect(current.scrollLeft).toBe(250);
    controller.onPointerEnd();
  });

  it("ignores touch and pen, which keep their own swiping", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);

    controller.onPointerDown({ pointerType: "touch", clientX: 300, currentTarget: current });
    controller.onPointerMove({ pointerType: "touch", clientX: 100, currentTarget: current });

    expect(current.scrollLeft).toBe(200);
  });

  it("does not move the track on a move without a press", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);

    controller.onPointerMove({ pointerType: "mouse", clientX: 100, currentTarget: current });

    expect(current.scrollLeft).toBe(200);
  });

  it("cancels the click that follows a drag which moved", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);
    controller.onPointerDown({ pointerType: "mouse", clientX: 300, currentTarget: current });
    controller.onPointerMove({
      pointerType: "mouse",
      clientX: 300 - DRAG_THRESHOLD_PX - 1,
      currentTarget: current,
    });
    controller.onPointerEnd();
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    controller.onClickCapture(click);

    expect(click.preventDefault).toHaveBeenCalled();
    expect(click.stopPropagation).toHaveBeenCalled();
  });

  it("lets a plain click through and cancels a drag's click only once", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);

    controller.onPointerDown({ pointerType: "mouse", clientX: 300, currentTarget: current });
    controller.onPointerEnd();
    const plain = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    controller.onClickCapture(plain);
    expect(plain.preventDefault).not.toHaveBeenCalled();

    controller.onPointerDown({ pointerType: "mouse", clientX: 300, currentTarget: current });
    controller.onPointerMove({ pointerType: "mouse", clientX: 100, currentTarget: current });
    controller.onPointerEnd();
    const dragged = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    controller.onClickCapture(dragged);
    controller.onClickCapture(dragged);

    expect(dragged.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("cancels the browser's own drag of a link or photo", () => {
    const controller = createCarouselController("featured", vi.fn());
    const preventDefault = vi.fn();

    controller.onDragStart({ preventDefault });

    expect(preventDefault).toHaveBeenCalled();
  });

  it("does not treat a press that stays still as a drag", () => {
    const controller = createCarouselController("featured", vi.fn());
    const current = track(200);
    controller.onPointerDown({ pointerType: "mouse", clientX: 300, currentTarget: current });
    controller.onPointerMove({
      pointerType: "mouse",
      clientX: 300 + DRAG_THRESHOLD_PX - 1,
      currentTarget: current,
    });
    controller.onPointerEnd();
    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    controller.onClickCapture(click);

    expect(click.preventDefault).not.toHaveBeenCalled();
  });
});
