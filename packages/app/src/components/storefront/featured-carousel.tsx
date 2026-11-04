"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  createCarouselController,
  INITIAL_CAROUSEL_VIEW,
  type CarouselController,
  type CarouselView,
} from "./featured-carousel-state";

export type FeaturedCarouselProps = {
  /** The accessible name of the list, also the hook the e2e tests read. */
  label: string;
  /** How many products the track holds. A new count is measured again. */
  count: number;
  /** The slides: one `li` per product, rendered on the server. */
  children: ReactNode;
};

/**
 * The featured-products slider (storefront refresh, 2026-11-04): a native scroll track and a mouse drag. Arrows and dots show only when the track overflows: one dot per page of
 * the track, and the arrows move one page, stopping at the very start and end. The controls appear
 * after the browser has measured the track; the server renders the track alone. This component
 * only holds the state and the effects; the view is `FeaturedCarouselView`.
 */
export function FeaturedCarousel({ label, count, children }: FeaturedCarouselProps) {
  const trackId = useId();
  const [view, setView] = useState<CarouselView>(INITIAL_CAROUSEL_VIEW);
  const [controller] = useState(() => createCarouselController(trackId, setView));

  useEffect(controller.measure, [controller, count]);
  useEffect(controller.subscribe, [controller]);

  return (
    <FeaturedCarouselView trackId={trackId} label={label} view={view} controller={controller}>
      {children}
    </FeaturedCarouselView>
  );
}

/**
 * The carousel as markup, with no state of its own: the controls for `view`, the track wired to
 * `controller`, and the slides. Unit tests render it for any view.
 */
export function FeaturedCarouselView({
  trackId,
  label,
  view,
  controller,
  children,
}: {
  trackId: string;
  label: string;
  view: CarouselView;
  controller: CarouselController;
  children?: ReactNode;
}) {
  const controls = view.pages > 1;
  return (
    <div className="flex flex-col gap-4">
      {controls ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous products"
            disabled={view.active === 0}
            onClick={controller.prev}
          >
            <ChevronIcon direction="prev" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next products"
            disabled={view.active === view.pages - 1}
            onClick={controller.next}
          >
            <ChevronIcon direction="next" />
          </Button>
        </div>
      ) : null}
      <ul
        id={trackId}
        aria-label={label}
        onScroll={controller.onScroll}
        onPointerDown={controller.onPointerDown}
        onPointerMove={controller.onPointerMove}
        onPointerUp={controller.onPointerEnd}
        onPointerLeave={controller.onPointerEnd}
        onPointerCancel={controller.onPointerEnd}
        onDragStart={controller.onDragStart}
        onClickCapture={controller.onClickCapture}
        className="featured-track flex cursor-grab gap-6 overflow-x-auto pb-2 select-none active:cursor-grabbing"
      >
        {children}
      </ul>
      {controls ? (
        <div role="group" aria-label="Choose a page" className="flex justify-center gap-2">
          {Array.from({ length: view.pages }, (_, index) => (
            <button
              key={index}
              type="button"
              data-index={index}
              aria-label={`Show page ${index + 1} of ${view.pages}`}
              aria-current={index === view.active ? "true" : undefined}
              onClick={controller.goTo}
              className={cn(
                "size-2.5 rounded-full bg-muted-foreground/30 transition-all hover:bg-muted-foreground/60",
                index === view.active && "w-8 bg-foreground",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "next" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
    </svg>
  );
}
