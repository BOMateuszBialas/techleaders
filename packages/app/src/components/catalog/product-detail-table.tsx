import type { ReactNode } from "react";

export type DetailRow = { label: string; value: ReactNode };

/**
 * A two-column table of details on a product page (storefront visual polish, 2026-11-05): the
 * label in the first column, the value in the second. Used for the technical data and for the
 * delivery and returns rules. The caption is read by screen readers and not shown.
 */
export function DetailTable({ caption, rows }: { caption: string; rows: readonly DetailRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0 even:bg-muted/40">
              <th
                scope="row"
                className="w-2/5 px-4 py-3 text-left align-top font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              <td className="px-4 py-3 align-top break-words">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
