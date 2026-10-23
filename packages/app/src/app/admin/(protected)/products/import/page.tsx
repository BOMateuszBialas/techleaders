import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PRODUCTS_PATH } from "@/components/admin/products/product-copy";
import { ProductImportForm } from "@/components/admin/products/product-import-form";
import {
  IMPORT_COLUMN_HELP,
  IMPORT_INTRO,
  IMPORT_RULES_NOTE,
  TEMPLATE_FILE_NAME,
  TEMPLATE_LINK,
  templateHref,
} from "@/components/admin/products/product-import-copy";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/require-admin";
import { submitProductImport } from "@/server/catalog/product-import.action";

export const metadata: Metadata = { title: "Import products" };

export default function ProductImportPage() {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href={PRODUCTS_PATH} className="w-fit text-sm underline underline-offset-4">
        All products
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import products</h1>
        <p className="text-sm text-muted-foreground">{IMPORT_INTRO}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading import…</p>}>
        <ImportSection />
      </Suspense>
      <section aria-labelledby="import-columns-heading" className="flex flex-col gap-2">
        <h2 id="import-columns-heading" className="text-lg font-semibold">
          Columns
        </h2>
        <p className="text-sm text-muted-foreground">{IMPORT_RULES_NOTE}</p>
        <a
          href={templateHref()}
          download={TEMPLATE_FILE_NAME}
          className="w-fit text-sm underline underline-offset-4"
        >
          {TEMPLATE_LINK}
        </a>
        <Table aria-label="Import columns">
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
              <TableHead>Rule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {IMPORT_COLUMN_HELP.map((help) => (
              <TableRow key={help.column}>
                <TableCell className="font-mono">{help.column}</TableCell>
                <TableCell className="whitespace-normal">{help.rule}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

async function ImportSection() {
  await requireAdminPage();
  return <ProductImportForm action={submitProductImport} />;
}
