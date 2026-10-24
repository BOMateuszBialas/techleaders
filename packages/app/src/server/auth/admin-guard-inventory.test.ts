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
 * The account area (E07 spec, Architecture) mirrors these rules with its own guard
 * (`server/customer-auth/require-customer.ts`):
 *
 * - every page, layout or default file under `app/(storefront)/account/`, except the sign-in
 *   and sign-up pages, must call `requireCustomerPage(`
 * - every route handler under `app/api/account/` must use `customerApiHandler(`
 * - the customer sign-up, sign-in and sign-out actions are a documented exception, like the
 *   owner's (they create or end the session)
 * - no crossing: admin entry points never import `require-customer`, account entry points never
 *   import `require-admin`
 * - `getCustomerAuth(` is called only in `server/customer-auth/` and the customer auth route;
 *   `getAuth(` only in `server/auth/` and the owner auth route (plus their definitions in
 *   `server/container.ts`)
 *
 * The inventory proves that a guard is imported or named, not that it runs on every path: each
 * entry point also has behaviour tests (no session, wrong role, session-read failure).
 *
 * Comments are stripped first, so a guard that only appears in a comment does not count.
 */
const srcDir = fileURLToPath(new URL("../../", import.meta.url));

const SIGN_IN_ACTIONS = "server/auth/auth.action.ts";
/** Customer sign-up, sign-in and sign-out (E07): they create or end the customer session. */
const CUSTOMER_AUTH_ACTIONS = "server/customer-auth/customer-auth.action.ts";
/** Public storefront actions: they change only the caller's own cart cookie (cart spec A12). */
const SHOPPER_ACTIONS = ["server/cart/cart.action.ts", "server/orders/order.action.ts"];
const SOURCE = /\.(ts|tsx|js|jsx|mts|mjs)$/;
const TEST = /\.test\.[a-z]+$/;

type Rule = {
  name: string;
  matches: (path: string, code: string) => boolean;
} & (
  | {
      /** Any one of these calls counts as the guard. */
      guards: string[];
    }
  | {
      /** None of these may appear in a matching file. */
      forbids: RegExp[];
      /** How the failure reads: "<rule name> must not <what>". */
      what: string;
    }
);

const USE_SERVER = /^\s*["']use server["']/m;
const isAdminArea = (path: string) => /^app\/(admin|api\/admin)\//.test(path);
const isAccountArea = (path: string) => /^app\/(\(storefront\)\/account|api\/account)\//.test(path);
const isAdminAction = (code: string) =>
  USE_SERVER.test(code) && /\b(requireAdmin|runAdminAction)\(/.test(code);
const REQUIRE_CUSTOMER_IMPORT = /from\s+["'][^"']*require-customer["']/;
const REQUIRE_ADMIN_IMPORT = /from\s+["'][^"']*require-admin["']/;

const RULES: Rule[] = [
  {
    name: "admin pages and layouts",
    matches: (path) =>
      /^app\/admin\/.*(page|layout|default|template)\.(tsx|jsx|ts|js)$/.test(path) &&
      !path.startsWith("app/admin/sign-in/"),
    guards: ["requireAdminPage("],
  },
  {
    name: "admin API routes",
    // Also a route handler placed beside the admin pages.
    matches: (path) => /^app\/(api\/)?admin\/.*route\.(ts|js)$/.test(path),
    guards: ["adminApiHandler("],
  },
  {
    name: "server actions",
    matches: (path, code) =>
      /^\s*["']use server["']/m.test(code) &&
      path !== SIGN_IN_ACTIONS &&
      path !== CUSTOMER_AUTH_ACTIONS &&
      !SHOPPER_ACTIONS.includes(path),
    guards: ["requireAdmin(", "runAdminAction("],
  },
  {
    name: "shopper actions",
    matches: (path) => SHOPPER_ACTIONS.includes(path),
    guards: ["runAction("],
  },
  {
    name: "account pages and layouts",
    matches: (path) =>
      /^app\/\(storefront\)\/account\/.*(page|layout|default|template)\.(tsx|jsx|ts|js)$/.test(
        path,
      ) && !/^app\/\(storefront\)\/account\/sign-(in|up)\//.test(path),
    guards: ["requireCustomerPage("],
  },
  {
    name: "account API routes",
    // Also a route handler placed beside the account pages.
    matches: (path) => /^app\/(api\/account|\(storefront\)\/account)\/.*route\.(ts|js)$/.test(path),
    guards: ["customerApiHandler("],
  },
  {
    name: "admin entry points",
    matches: (path, code) => isAdminArea(path) || isAdminAction(code),
    forbids: [REQUIRE_CUSTOMER_IMPORT],
    what: "import require-customer",
  },
  {
    name: "account entry points",
    matches: (path) => isAccountArea(path),
    forbids: [REQUIRE_ADMIN_IMPORT],
    what: "import require-admin",
  },
  {
    name: "files outside the customer auth module",
    matches: (path) =>
      !path.startsWith("server/customer-auth/") &&
      !path.startsWith("app/api/customer-auth/") &&
      path !== "server/container.ts",
    forbids: [/\bgetCustomerAuth\(/],
    what: "call getCustomerAuth",
  },
  {
    name: "files outside the owner auth module",
    matches: (path) =>
      !path.startsWith("server/auth/") &&
      !path.startsWith("app/api/auth/") &&
      path !== "server/container.ts",
    forbids: [/\bgetAuth\(/],
    what: "call getAuth",
  },
];

function violates(rule: Rule, code: string): boolean {
  return "guards" in rule
    ? !rule.guards.some((guard) => code.includes(guard))
    : rule.forbids.some((pattern) => pattern.test(code));
}

function describeViolation(rule: Rule): string {
  return "guards" in rule
    ? `${rule.name} must call ${rule.guards.map((guard) => guard.slice(0, -1)).join(" or ")}`
    : `${rule.name} must not ${rule.what}`;
}

/** Removes block and line comments (good enough for a guard-presence check). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Pure check: returns the files that skip their guard. */
function findUnguarded(files: Record<string, string>): string[] {
  return Object.entries(files).flatMap(([path, source]) => {
    const code = stripComments(source);
    return RULES.filter((rule) => rule.matches(path, code) && violates(rule, code)).map(
      (rule) => `${path} (${describeViolation(rule)})`,
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
        "app/admin/(protected)/products/import/page.tsx",
        "server/catalog/product-import.action.ts",
        "app/admin/(protected)/orders/page.tsx",
        "app/admin/(protected)/orders/[id]/page.tsx",
        "server/orders/order-status.action.ts",
        "app/admin/(protected)/copilot/page.tsx",
        "app/api/admin/copilot/answers/route.ts",
        "server/copilot/recommendation.action.ts",
        SIGN_IN_ACTIONS,
        ...SHOPPER_ACTIONS,
        CUSTOMER_AUTH_ACTIONS,
        "app/(storefront)/account/page.tsx",
        "app/(storefront)/account/orders/page.tsx",
        "app/(storefront)/account/sign-in/page.tsx",
        "app/(storefront)/account/sign-up/page.tsx",
        "app/api/auth/[...all]/route.ts",
        "app/api/customer-auth/[...all]/route.ts",
        "server/customer-auth/require-customer.ts",
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

  it("flags each kind of unguarded account entry point (E07)", () => {
    expect(
      findUnguarded({
        "app/(storefront)/account/orders/page.tsx": "export default function Page() {}",
        "app/(storefront)/account/layout.tsx": "export default function L() {}",
        "app/(storefront)/account/@modal/default.tsx": "export default function D() {}",
        "app/(storefront)/account/fake/page.tsx":
          "// await requireCustomerPage();\nexport default 1",
        "app/(storefront)/account/ok/page.tsx": "await requireCustomerPage();",
        "app/(storefront)/account/sign-in/page.tsx": "public sign-in page",
        "app/(storefront)/account/sign-up/page.tsx": "public sign-up page",
        "app/api/account/orders/route.ts": "export const GET = apiHandler(...)",
        "app/api/account/orders/[id]/route.ts": "export const GET = customerApiHandler(...)",
        "server/customer-auth/customer-auth.action.ts": '"use server";',
        "server/customer-auth/other.action.ts": '"use server";\nexport async function x() {}',
        "app/(storefront)/account/template.tsx": "export default function T() {}",
        "app/(storefront)/account/export/route.ts": "export async function GET() {}",
        "app/(storefront)/account/error.tsx": '"use client";\nexport default function E() {}',
        "app/admin/(protected)/template.tsx": "export default function T() {}",
        "app/admin/(protected)/export/route.ts": "export async function GET() {}",
      }),
    ).toEqual([
      "app/(storefront)/account/orders/page.tsx (account pages and layouts must call requireCustomerPage)",
      "app/(storefront)/account/layout.tsx (account pages and layouts must call requireCustomerPage)",
      "app/(storefront)/account/@modal/default.tsx (account pages and layouts must call requireCustomerPage)",
      "app/(storefront)/account/fake/page.tsx (account pages and layouts must call requireCustomerPage)",
      "app/api/account/orders/route.ts (account API routes must call customerApiHandler)",
      "server/customer-auth/other.action.ts (server actions must call requireAdmin or runAdminAction)",
      "app/(storefront)/account/template.tsx (account pages and layouts must call requireCustomerPage)",
      "app/(storefront)/account/export/route.ts (account API routes must call customerApiHandler)",
      "app/admin/(protected)/template.tsx (admin pages and layouts must call requireAdminPage)",
      "app/admin/(protected)/export/route.ts (admin API routes must call adminApiHandler)",
    ]);
  });

  // The sign-in action files are exempt from the action guard because they create or end a
  // session; pinning their exports means a new action added there (an order read, say) fails
  // here instead of slipping through the exemption.
  it.each([
    [SIGN_IN_ACTIONS, ["signIn", "signOut"]],
    [CUSTOMER_AUTH_ACTIONS, ["signUpCustomer", "signInCustomer", "signOutCustomer"]],
  ])("exports only the session actions from %s", (path, expected) => {
    const code = stripComments(readFileSync(join(srcDir, path), "utf8"));
    const named = [...code.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)].map(
      (match) => match[1],
    );
    expect(named).toEqual(expected);
    // No other kind of export can add an endpoint unseen.
    expect(code.match(/^export\s/gm)).toHaveLength(expected.length);
  });

  it("forbids crossing the owner and customer guards and auth instances (E07)", () => {
    const importCustomer =
      'import { getCurrentCustomer } from "@/server/customer-auth/require-customer";';
    const importAdmin = 'import { getCurrentAdmin } from "@/server/auth/require-admin";';
    expect(
      findUnguarded({
        "app/admin/(protected)/page.tsx": `await requireAdminPage();\n${importCustomer}`,
        "app/api/admin/me/route.ts": `adminApiHandler(...);\n${importCustomer}`,
        "server/catalog/x.action.ts": `"use server";\nrunAdminAction();\n${importCustomer}`,
        "app/(storefront)/account/orders/page.tsx": `await requireCustomerPage();\n${importAdmin}`,
        "app/api/account/orders/route.ts": `customerApiHandler(...);\n${importAdmin}`,
        "app/(storefront)/account/sign-in/page.tsx": importAdmin,
        "app/(storefront)/layout.tsx": "const auth = getCustomerAuth();",
        "server/orders/order.action.ts": '"use server";\nrunAction();\ngetAuth();',
        // Allowed: each module calls its own instance, the storefront may read the customer guard.
        "server/customer-auth/customer-sign-in.ts": "getCustomerAuth().handler",
        "app/api/customer-auth/[...all]/route.ts": "getCustomerAuth()",
        "server/auth/sign-in.ts": "getAuth().handler",
        "app/api/auth/[...all]/route.ts": "getAuth()",
        "server/container.ts": "export function getAuth() {}\nexport function getCustomerAuth() {}",
        "app/(storefront)/checkout/page.tsx": importCustomer,
        "app/admin/sign-in/page.tsx": `${importAdmin}\n// ${importCustomer}`,
      }),
    ).toEqual([
      "app/admin/(protected)/page.tsx (admin entry points must not import require-customer)",
      "app/api/admin/me/route.ts (admin entry points must not import require-customer)",
      "server/catalog/x.action.ts (admin entry points must not import require-customer)",
      "app/(storefront)/account/orders/page.tsx (account entry points must not import require-admin)",
      "app/api/account/orders/route.ts (account entry points must not import require-admin)",
      "app/(storefront)/account/sign-in/page.tsx (account entry points must not import require-admin)",
      "app/(storefront)/layout.tsx (files outside the customer auth module must not call getCustomerAuth)",
      "server/orders/order.action.ts (files outside the owner auth module must not call getAuth)",
    ]);
  });
});
