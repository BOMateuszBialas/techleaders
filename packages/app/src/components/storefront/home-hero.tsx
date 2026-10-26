import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HOME_HERO } from "./storefront-content";

/**
 * The home hero (storefront v2 Phase 4): one h1, the approved copy, one call to action and a
 * decorative photo (`alt=""`). Static content only, so it needs no data.
 */
export function HomeHero() {
  return (
    <section aria-labelledby="hero-heading" className="grid items-center gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {HOME_HERO.headline}
        </h1>
        <p className="max-w-prose text-muted-foreground">{HOME_HERO.description}</p>
        <Link href={HOME_HERO.href} className={buttonVariants({ className: "w-fit" })}>
          {HOME_HERO.cta}
        </Link>
      </div>
      <Image
        src={HOME_HERO.photo}
        alt=""
        width={1600}
        height={1067}
        unoptimized
        className="h-auto w-full rounded-xl border"
      />
    </section>
  );
}
