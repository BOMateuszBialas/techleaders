import { CATALOG_UNAVAILABLE_MESSAGE } from "@/components/catalog/catalog-copy";

/**
 * One home section whose data could not be loaded. The rest of the page still renders; the
 * cause is logged by the loader, never shown (storefront v2 edge cases).
 */
export function HomeSectionUnavailable({ id, title }: { id: string; title: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p role="alert" className="text-sm text-destructive">
        {CATALOG_UNAVAILABLE_MESSAGE}
      </p>
    </section>
  );
}
