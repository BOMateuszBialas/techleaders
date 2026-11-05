import type { TechnicalSpec } from "@commerceos/core";
import { TECHNICAL_DATA_EMPTY, TECHNICAL_DATA_EXAMPLE_NOTE } from "./product-page-copy";
import { DetailTable } from "./product-detail-table";

/**
 * The technical data tab (storefront v2, Phase 3, Q10): the `label` and `value` rows as a table,
 * labelled as example values. With no rows it shows the neutral line instead. Values are plain
 * text (React escapes them).
 */
export function ProductTechnicalData({ specs }: { specs: TechnicalSpec[] }) {
  if (specs.length === 0) {
    return <p className="max-w-measure text-muted-foreground">{TECHNICAL_DATA_EMPTY}</p>;
  }
  return (
    <div className="flex flex-col gap-related">
      <p className="type-small text-muted-foreground">{TECHNICAL_DATA_EXAMPLE_NOTE}</p>
      <DetailTable caption="Technical data" rows={specs} />
    </div>
  );
}
