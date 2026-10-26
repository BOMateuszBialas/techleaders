import type { WhyBuyHereItem } from "./storefront-content";

/**
 * "Why buy here": facts the code checks, and the example delivery line with its "Example
 * policy:" label (storefront v2 Q7, OA-5).
 */
export function WhyBuyHere({ items }: { items: readonly WhyBuyHereItem[] }) {
  return (
    <section aria-labelledby="home-why" className="flex flex-col gap-4">
      <h2 id="home-why" className="text-xl font-semibold tracking-tight">
        Why buy here
      </h2>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-2 border-t-2 pt-3">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
