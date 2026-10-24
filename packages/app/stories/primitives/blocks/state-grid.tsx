import type { ReactNode } from "react";

/**
 * Documentation block (prompt rule 5: allowed in the Storybook folder, never exported from the
 * app): a labelled grid for state matrices. Hover, focus and pressed cells use the frozen preview
 * `data-preview-state` bound in `.storybook/preview.css`.
 */
export function StateGrid({
  columns,
  rows,
}: {
  columns: string[];
  rows: { label: string; cells: ReactNode[] }[];
}) {
  return (
    <table className="border-separate border-spacing-x-4 border-spacing-y-3 type-small text-foreground">
      <thead>
        <tr>
          <th scope="col" className="text-left font-medium text-muted-foreground">
            Variant
          </th>
          {columns.map((column) => (
            <th key={column} scope="col" className="text-left font-medium text-muted-foreground">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row" className="pr-4 text-left font-medium">
              {row.label}
            </th>
            {row.cells.map((cell, index) => (
              <td key={columns[index]} className="align-middle">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A fixed-width frame for "long content and narrow screen" stories (320 px, the smallest width). */
export function Narrow({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="narrow-frame"
      className="flex w-80 flex-col gap-group-item border border-dashed border-border p-4"
    >
      {children}
    </div>
  );
}
