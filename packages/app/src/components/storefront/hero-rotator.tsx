"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryCount } from "@commerceos/core";
import { cn } from "cn";
import { NO_PHOTO_LABEL, productsHref, resultCountText } from "@/components/catalog/catalog-copy";
import { photoSrc } from "@/components/catalog/product-photo";
import {
  createRotatorController,
  prefersReducedMotion,
  slotOf,
  type RotatorSlot,
} from "./hero-rotator-state";

/**
 * The collection stage on the right of the home hero (storefront refresh, 2026-11-04): three
 * photos at once, the middle one larger and the two beside it smaller. The row moves on by itself;
 * the collection that reaches the middle grows and the ones that leave it shrink. There are no
 * arrows and no dots. The row holds still while the reader hovers or focuses it. Nothing renders
 * without collections. The slots are placed by `.hero-slot-*` in globals.css.
 */
export function HeroRotator({ slides }: { slides: readonly CategoryCount[] }) {
  const [index, setIndex] = useState(0);
  const [controller] = useState(() =>
    createRotatorController(slides.length, setIndex, prefersReducedMotion),
  );
  useEffect(controller.start, [controller, slides.length]);

  if (slides.length === 0) return null;
  const active = Math.min(index, slides.length - 1);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Collections"
      onPointerEnter={controller.pause}
      onPointerLeave={controller.resume}
      onFocus={controller.pause}
      onBlur={controller.resume}
      className="hero-stage"
    >
      {slides.map((collection, position) => {
        const slot = slotOf(position, active, slides.length);
        return <CollectionCard key={collection.slug} collection={collection} slot={slot} />;
      })}
    </section>
  );
}

function CollectionCard({ collection, slot }: { collection: CategoryCount; slot: RotatorSlot }) {
  const src = photoSrc(collection.imageUrl);
  const middle = slot === "center";
  return (
    <Link
      href={productsHref(collection.slug)}
      aria-hidden={middle ? undefined : "true"}
      tabIndex={middle ? undefined : -1}
      className={cn(
        "hero-slot group",
        slot === "center" && "hero-slot-center",
        slot === "left" && "hero-slot-left",
        slot === "right" && "hero-slot-right",
        slot === "hidden" && "hero-slot-hidden",
      )}
    >
      {src ? (
        <Image src={src} alt="" fill unoptimized sizes="240px" className="object-cover" />
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
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4",
          src ? "text-background" : "text-foreground",
        )}
      >
        <span className="text-lg font-semibold">{collection.name}</span>
        <span className="text-sm opacity-80">{resultCountText(collection.productCount)}</span>
      </span>
    </Link>
  );
}
