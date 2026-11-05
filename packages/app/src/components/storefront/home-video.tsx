import Image from "next/image";
import { HOME_HERO } from "./storefront-content";

/**
 * The photo band at the bottom of the home page (storefront refresh, 2026-11-04): the hero's photo
 * across the full width of the screen, 700 px tall, with the picture cropped to fill the band. The
 * video now runs in the hero. The photo is decorative, so its alt text is empty.
 */
export function HomePhotoBand() {
  return (
    <section className="home-photo-band relative left-1/2 -mb-10 w-screen -translate-x-1/2 overflow-hidden bg-muted">
      <Image
        src={HOME_HERO.photo}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-cover object-center"
      />
    </section>
  );
}
