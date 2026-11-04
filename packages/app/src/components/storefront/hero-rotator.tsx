"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryCount } from "@commerceos/core";
import { cn } from "cn";
import { NO_PHOTO_LABEL, productsHref, resultCountText } from "@/components/catalog/catalog-copy";
import { photoSrc } from "@/components/catalog/product-photo";
import { createRotatorController, prefersReducedMotion } from "./hero-rotator-state";

/**
 * The collection card on the right of the home hero (storefront refresh, 2026-11-04): one
 * collection at a time, moving to the next one every few seconds, with dots to pick one. It holds
 * still while the reader hovers or focuses it. Nothing renders without collections.
 */
export function HeroRotator({ slides }: { slides: readonly CategoryCount[] }) {
  const [index, setIndex] = useState(0);
  const [controller] = useState(() =>
    createRotatorController(slides.length, setIndex, prefersReducedMotion),
  );
  useEffect(controller.start, [controller, slides.length]);

  const current = Math.min(index, Math.max(slides.length - 1, 0));
  const slide = slides[current];
  if (!slide) return null;
  const src = photoSrc(slide.imageUrl);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Collections"
      onPointerEnter={controller.pause}
      onPointerLeave={controller.resume}
      onFocus={controller.pause}
      onBlur={controller.resume}
      className="flex w-80 flex-col gap-4"
    >
      <Link
        href={productsHref(slide.slug)}
        className="group relative block aspect-4/5 overflow-hidden rounded-2xl border bg-muted shadow-xl"
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="320px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {NO_PHOTO_LABEL}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent"
        />
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5",
            src ? "text-background" : "text-foreground",
          )}
        >
          <span className="text-xl font-semibold">{slide.name}</span>
          <span className="text-sm opacity-80">{resultCountText(slide.productCount)}</span>
        </span>
      </Link>
      {slides.length > 1 ? (
        <div role="group" aria-label="Choose a collection" className="flex justify-center gap-2">
          {slides.map((collection, position) => (
            <button
              key={collection.slug}
              type="button"
              data-index={position}
              aria-label={`Show collection ${position + 1} of ${slides.length}`}
              aria-current={position === current ? "true" : undefined}
              onClick={controller.goTo}
              className={cn(
                "size-2.5 rounded-full bg-background/60 transition-all hover:bg-background",
                position === current && "w-8 bg-background",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
