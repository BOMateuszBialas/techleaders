import { ValidationError } from "../../errors/app-error";

/**
 * CSV reading for the product import (CSV import spec A7, A9, A13, A16). A small RFC 4180
 * reader: `core` may depend only on `zod`, and the import needs its own limits, line numbers
 * and messages around any parser anyway. Every file problem is a `ValidationError` whose
 * message the owner sees as is.
 */

/** The largest file (and posted-back text), in UTF-8 bytes (spec A7). */
export const MAX_IMPORT_FILE_BYTES = 262_144;
/** The most product rows one import may hold (spec A7). */
export const MAX_IMPORT_ROWS = 500;

export const NOT_UTF8_MESSAGE =
  "The file is not UTF-8 text. In Excel use Save as → CSV UTF-8 (comma or semicolon delimited).";
export const NO_ROWS_MESSAGE = "The file has no product rows.";
export const FILE_TOO_LARGE_MESSAGE =
  "The file is larger than 256 KB. Split it into smaller files.";
export const TOO_MANY_ROWS_MESSAGE = `The file has more than ${MAX_IMPORT_ROWS} product rows. Split it into smaller files.`;

/** One record of the file: the line it starts on (header = line 1) and its raw cells. */
export type CsvRecord = { line: number; cells: string[] };
export type ParsedCsv = { header: string[]; records: CsvRecord[] };

/**
 * Decodes an uploaded file as UTF-8. Invalid UTF-8 (for example a Windows-1250 export) is
 * refused rather than replaced with "�", and a leading BOM is dropped by the decoder.
 */
export function decodeCsvFile(bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_IMPORT_FILE_BYTES) throw new ValidationError(FILE_TOO_LARGE_MESSAGE);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ValidationError(NOT_UTF8_MESSAGE);
  }
}

/** Comma or semicolon: whichever appears more often outside quotes on the header line. */
function detectDelimiter(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === "\n") break;
    else if (!quoted && char === ",") commas += 1;
    else if (!quoted && char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

/** A line with no content, or only delimiters (spreadsheets add `;;;` lines): ignored. */
function isBlank(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

/**
 * Splits CSV text into records (spec A9): RFC 4180 quoting (`"` around a field, `""` inside
 * it; quoted fields may hold the delimiter and line breaks), CRLF or LF line ends (normalised
 * to "\n", also inside quoted fields), blank lines ignored. A quote that does not open a field
 * is kept as text. Each record carries the line it starts on (A13).
 */
function readRecords(text: string, delimiter: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let atCellStart = true;
  let line = 1;
  let recordLine = 1;
  let quoteLine = 1;

  const endRecord = () => {
    cells.push(cell);
    if (!isBlank(cells)) records.push({ line: recordLine, cells });
    if (records.length > MAX_IMPORT_ROWS + 1) throw new ValidationError(TOO_MANY_ROWS_MESSAGE);
    cells = [];
    cell = "";
    atCellStart = true;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === "\n") line += 1;
        cell += char;
      }
    } else if (char === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
      quoteLine = line;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
      atCellStart = true;
    } else if (char === "\n") {
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      cell += char;
      atCellStart = false;
    }
  }
  if (quoted) throw new ValidationError(`Line ${quoteLine}: a quoted value is not closed.`);
  endRecord();
  return records;
}

/**
 * Reads CSV text into a header and records (spec A7, A9). Used for the uploaded file after
 * decoding and again for the text the preview posts back, so the size limit is checked here
 * in UTF-8 bytes. A file with a header and no rows is refused.
 */
export function parseCsvText(text: string): ParsedCsv {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new ValidationError(FILE_TOO_LARGE_MESSAGE);
  }
  const normalised = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const [header, ...records] = readRecords(normalised, detectDelimiter(normalised));
  if (!header || records.length === 0) throw new ValidationError(NO_ROWS_MESSAGE);
  return { header: header.cells, records };
}
