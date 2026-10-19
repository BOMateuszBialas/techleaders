import { describe, expect, it } from "vitest";
import {
  decodeCsvFile,
  FILE_TOO_LARGE_MESSAGE,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  NO_ROWS_MESSAGE,
  NOT_UTF8_MESSAGE,
  parseCsvText,
  TOO_MANY_ROWS_MESSAGE,
} from "./csv";

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected an error");
}

describe("decodeCsvFile", () => {
  it("decodes UTF-8 and drops a leading BOM", () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("name;price\nŁódź;1"),
    ]);
    expect(decodeCsvFile(bytes)).toBe("name;price\nŁódź;1");
  });

  it("refuses bytes that are not UTF-8 instead of replacing them", () => {
    // "ł" in Windows-1250 is 0xB3, not valid UTF-8 on its own.
    expect(messageOf(() => decodeCsvFile(new Uint8Array([0x6e, 0xb3, 0x0a])))).toBe(
      NOT_UTF8_MESSAGE,
    );
  });

  it("refuses a file above the size limit before decoding", () => {
    expect(messageOf(() => decodeCsvFile(new Uint8Array(MAX_IMPORT_FILE_BYTES + 1)))).toBe(
      FILE_TOO_LARGE_MESSAGE,
    );
  });
});

describe("parseCsvText", () => {
  it("reads a comma-separated file with LF line ends", () => {
    expect(parseCsvText("name,price\nMouse,249.90\nPad,19\n")).toEqual({
      header: ["name", "price"],
      records: [
        { line: 2, cells: ["Mouse", "249.90"] },
        { line: 3, cells: ["Pad", "19"] },
      ],
    });
  });

  it("detects a semicolon delimiter, so a decimal comma needs no quotes", () => {
    const parsed = parseCsvText("name;price\r\nMouse;249,90\r\n");
    expect(parsed.records).toEqual([{ line: 2, cells: ["Mouse", "249,90"] }]);
  });

  it("counts delimiters on the header line only, outside quotes", () => {
    const parsed = parseCsvText('"a;b;c",name\nx,y\nz;z;z;z,w');
    expect(parsed.header).toEqual(["a;b;c", "name"]);
    expect(parsed.records[1]).toEqual({ line: 3, cells: ["z;z;z;z", "w"] });
  });

  it("reads quoted fields with delimiters, doubled quotes and line breaks", () => {
    const parsed = parseCsvText(
      'name;description;price\r\n"Mouse; wireless";"Say ""hi""\r\nsecond line";1\r\nPad;x;2',
    );
    expect(parsed.records).toEqual([
      { line: 2, cells: ["Mouse; wireless", 'Say "hi"\nsecond line', "1"] },
      // The quoted line break moved this record to line 4.
      { line: 4, cells: ["Pad", "x", "2"] },
    ]);
  });

  it("keeps a quote that does not open a field, and text after a closing quote", () => {
    const parsed = parseCsvText('name,price\nThe 27" monitor,1\n"A"b,2');
    expect(parsed.records.map((record) => record.cells[0])).toEqual(['The 27" monitor', "Ab"]);
  });

  it("keeps empty quoted fields empty", () => {
    expect(parseCsvText('name,price\n"",1').records[0]?.cells).toEqual(["", "1"]);
  });

  it("drops a BOM from posted-back text and handles old Mac CR line ends", () => {
    const parsed = parseCsvText("﻿name,price\rMouse,1");
    expect(parsed.header).toEqual(["name", "price"]);
    expect(parsed.records).toEqual([{ line: 2, cells: ["Mouse", "1"] }]);
  });

  it("ignores blank lines and lines with only delimiters, keeping line numbers", () => {
    const parsed = parseCsvText("name;price\n\n;;\nMouse;1\n  \n");
    expect(parsed.records).toEqual([{ line: 4, cells: ["Mouse", "1"] }]);
  });

  it("refuses an unclosed quote with the line it opened on", () => {
    expect(messageOf(() => parseCsvText('name,price\nMouse,1\n"Pad,2\n'))).toBe(
      "Line 3: a quoted value is not closed.",
    );
  });

  it("refuses an empty file and a header without rows", () => {
    expect(messageOf(() => parseCsvText(""))).toBe(NO_ROWS_MESSAGE);
    expect(messageOf(() => parseCsvText("name,price\n\n"))).toBe(NO_ROWS_MESSAGE);
  });

  it("refuses more rows than the limit", () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => `P${index},1`);
    expect(messageOf(() => parseCsvText(["name,price", ...rows].join("\n")))).toBe(
      TOO_MANY_ROWS_MESSAGE,
    );
    expect(parseCsvText(["name,price", ...rows.slice(1)].join("\n")).records).toHaveLength(
      MAX_IMPORT_ROWS,
    );
  });

  it("measures the size limit in UTF-8 bytes", () => {
    // 131,073 two-byte characters: under the limit in UTF-16 units, over it in UTF-8 bytes.
    const text = `name,price\n${"ł".repeat(MAX_IMPORT_FILE_BYTES / 2 + 1)},1`;
    expect(messageOf(() => parseCsvText(text))).toBe(FILE_TOO_LARGE_MESSAGE);
  });
});
