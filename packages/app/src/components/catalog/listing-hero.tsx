import Image from "next/image";

/**
 * The banner at the top of the collection page (storefront visual polish, 2026-11-05): the same
 * full-width photo and translucent panel as the home hero, shorter, with the one h1 of the page.
 * The photo is decorative (`alt=""`).
 */
export function ListingHero() {
  return (
    <section
      aria-labelledby="listing-heading"
      className="relative left-1/2 -mt-10 w-screen -translate-x-1/2 overflow-hidden bg-muted"
    >
      <div className="relative h-56 sm:h-72">
        <Image
          src="/photos/hero-desk-curved-monitor.jpg"
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        <div aria-hidden className="absolute inset-0 image-scrim" />
        <div className="relative mx-auto flex h-full w-full max-w-(--storefront-width) items-end px-4 pb-6">
          <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border bg-background/80 p-5 shadow-xl backdrop-blur-md sm:p-6">
            <h1 id="listing-heading" className="text-3xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="text-muted-foreground">
              Mice, keyboards, headsets, controllers and mousepads. The stock is shown on every
              product.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
