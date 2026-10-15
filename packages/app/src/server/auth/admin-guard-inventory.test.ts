import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Enforces the spec rule "every admin entry point checks the session on the server".
 * Later stories cannot forget the guard: adding an unguarded admin page, admin API
 * route or admin server action fails this test.
 *
 * - every `route.ts` under `src/app/api/admin/`                → must use `adminApiHandler(`
 * - every `page.tsx` under `src/app/admin/(protected)/`        → must call `requireAdminPage(`
 * - every `*.action.ts` under `src/app/admin/`                 → must call `requireAdmin(`
 *
 * Sign-in and sign-out are the documented exceptions; they live in `src/server/auth/`.
 */
const appDir = fileURLToPath(new URL("../../app/", import.meta.url));

type Rule = { name: string; matches: (path: string) => boolean; guard: string };

const RULES: Rule[] = [
  {
    name: "admin API routes",
    matches: (path) => path.startsWith(`api/admin/`) && path.endsWith("/route.ts"),
    guard: "adminApiHandler(",
  },
  {
    name: "protected admin pages",
    matches: (path) => path.startsWith("admin/(protected)/") && path.endsWith("/page.tsx"),
    guard: "requireAdminPage(",
  },
  {
    name: "admin server actions",
    matches: (path) => path.startsWith("admin/") && path.endsWith(".action.ts"),
    guard: "requireAdmin(",
  },
];

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/** Pure check: returns the files that skip their guard. */
function findUnguarded(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([path, source]) =>
    RULES.filter((rule) => rule.matches(path) && !source.includes(rule.guard)).map(
      (rule) => `${path} (${rule.name} must call ${rule.guard.slice(0, -1)})`,
    ),
  );
}

describe("admin guard inventory", () => {
  it("finds no admin entry point without its server-side guard", () => {
    const files = Object.fromEntries(
      listFiles(appDir).map((file) => [
        relative(appDir, file).split(sep).join("/"),
        readFileSync(file, "utf8"),
      ]),
    );
    expect(findUnguarded(files)).toEqual([]);
  });

  it("flags each kind of unguarded entry point", () => {
    expect(
      findUnguarded({
        "api/admin/orders/route.ts": "export const GET = apiHandler(...)",
        "admin/(protected)/orders/page.tsx": "export default function Page() {}",
        "admin/(protected)/orders/save-order.action.ts": '"use server";',
        "admin/(protected)/ok/page.tsx": "await requireAdminPage();",
        "api/health/route.ts": "public by contract",
      }),
    ).toEqual([
      "api/admin/orders/route.ts (admin API routes must call adminApiHandler)",
      "admin/(protected)/orders/page.tsx (protected admin pages must call requireAdminPage)",
      "admin/(protected)/orders/save-order.action.ts (admin server actions must call requireAdmin)",
    ]);
  });
});
