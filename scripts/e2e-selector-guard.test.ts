import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard for a recurring e2e failure (lessons 2026-10-16): a generic `form button[type=...]`
 * selector hits whichever form comes first on the page (for example the header search).
 * A selector on a button must be anchored: a `:has(...)` scope, an aria-label, an id, a
 * data-testid, a name or an href. Otherwise the test clicks the wrong control.
 */

const E2E_ROOT = join(process.cwd(), "packages", "app", "e2e");

/** Every e2e test file under the e2e folder, recursively. */
function e2eFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return e2eFiles(path);
    return name.endsWith(".e2e.test.ts") ? [path] : [];
  });
}

/** A selector literal that targets a button by type with no anchor on its own. */
const BUTTON_TYPE = /(["'`])([^"'`\n]*button\[type=["']?(?:submit|button)["']?\][^"'`\n]*)\1/g;

const ANCHORS = [":has(", "[aria-label", "[data-testid", "#", "[name=", "[href"];

/** String constants of the file, so `${SEARCH_FORM} button` is judged by what it expands to. */
function constants(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const pattern = /const\s+([A-Z_]+)\s*=\s*(?:'([^'\n]*)'|`([^`\n]*)`|"([^"\n]*)")/g;
  for (const match of source.matchAll(pattern)) {
    map.set(match[1] ?? "", match[2] ?? match[3] ?? match[4] ?? "");
  }
  return map;
}

export function unanchoredButtonSelectors(source: string): string[] {
  const found: string[] = [];
  const values = constants(source);
  for (const match of source.matchAll(BUTTON_TYPE)) {
    const selector = (match[2] ?? "").replace(/\$\{([A-Z_]+)\}/g, (_, name: string) => {
      return values.get(name) ?? `\${${name}}`;
    });
    if (!ANCHORS.some((anchor) => selector.includes(anchor))) found.push(selector);
  }
  return found;
}

describe("e2e selectors on buttons are anchored", () => {
  it("finds no generic button[type] selector in packages/app/e2e", () => {
    const offenders = e2eFiles(E2E_ROOT).flatMap((file) =>
      unanchoredButtonSelectors(readFileSync(file, "utf8")).map(
        (selector) => `${relative(process.cwd(), file)}: ${selector}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("flags a bare form button selector", () => {
    expect(unanchoredButtonSelectors(`await b.click('main form button[type="submit"]');`)).toEqual([
      'main form button[type="submit"]',
    ]);
  });

  it("accepts a scoped selector", () => {
    expect(
      unanchoredButtonSelectors(`await b.click('main form:has(#x) button[type="submit"]');`),
    ).toEqual([]);
    expect(unanchoredButtonSelectors(`await b.click('[data-testid="sign-out"]');`)).toEqual([]);
  });
});
