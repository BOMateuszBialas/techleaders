import type { ProductImportOutcome, ProductImportPreview } from "@commerceos/core";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormMessage } from "../form-feedback";
import { productPath } from "./product-copy";
import {
  CHECK_ANOTHER,
  CHECK_BUTTON,
  CHECKING_BUTTON,
  FILE_HINT,
  FILE_LABEL,
  HAS_ERRORS_NOTE,
  IMPORT_ANOTHER,
  importButtonLabel,
  IMPORTING_BUTTON,
  NOTHING_TO_IMPORT_NOTE,
  OUTCOME_LABELS,
  previewSummary,
  PRODUCT_IMPORT_PATH,
  type ProductImportState,
} from "./product-import-copy";

export type ProductImportViewProps = {
  action: (formData: FormData) => void;
  state: ProductImportState;
  pending: boolean;
};

/** The form message, referenced by the file input when it reports a file problem. */
const FILE_ERROR_ID = "product-import-file-error";

const OUTCOME_BADGES: Record<ProductImportOutcome, "secondary" | "outline" | "destructive"> = {
  create: "secondary",
  skip: "outline",
  error: "destructive",
};

/** Whether the preview can be imported as it is: no errors and at least one row to create. */
function isImportable(preview: ProductImportPreview): boolean {
  return preview.counts.error === 0 && preview.counts.create > 0;
}

/**
 * The CSV import in one given state (CSV import spec, UI/UX): no hooks, so a unit test renders
 * every state directly; `ProductImportForm` connects it to `useActionState`.
 *
 * Exactly one submitting form is shown at a time, so the pending label always belongs to the
 * button that was pressed: the upload form, or (for an importable preview) the confirm form,
 * which posts the checked text and its fingerprint back (A6). "Check another file" and "Import
 * another file" are plain GET forms: a full page load that starts over.
 */
export function ProductImportView({ action, state, pending }: ProductImportViewProps) {
  if (state.status === "success" && state.created) {
    return (
      <section className="flex flex-col gap-4">
        <FormMessage state={state} />
        <ul aria-label="Imported products" className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {state.created.map((product) => (
            <li key={product.id}>
              <Link href={productPath(product.id)} className="underline underline-offset-4">
                {product.name}
              </Link>
            </li>
          ))}
        </ul>
        <StartOver label={IMPORT_ANOTHER} />
      </section>
    );
  }

  const { preview } = state;
  const confirm = preview && isImportable(preview) ? preview : null;
  return (
    <section className="flex flex-col gap-4">
      {confirm ? null : (
        <UploadForm
          action={action}
          pending={pending}
          fileError={state.status === "error" && !preview}
        />
      )}
      <div id={FILE_ERROR_ID}>
        <FormMessage state={state} />
      </div>
      {preview ? <PreviewTable preview={preview} fileName={state.fileName} /> : null}
      {preview && preview.counts.error > 0 ? <p className="text-sm">{HAS_ERRORS_NOTE}</p> : null}
      {preview && preview.counts.error === 0 && preview.counts.create === 0 ? (
        <p className="text-sm">{NOTHING_TO_IMPORT_NOTE}</p>
      ) : null}
      {confirm ? (
        <div className="flex flex-wrap items-center gap-3">
          <form action={action}>
            <input type="hidden" name="intent" value="import" />
            <input type="hidden" name="csv" value={state.csv ?? ""} />
            <input type="hidden" name="fileName" value={state.fileName ?? ""} />
            <input type="hidden" name="fingerprint" value={confirm.fingerprint} />
            <Button type="submit" disabled={pending}>
              {pending ? IMPORTING_BUTTON : importButtonLabel(confirm)}
            </Button>
          </form>
          <StartOver label={CHECK_ANOTHER} disabled={pending} />
        </div>
      ) : null}
    </section>
  );
}

function UploadForm({
  action,
  pending,
  fileError,
}: Pick<ProductImportViewProps, "action" | "pending"> & { fileError: boolean }) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="intent" value="preview" />
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-import-file">{FILE_LABEL}</Label>
        <Input
          id="product-import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          aria-invalid={fileError}
          aria-describedby={
            fileError ? `product-import-file-hint ${FILE_ERROR_ID}` : "product-import-file-hint"
          }
        />
        <p id="product-import-file-hint" className="text-sm text-muted-foreground">
          {FILE_HINT}
        </p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? CHECKING_BUTTON : CHECK_BUTTON}
        </Button>
      </div>
    </form>
  );
}

function StartOver({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return (
    <form method="get" action={PRODUCT_IMPORT_PATH}>
      <Button type="submit" variant="outline" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}

/** Every row in file order with its line number and outcome; values are text, never HTML. */
function PreviewTable({
  preview,
  fileName,
}: {
  preview: ProductImportPreview;
  fileName: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {fileName ? `${fileName}: ` : ""}
        {previewSummary(preview)}
      </p>
      <Table aria-label="Import preview">
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">Line</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.map((row) => (
            <TableRow key={row.line}>
              <TableCell className="text-right tabular-nums">{row.line}</TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">{row.name}</TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">{row.sku}</TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">{row.category}</TableCell>
              <TableCell className="text-right tabular-nums">{row.price}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell className="text-right tabular-nums">{row.stock}</TableCell>
              <TableCell className="min-w-48 whitespace-normal">
                <div className="flex flex-col gap-1">
                  <Badge variant={OUTCOME_BADGES[row.outcome]}>{OUTCOME_LABELS[row.outcome]}</Badge>
                  {row.reason ? <span className="text-sm">{row.reason}</span> : null}
                  {row.errors.length > 0 ? (
                    <ul className="list-disc pl-4 text-sm text-destructive">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
