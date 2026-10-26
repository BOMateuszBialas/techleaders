/**
 * Best sellers by name, from paid orders in the last 30 days (storefront v2 Q11, OA-7). Names
 * only, no numbers and no demo label. With no paid orders in the window the section is omitted.
 */
export function BestSellers({ names }: { names: readonly string[] }) {
  if (names.length === 0) return null;
  return (
    <section aria-labelledby="home-best" className="flex flex-col gap-4">
      <h2 id="home-best" className="text-xl font-semibold tracking-tight">
        Best sellers
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        {names.map((name, index) => (
          <li key={`${index}-${name}`}>{name}</li>
        ))}
      </ol>
    </section>
  );
}
