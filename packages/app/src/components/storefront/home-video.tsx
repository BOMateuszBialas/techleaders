import { HOME_VIDEO } from "./storefront-content";

/**
 * A gaming video across the full width of the screen (owner request, 2026-11-04), in place of the
 * best sellers on the home page. It plays muted and loops, and it is decorative: the label names
 * what it shows for readers of assistive technology. Before the file is in place the poster photo
 * stays on the screen.
 */
export function HomeVideo() {
  return (
    <section
      aria-label={HOME_VIDEO.label}
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-foreground"
    >
      <video
        src={HOME_VIDEO.src}
        poster={HOME_VIDEO.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={HOME_VIDEO.label}
        className="home-video w-full object-cover"
      />
    </section>
  );
}
