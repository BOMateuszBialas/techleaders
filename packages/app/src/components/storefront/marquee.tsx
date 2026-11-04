/**
 * A strip of short phrases that moves across the screen, full width (storefront refresh,
 * 2026-11-04). The phrases are written twice so the loop has no gap: the copy of the second set is
 * hidden from assistive technology. The movement is a CSS animation (`.storefront-marquee` in
 * globals.css) that stops for readers who ask for reduced motion.
 */
export function Marquee({ items }: { items: readonly string[] }) {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-foreground text-background">
      <div className="storefront-marquee flex w-max">
        <MarqueeSet items={items} />
        <MarqueeSet items={items} repeat />
      </div>
    </div>
  );
}

function MarqueeSet({ items, repeat = false }: { items: readonly string[]; repeat?: boolean }) {
  return (
    <div
      aria-hidden={repeat ? "true" : undefined}
      className="flex shrink-0 items-center gap-8 py-3 pr-8 font-mono text-sm tracking-widest whitespace-nowrap uppercase"
    >
      {items.map((item, index) => (
        <span key={`${index}-${item}`} className="flex items-center gap-8">
          <span>{item}</span>
          <span aria-hidden="true">•</span>
        </span>
      ))}
    </div>
  );
}
