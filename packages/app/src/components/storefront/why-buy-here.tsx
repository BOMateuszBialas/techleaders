import type { WhyBuyHereItem } from "./storefront-content";
import { StoreIcon } from "./storefront-icons";

/**
 * "Why buy here" (storefront refresh, 2026-11-04): the facts the code checks, each in a translucent
 * panel with a line icon and a number, and the example delivery line with its "Example policy:"
 * label (storefront v2 Q7, OA-5). The copy is the same as before; only the presentation changed.
 */
export function WhyBuyHere({ items }: { items: readonly WhyBuyHereItem[] }) {
  return (
    <section aria-labelledby="home-why" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Why buy here
        </p>
        <h2 id="home-why" className="storefront-section-title-lg">
          Shop with the facts in front of you
        </h2>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={item.title}
            className="flex flex-col gap-4 rounded-xl border border-foreground/10 bg-card/70 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-lg border border-foreground/10 bg-background/80">
                <StoreIcon name={item.icon} />
              </span>
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
