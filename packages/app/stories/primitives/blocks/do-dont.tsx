import type { ReactNode } from "react";

/**
 * Documentation block (prompt rule 5): a "do" and a "don't" example side by side, each with one
 * sentence. The examples are real components; only this frame is Storybook-specific.
 */
export function DoDont({
  good,
  goodNote,
  bad,
  badNote,
}: {
  good: ReactNode;
  goodNote: string;
  bad: ReactNode;
  badNote: string;
}) {
  return (
    <div className="grid gap-group-item md:grid-cols-2">
      <figure className="flex flex-col gap-related rounded-card border border-border bg-background p-4">
        <div className="flex min-h-16 flex-wrap items-center gap-related">{good}</div>
        <figcaption className="type-small text-foreground">
          <span className="text-success">Do.</span> {goodNote}
        </figcaption>
      </figure>
      <figure className="flex flex-col gap-related rounded-card border border-border bg-background p-4">
        <div className="flex min-h-16 flex-wrap items-center gap-related">{bad}</div>
        <figcaption className="type-small text-foreground">
          <span className="text-destructive">Don’t.</span> {badNote}
        </figcaption>
      </figure>
    </div>
  );
}
