"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "cn";
import { ProductImage } from "./product-image";
import { nextThumbnailIndex, showsThumbnails, thumbnailLabel } from "./product-gallery-state";

const THUMBNAIL_CLASS =
  "w-full rounded-control border border-border bg-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-pressed:border-foreground";

/**
 * The product photo with a thumbnail row from two images (storefront v2, Phase 3). Thumbnails are
 * buttons (Tab and Enter work), labelled "Show image n of m", with `aria-pressed` on the active
 * one; the arrow, Home and End keys move between them. A product without a photo shows the
 * "No photo yet" placeholder.
 */
export function ProductGallery({ imageUrls, name }: { imageUrls: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const count = imageUrls.length;
  const current = imageUrls[active] ?? null;

  function onThumbnailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextThumbnailIndex(active, count, event.key);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    thumbnails.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-related">
      <ProductImage imageUrl={current} name={name} size={480} />
      {showsThumbnails(count) ? (
        <div
          role="group"
          aria-label="Product images"
          onKeyDown={onThumbnailKeyDown}
          className="grid grid-cols-4 gap-related"
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
              onClick={() => setActive(index)}
              className={cn(THUMBNAIL_CLASS, index === active && "text-foreground")}
            >
              <ProductImage imageUrl={url} name={name} size={120} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
