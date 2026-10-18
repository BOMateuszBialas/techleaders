import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Enforces the spec rule "every admin entry point checks the session on the server".
 * Later stories cannot forget the guard: adding an unguarded admin page, admin API
 * route or server action fails this test.
 *
 * - every page, layout or default file under `app/admin/`, except the sign-in page,
 *   must call `requireAdminPage(`
 * - every route handler under `app/api/admin/` must use `adminApiHandler(`
 * - every file under `src/` with a `"use server"` directive (each export is a public
 *   endpoint) must call `requireAdmin(` or `runAdminAction(` (which calls `requireAdmin()`
 *   before its handler), except the sign-in/sign-out actions and the listed shopper actions.
 *   Shopper actions are public by design (anonymous carts): each listed file must run its
 *   exports through `runAction(` instead, and a new public file must be added here on purpose,
 *   where review sees it. Whether *every* export of such
 *   a file goes through the guard is checked by that file's unit tests (one per export,
 *   invoked without a session).
 *
 * Comments are stripped first, so a guard that only appears in a comment does not count.
 */
const srcDir = fileURLToPath(new URL("../../", import.meta.url));

const SIGN_IN_ACTIONS = "server/auth/auth.action.ts";
/** Public storefront actions: they change only the caller's own cart cookie (cart spec A12). */
const SHOPPER_ACTIONS = ["server/cart/cart.action.ts", "server/orders/order.action.ts"];
const SOURCE = /\.(ts|tsx|js|jsx|mts|mjs)$/;
const TEST = /\.test\.[a-z]+$/;

type Rule = {
  name: string;
  matches: (path: string, code: string) => boolean;
  /** Any one of these calls counts as the guard. */
  guards: string[];
};

const RULES: Rule[] = [
  {
    name: "admin pages and layouts",
    matches: (path) =>
      /^app\/admin\/.*(page|layout|default)\.(tsx|jsx|ts|js)$/.test(path) &&
      !path.startsWith("app/admin/sign-in/"),
    guards: ["requireAdminPage("],
  },
  {
    name: "admin API routes",
    matches: (path) => /^app\/api\/admin\/.*route\.(ts|js)$/.test(path),
    guards: ["adminApiHandler("],
  },
  {
    name: "server actions",
    matches: (path, code) =>
      /^\s*["']use server["']/m.test(code) &&
      path !== SIGN_IN_ACTIONS &&
      !SHOPPER_ACTIONS.includes(path),
    guards: ["requireAdmin(", "runAdminAction("],
  },
  {
    name: "shopper actions",
    matches: (path) => SHOPPER_ACTIONS.includes(path),
    guards: ["runAction("],
  },
];

/** Removes block and line comments (good enough for a guard-presence check). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Pure check: returns the files that skip their guard. */
function findUnguarded(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([path, source]) => {
    const code = stripComments(source);
    return RULES.filter(
      (rule) => rule.matches(path, code) && !rule.guards.some((guard) => code.includes(guard)),
    ).map(
      (rule) =>
        `${path} (${rule.name} must call ${rule.guards.map((guard) => guard.slice(0, -1)).join(" or ")})`,
    );
  });
}

function listSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSources(full);
    return SOURCE.test(entry.name) && !TEST.test(entry.name) ? [full] : [];
  });
}

describe("admin guard inventory", () => {
  it("finds no admin entry point without its server-side guard", () => {
    const files = Object.fromEntries(
      listSources(srcDir).map((file) => [
        relative(srcDir, file).split(sep).join("/"),
        readFileSync(file, "utf8"),
      ]),
    );
    // Sanity: the scan really sees the guarded entry points that exist today.
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "app/admin/(protected)/page.tsx",
        "app/admin/(protected)/layout.tsx",
        "app/api/admin/me/route.ts",
        "server/catalog/category.action.ts",
        "server/catalog/product.action.ts",
        "server/catalog/stock.action.ts",
        "app/admin/(protected)/orders/page.tsx",
        "app/admin/(protected)/orders/[id]/page.tsx",
        "server/orders/order-status.action.ts",
        "app/admin/(protected)/copilot/page.tsx",
        "app/api/admin/copilot/answers/route.ts",
        "server/copilot/recommendation.action.ts",
        SIGN_IN_ACTIONS,
        ...SHOPPER_ACTIONS,
      ]),
    );
    expect(findUnguarded(files)).toEqual([]);
  });

  it("flags each kind of unguarded entry point, wherever it lives", () => {
    expect(
      findUnguarded({
        "app/api/admin/orders/route.ts": "export const GET = apiHandler(...)",
        "app/admin/orders/page.tsx": "export default function Page() {}",
        "app/admin/(protected)/@modal/default.tsx": "export default function D() {}",
        "app/admin/(protected)/orders/save.ts": '"use server";\nexport async function save() {}',
        "server/catalog/publish.ts": "'use server'\nexport async function publish() {}",
        "app/admin/(protected)/fake/page.tsx": "// await requireAdminPage();\nexport default 1",
        "app/admin/(protected)/ok/page.tsx": "await requireAdminPage();",
        "server/catalog/guarded.action.ts":
          '"use server";\nexport async function a() { return runAdminAction("a", {}, h); }',
        "server/catalog/commented.action.ts":
          '"use server";\n// return runAdminAction("a", {}, h);\nexport async function a() {}',
        "app/admin/sign-in/page.tsx": "public sign-in page",
        "server/auth/auth.action.ts": '"use server";',
        "app/api/health/route.ts": "public by contract",
        "server/cart/cart.action.ts": '"use server";\nexport async function add() {}',
        "server/cart/other.action.ts": '"use server";\nreturn runAction("x", {}, h);',
      }),
    ).toEqual([
      "app/api/admin/orders/route.ts (admin API routes must call adminApiHandler)",
      "app/admin/orders/page.tsx (admin pages and layouts must call requireAdminPage)",
      "app/admin/(protected)/@modal/default.tsx (admin pages and layouts must call requireAdminPage)",
      "app/admin/(protected)/orders/save.ts (server actions must call requireAdmin or runAdminAction)",
      "server/catalog/publish.ts (server actions must call requireAdmin or runAdminAction)",
      "app/admin/(protected)/fake/page.tsx (admin pages and layouts must call requireAdminPage)",
      "server/catalog/commented.action.ts (server actions must call requireAdmin or runAdminAction)",
      "server/cart/cart.action.ts (shopper actions must call runAction)",
      "server/cart/other.action.ts (server actions must call requireAdmin or runAdminAction)",
    ]);
  });
});
