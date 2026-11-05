import Link from "next/link";
import type { CategoryCount } from "@commerceos/core";
import { buttonVariants } from "@/components/ui/button";
import { HeroRotator } from "./hero-rotator";
import { HOME_HERO, HOME_VIDEO } from "./storefront-content";

/**
 * The home hero (storefront refresh, 2026-11-04): a photo that runs the full width of the screen
 * and fills most of the first view, with the headline, the approved copy and one call to action on
 * a translucent panel in the bottom-left corner. On the right, a collection card moves on by itself
 * (`HeroRotator`); it is hidden on a phone, where the panel takes the width. One h1; the photo is
 * decorative (`alt=""`). The full-bleed trick (`w-screen` centred on the page) breaks out of the
 * storefront's measure, and the height comes from `.storefront-hero` in globals.css.
 */
export function HomeHero({ collections = [] }: { collections?: readonly CategoryCount[] }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="storefront-hero relative left-1/2 -mt-10 w-screen -translate-x-1/2 overflow-hidden bg-muted"
    >
      <video
        src={HOME_VIDEO.src}
        poster={HOME_HERO.photo}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 image-scrim" />
      <div className="relative flex h-full w-full items-center">
        <div className="mx-auto flex w-full max-w-(--storefront-width) items-center justify-between gap-6 px-4 py-8 sm:py-12">
          <div className="flex w-full max-w-xl flex-col gap-4 rounded-2xl border bg-background/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {HOME_HERO.headline}
            </h1>
            <p className="text-muted-foreground">{HOME_HERO.description}</p>
            <Link href={HOME_HERO.href} className={buttonVariants({ className: "w-fit" })}>
              {HOME_HERO.cta}
            </Link>
          </div>
          <div className="hidden md:block">
            <HeroRotator slides={collections} />
          </div>
        </div>
      </div>
    </section>
  );
}
