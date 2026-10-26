import type { TechnicalSpec } from "@commerceos/core";
import { TECHNICAL_DATA_EMPTY, TECHNICAL_DATA_EXAMPLE_NOTE } from "./product-page-copy";

/**
 * The technical data tab (storefront v2, Phase 3, Q10): a description list of `label` and `value`
 * rows, labelled as example values. With no rows it shows the neutral line instead. Values are
 * plain text (React escapes them).
 */
export function ProductTechnicalData({ specs }: { specs: TechnicalSpec[] }) {
  if (specs.length === 0) {
    return <p className="max-w-measure text-muted-foreground">{TECHNICAL_DATA_EMPTY}</p>;
  }
  return (
    <div className="flex flex-col gap-related">
      <p className="type-small text-muted-foreground">{TECHNICAL_DATA_EXAMPLE_NOTE}</p>
      <dl className="flex flex-col">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="grid gap-1 border-b border-border py-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-muted-foreground">{spec.label}</dt>
            <dd className="break-words">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
