import * as React from "react";
import { cn } from "cn";

/**
 * Table (design system stage 2, batch 3; B3.4–B3.10 in .ai/design/POSTEP.md). No `"use client"`:
 * a table has no state or events, so it renders on the server with its page (B3.4). Rows are 44 px
 * in the admin and 48 px in the store (`body` text + 12 px block padding, B3.5). Below 768 px a
 * table uses 14/20 text in both scopes (the admin body size) and 8 px inline padding, so every
 * column stays in view at 390 px (lesson 2026-10-19; `admin-mobile` and `storefront-mobile` e2e:
 * at 16 px "My orders" needs 345–366 px of 358). The header sits on `--muted` with `--foreground`
 * 500 text. Digits are tabular on the whole table (B3.6); numeric columns set `text-right` at the
 * call site. Cells wrap long text, headers do not (B3.7). Rows have no hover, selected or expanded
 * styles (B3.8, owner decision): a row is not clickable, the resource name inside it is a
 * `TextLink`. Every table has a name: `TableCaption` (also `sr-only`) or `aria-label` (B3.9). The
 * scroll container stays for wide tables, without `tabIndex` (B3.10).
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom type-body text-foreground tabular-nums max-md:text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-muted font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr data-slot="table-row" className={cn("border-b border-border", className)} {...props} />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-2 py-3 text-left align-middle md:px-3 font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2 py-3 align-middle md:px-3 whitespace-normal wrap-break-word [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-group-item type-small text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
