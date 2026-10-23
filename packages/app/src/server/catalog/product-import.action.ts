"use server";

import {
  decodeCsvFile,
  FILE_TOO_LARGE_MESSAGE,
  hasAppErrorCode,
  MAX_IMPORT_FILE_BYTES,
  ValidationError,
  type ProductImportPreview,
} from "@commerceos/core";
import {
  CHOOSE_FILE_MESSAGE,
  IMPORT_CHANGED_MESSAGE,
  importedMessage,
  previewSummary,
  type ProductImportState,
} from "@/components/admin/products/product-import-copy";
import { readFormValue } from "./form-data";
import { runAdminAction } from "./run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

/** The log id of an import: there is no single record, so counts go into `details`. */
const IMPORT_LOG_ID = "product-import";
const MAX_FILE_NAME_LENGTH = 200;

/** The uploaded file as text; only read after the session check, inside the handler. */
async function readUploadedCsv(formData: FormData): Promise<{ name: string; text: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.name === "") throw new ValidationError(CHOOSE_FILE_MESSAGE);
  // Checked before reading, so an oversized upload is never buffered.
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new ValidationError(FILE_TOO_LARGE_MESSAGE);
  const text = decodeCsvFile(new Uint8Array(await file.arrayBuffer()));
  return { name: file.name.slice(0, MAX_FILE_NAME_LENGTH), text };
}

function countsOf(preview: ProductImportPreview): Record<string, number> {
  return { ...preview.counts, rows: preview.rows.length };
}

/**
 * The CSV product import (CSV import spec A6), one action with two intents:
 * - `preview` (the default): checks the uploaded `file` and returns the preview, writing
 *   nothing;
 * - `import`: re-checks the posted-back `csv` and imports it only when its `fingerprint` still
 *   matches; otherwise returns the new preview as an error, writing nothing.
 * Only counts are logged, never cell content.
 */
export async function submitProductImport(
  _previous: ProductImportState,
  formData: FormData,
): Promise<ProductImportState> {
  const intent = readFormValue(formData, "intent");
  let payload: Partial<ProductImportState> = {};
  let refused = false;

  const state = await runAdminAction(
    "catalog.product.import",
    {},
    async ({ previewProductImportUseCase, importProductsUseCase }) => {
      if (intent === "import") {
        const csv = readFormValue(formData, "csv");
        const fileName = readFormValue(formData, "fileName").slice(0, MAX_FILE_NAME_LENGTH);
        const result = await importProductsUseCase
          .execute({ csv, fingerprint: readFormValue(formData, "fingerprint") })
          .catch(async (error: unknown) => {
            // A write conflict rolled everything back: check the same text again, so the
            // owner sees the current preview with the conflict message (spec, API Contracts).
            if (hasAppErrorCode(error, "CONFLICT")) {
              const fresh = await previewProductImportUseCase.execute({ csv }).catch(() => null);
              // If even the re-check fails, the conflict message alone still tells the owner
              // to check the file again; the original error is what gets reported.
              if (fresh) payload = { preview: fresh, csv, fileName };
            }
            throw error;
          });
        if (result.kind === "changed") {
          refused = true;
          payload = { preview: result.preview, csv, fileName };
          return {
            event: "catalog.product.import.refused",
            id: IMPORT_LOG_ID,
            details: countsOf(result.preview),
            unchanged: true,
            message: IMPORT_CHANGED_MESSAGE,
          };
        }
        payload = { created: result.created };
        return {
          event: "catalog.product.imported",
          id: IMPORT_LOG_ID,
          details: { created: result.created.length, skipped: result.preview.counts.skip },
          message: importedMessage(result.created, result.preview.counts.skip),
        };
      }

      const file = await readUploadedCsv(formData);
      const preview = await previewProductImportUseCase.execute({ csv: file.text });
      payload = { preview, csv: file.text, fileName: file.name };
      return {
        event: "catalog.product.import.previewed",
        id: IMPORT_LOG_ID,
        details: countsOf(preview),
        unchanged: true,
        message: previewSummary(preview),
      };
    },
  );
  return { ...state, ...payload, ...(refused ? { status: "error" } : {}) };
}
