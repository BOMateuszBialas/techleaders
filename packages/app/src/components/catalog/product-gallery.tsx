"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./product-image";
import {
  nextThumbnailIndex,
  showsThumbnails,
  stepThumbnail,
  thumbnailLabel,
} from "./product-gallery-state";

const THUMBNAIL_CLASS =
  "w-20 shrink-0 snap-start sm:w-28 cursor-pointer overflow-hidden rounded-control border border-border bg-muted transition duration-(--duration-base) hover:-translate-y-0.5 hover:border-action hover:shadow-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-pressed:border-foreground aria-pressed:ring-2 aria-pressed:ring-action/40";

/**
 * The product photo with a thumbnail slider from two images (storefront v2, Phase 3). The
 * thumbnails sit in one row that scrolls sideways, with arrows at both ends, so a sixth photo never
 * drops below the row. A click on a thumbnail, or an arrow, shows that photo in the large frame.
 * Thumbnails are buttons (Tab and Enter work), labelled "Show image n of m", with `aria-pressed` on
 * the active one; the arrow, Home and End keys move between them. A product without a photo shows
 * the "No photo yet" placeholder.
 */
export function ProductGallery({ imageUrls, name }: { imageUrls: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const count = imageUrls.length;
  const current = imageUrls[active] ?? null;

  /** Shows the photo at `index` and brings its thumbnail into the slider's view. */
  function select(index: number) {
    setActive(index);
    thumbnails.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onThumbnailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextThumbnailIndex(active, count, event.key);
    if (next === null) return;
    event.preventDefault();
    select(next);
    thumbnails.current[next]?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-related">
      <ProductImage imageUrl={current} name={name} size={480} />
      {showsThumbnails(count) ? (
        <div className="flex items-center gap-related">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous image"
            onClick={() => select(stepThumbnail(active, count, -1))}
          >
            <IconChevronLeft aria-hidden="true" />
          </Button>
          <div
            role="group"
            aria-label="Product images"
            onKeyDown={onThumbnailKeyDown}
            className="featured-track flex min-w-0 flex-1 snap-x gap-related overflow-x-auto scroll-smooth py-1"
          >
            {imageUrls.map((url, index) => (
              <button
                key={index}
                ref={(element) => {
                  thumbnails.current[index] = element;
                }}
                type="button"
                aria-label={thumbnailLabel(index, count)}
                aria-pressed={index === active}
                onClick={() => select(index)}
                className={cn(THUMBNAIL_CLASS, index === active && "text-foreground")}
              >
                <ProductImage
                  imageUrl={url}
                  name={name}
                  size={224}
                  className="rounded-none border-0"
                />
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next image"
            onClick={() => select(stepThumbnail(active, count, 1))}
          >
            <IconChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
