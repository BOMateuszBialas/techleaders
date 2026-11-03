#!/usr/bin/env node
/**
 * Layout sweep: the repeatable L06 check on the live app.
 *
 * Opens the storefront home and the admin dashboard, orders and Copilot pages at 320, 768 and
 * 1440 px, in light and dark, and reports sideways overflow, uncaught page errors, console errors
 * and HTTP 5xx responses. Output is one line per check; the JSON file (optional) has every detail.
 *
 * Run against a running app (`npm run dev` or `npm run build && npm run start`):
 *
 *   LAYOUT_SWEEP_ADMIN_EMAIL=owner@example.com \
 *   LAYOUT_SWEEP_ADMIN_PASSWORD='...' \
 *   node .ai/scripts/layout-sweep.mjs
 *
 * Environment (no credentials are stored in the repository):
 *   LAYOUT_SWEEP_BASE_URL        app address, default http://localhost:3000
 *   LAYOUT_SWEEP_ADMIN_EMAIL     owner email for the admin pages (created with `npm run admin:create`)
 *   LAYOUT_SWEEP_ADMIN_PASSWORD  owner password for the admin pages
 *   LAYOUT_SWEEP_JSON            optional path for the full results as JSON
 *
 * Without the owner credentials the three admin pages are reported as BLOCKED, not as passed.
 * Exit codes: 0 every check passed; 1 at least one check failed (overflow, page or console error,
 * HTTP 5xx); 2 no failure, but at least one check could not run (server down, sign-in refused).
 *
 * Dark mode is the `.dark` class set from the `commerceos-theme` localStorage key (see
 * packages/app/src/lib/theme/theme.ts), so the sweep sets it explicitly for each run.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE_URL = (process.env.LAYOUT_SWEEP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.LAYOUT_SWEEP_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.LAYOUT_SWEEP_ADMIN_PASSWORD ?? "";
const JSON_OUT = process.env.LAYOUT_SWEEP_JSON ?? "";

const WIDTHS = [320, 768, 1440];
const THEMES = ["light", "dark"];
const PAGES = [
  { name: "storefront home", path: "/", protected: false },
  { name: "admin dashboard", path: "/admin", protected: true },
  { name: "admin orders", path: "/admin/orders", protected: true },
  { name: "admin copilot", path: "/admin/copilot", protected: true },
];
const SIGN_IN_PATH = "/admin/sign-in";
const THEME_STORAGE_KEY = "commerceos-theme";
const NAV_TIMEOUT_MS = 60_000;
const FORM_TIMEOUT_MS = 20_000;
const IDLE_TIMEOUT_MS = 15_000;
// Development tooling noise, not an application defect.
const BENIGN_CONSOLE = [/React DevTools/, /\[HMR\]/, /Fast Refresh/];

const results = [];
const isBenign = (text) => BENIGN_CONSOLE.some((re) => re.test(text));
const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

async function serverIsReachable() {
  try {
    await fetch(`${BASE_URL}/`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    return true;
  } catch {
    return false;
  }
}

/** Signs the owner in through the real form and returns the storage state, or the reason it failed. */
async function signInOwner(browser) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return { ok: false, reason: "LAYOUT_SWEEP_ADMIN_EMAIL or LAYOUT_SWEEP_ADMIN_PASSWORD not set" };
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}${SIGN_IN_PATH}`, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    const passwordInput = page.locator('input[name="password"]');
    const rendered = await passwordInput
      .waitFor({ state: "visible", timeout: FORM_TIMEOUT_MS })
      .then(() => true, () => false);
    if (!rendered) {
      return {
        ok: false,
        reason: "sign-in form did not render (the app may be failing, e.g. the database is unreachable)",
      };
    }
    const form = page.locator("form").filter({ has: passwordInput });
    await form.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await form.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await form.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.startsWith(SIGN_IN_PATH), { timeout: NAV_TIMEOUT_MS });
    return { ok: true, state: await context.storageState() };
  } catch (error) {
    // The form can be server-rendered and then replaced by the error boundary when hydration fails
    // (for example, the database is unreachable): the fill then times out.
    return {
      ok: false,
      reason: `owner sign-in failed (the page may be failing, e.g. the database is unreachable): ${firstLine(error)}`,
    };
  } finally {
    await context.close();
  }
}

async function checkPage(context, target, width, theme) {
  const label = `${theme} ${width}px ${target.name}`;
  const pageErrors = [];
  const consoleErrors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(firstLine(error)));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !isBenign(text)) consoleErrors.push(text.slice(0, 200));
  });
  const blocked = (reason) => {
    results.push({ theme, width, page: target.name, status: "BLOCKED", reason });
    console.log(`BLOCKED  ${label}: ${reason}`);
  };
  try {
    let response;
    try {
      response = await page.goto(`${BASE_URL}${target.path}`, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    } catch (error) {
      return blocked(`page did not load: ${firstLine(error)}`);
    }
    if (target.protected && new URL(page.url()).pathname.startsWith(SIGN_IN_PATH)) {
      return blocked("redirected to the owner sign-in: the session was not accepted");
    }
    await page.waitForLoadState("networkidle", { timeout: IDLE_TIMEOUT_MS }).catch(() => {});
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
      clientWidth: document.documentElement.clientWidth,
    }));
    const overflowPx = Math.max(0, scrollWidth - clientWidth);
    const status = response?.status() ?? 0;
    const failed = overflowPx > 0 || pageErrors.length > 0 || consoleErrors.length > 0 || status >= 500;
    results.push({
      theme,
      width,
      page: target.name,
      status: failed ? "FAIL" : "OK",
      httpStatus: status,
      overflowPx,
      pageErrors,
      consoleErrors,
    });
    console.log(
      `${failed ? "FAIL    " : "OK      "} ${label}: overflow=${overflowPx}px ` +
        `pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length} http=${status}`,
    );
    for (const detail of [...pageErrors, ...consoleErrors].slice(0, 3)) console.log(`          ${detail}`);
  } finally {
    await page.close();
  }
}

async function main() {
  if (!(await serverIsReachable())) {
    console.error(`No app answers at ${BASE_URL}. Start it (npm run dev) or set LAYOUT_SWEEP_BASE_URL.`);
    process.exit(2);
  }
  const browser = await chromium.launch();
  try {
    const owner = await signInOwner(browser);
    if (!owner.ok) console.log(`NOTE     admin pages need the owner session: ${owner.reason}`);
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          storageState: owner.ok ? owner.state : undefined,
        });
        await context.addInitScript(
          ([key, value]) => {
            try {
              window.localStorage.setItem(key, value);
            } catch {
              // Storage unavailable: the page still renders with the system theme.
            }
          },
          [THEME_STORAGE_KEY, theme],
        );
        for (const target of PAGES) {
          if (target.protected && !owner.ok) {
            results.push({ theme, width, page: target.name, status: "BLOCKED", reason: owner.reason });
            console.log(`BLOCKED  ${theme} ${width}px ${target.name}: ${owner.reason}`);
            continue;
          }
          await checkPage(context, target, width, theme);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const count = (status) => results.filter((r) => r.status === status).length;
  console.log(`\n${results.length} checks: ${count("OK")} OK, ${count("FAIL")} FAIL, ${count("BLOCKED")} BLOCKED`);
  if (JSON_OUT) writeFileSync(JSON_OUT, `${JSON.stringify(results, null, 2)}\n`);
  if (count("FAIL") > 0) process.exit(1);
  if (count("BLOCKED") > 0) process.exit(2);
}

await main();
