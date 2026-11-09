import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, it } from "vitest";
import { z } from "zod";
import "./support/provided-context";

/**
 * Anti-CSRF proof for the running production build (decision D7, evidence card L16).
 *
 * Every state-changing request the app accepts is sent with `Origin: https://evil.example` and a
 * valid session cookie of the signed-in user. Each one must be refused with 403 before anything
 * changes. Two layers do this, and each is checked separately:
 * - Better Auth's origin check (`advanced.disableOriginCheck: false`, `trustedOrigins` = APP_URL)
 *   on the owner and customer HTTP endpoints;
 * - Next.js's server action origin check (Origin must match Host), on every server action listed
 *   in the build's `server-reference-manifest.json`.
 * Controls send the same request from the app's own origin: they show the request is otherwise
 * valid (200 for sign-in, not 403 for an action), so the 403 is caused by the origin alone.
 * Route handlers that change nothing (`copilot/answers`, `products/description-drafts`) are out
 * of scope; `api/account/orders/[id]` exports only GET.
 */

const EVIL_ORIGIN = "https://evil.example";
const MANIFEST_PATH = fileURLToPath(
  new URL("../.next/server/server-reference-manifest.json", import.meta.url),
);
const ServerReferenceManifest = z.object({
  node: z.record(z.string(), z.object({ exportedName: z.string().nullable() })),
});

const baseUrl = inject("baseUrl");
const ownerCookie = inject("ownerSessionCookie");
const customerCookie = inject("customerASessionCookie");

type SendOptions = {
  origin: string;
  cookie: string;
  json?: unknown;
  headers?: Record<string, string>;
  body?: string;
  contentType?: string;
};

function send(path: string, { origin, cookie, json, headers, body, contentType }: SendOptions) {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      origin,
      cookie,
      ...(json !== undefined && { "content-type": "application/json" }),
      ...(contentType !== undefined && { "content-type": contentType }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
}

function serverActions(): Array<{ id: string; name: string }> {
  const manifest = ServerReferenceManifest.parse(JSON.parse(readFileSync(MANIFEST_PATH, "utf8")));
  return Object.entries(manifest.node).map(([id, entry]) => ({
    id,
    name: entry.exportedName ?? "(anonymous)",
  }));
}

describe("anti-CSRF: Better Auth endpoints", () => {
  it("customer sign-in: foreign origin with a customer session is refused (403)", async () => {
    const response = await send("/api/customer-auth/sign-in/email", {
      origin: EVIL_ORIGIN,
      cookie: customerCookie,
      json: { email: inject("customerAEmail"), password: inject("customerAPassword") },
    });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("customer sign-in: the same request from the app origin is accepted, cookie is SameSite=Lax (control)", async () => {
    const response = await send("/api/customer-auth/sign-in/email", {
      origin: baseUrl,
      cookie: customerCookie,
      json: { email: inject("customerAEmail"), password: inject("customerAPassword") },
    });
    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie().join("; ");
    expect(cookies).toMatch(/SameSite=Lax/i);
    expect(cookies).toMatch(/HttpOnly/i);
  });

  it("customer sign-up: foreign origin with a customer session is refused (403)", async () => {
    const response = await send("/api/customer-auth/sign-up/email", {
      origin: EVIL_ORIGIN,
      cookie: customerCookie,
      json: { email: "csrf-probe@e2e.test", password: "csrf-probe-password" },
    });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("customer sign-out: foreign origin is refused (403) and the session still works", async () => {
    const response = await send("/api/customer-auth/sign-out", {
      origin: EVIL_ORIGIN,
      cookie: customerCookie,
      json: {},
    });
    expect(response.status).toBe(403);
    const session = await fetch(new URL("/api/customer-auth/get-session", baseUrl), {
      headers: { cookie: customerCookie },
    });
    expect(session.status).toBe(200);
    expect(await session.text()).toContain('"email"');
  });

  it("admin sign-in: foreign origin with an owner session is refused (403)", async () => {
    const response = await send("/api/auth/sign-in/email", {
      origin: EVIL_ORIGIN,
      cookie: ownerCookie,
      json: { email: inject("ownerEmail"), password: inject("ownerPassword") },
    });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("admin sign-in: the same request from the app origin is accepted (control)", async () => {
    const response = await send("/api/auth/sign-in/email", {
      origin: baseUrl,
      cookie: ownerCookie,
      json: { email: inject("ownerEmail"), password: inject("ownerPassword") },
    });
    expect(response.status).toBe(200);
  });

  it("admin sign-up (disabled): foreign origin with an owner session is refused (403)", async () => {
    const response = await send("/api/auth/sign-up/email", {
      origin: EVIL_ORIGIN,
      cookie: ownerCookie,
      json: { email: "csrf-admin@e2e.test", password: "csrf-probe-password", name: "x" },
    });
    expect(response.status).toBe(403);
  });

  it("admin sign-out: foreign origin is refused (403) and the owner session still works", async () => {
    const response = await send("/api/auth/sign-out", {
      origin: EVIL_ORIGIN,
      cookie: ownerCookie,
      json: {},
    });
    expect(response.status).toBe(403);
    const me = await fetch(new URL("/api/admin/me", baseUrl), {
      headers: { cookie: ownerCookie },
    });
    expect(me.status).toBe(200);
  });
});

describe("anti-CSRF: server actions", () => {
  const actions = serverActions();

  it("the build exposes the server actions (manifest is not empty)", () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  // Next.js refuses a fetch-style action whose Origin does not match Host before it decodes the
  // arguments or runs the action, and answers 500 with "Invalid Server Actions request."
  // (node_modules/next/dist/server/app-render/action-handler.js). That 500 is the framework's
  // refusal, not a crash: the action never runs.
  for (const action of actions) {
    it(`${action.name}: foreign origin with an owner session is refused (500, Next origin check)`, async () => {
      const response = await send("/", {
        origin: EVIL_ORIGIN,
        cookie: ownerCookie,
        contentType: "text/plain;charset=UTF-8",
        body: "[]",
        headers: { "next-action": action.id, accept: "text/x-component" },
      });
      expect(response.status).toBe(500);
    });
  }

  it("control: lookupOrder from the app origin passes the origin check (200)", async () => {
    const lookup = actions.find((action) => action.name === "lookupOrder");
    expect(lookup).toBeDefined();
    const response = await send("/", {
      origin: baseUrl,
      cookie: ownerCookie,
      contentType: "text/plain;charset=UTF-8",
      body: "[]",
      headers: { "next-action": lookup?.id ?? "", accept: "text/x-component" },
    });
    expect(response.status).toBe(200);
  });
});
