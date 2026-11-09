import { describe, expect, inject, it } from "vitest";

/**
 * The response headers of the running production build (set in packages/app/next.config.ts).
 * Checked on a storefront page, a customer page and the admin sign-in, so the header set applies
 * to every route group. X-Powered-By must be absent (it names the framework).
 */
const PATHS = ["/", "/account/sign-in", "/admin/sign-in"] as const;

const EXPECTED: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "content-security-policy":
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
};

describe("security response headers", () => {
  const baseUrl = inject("baseUrl");

  for (const path of PATHS) {
    it(`sets the safe header set on ${path}`, async () => {
      const response = await fetch(new URL(path, baseUrl));
      for (const [name, value] of Object.entries(EXPECTED)) {
        expect(response.headers.get(name), name).toBe(value);
      }
    });
  }

  it("does not name the framework", async () => {
    const response = await fetch(new URL("/", baseUrl));
    expect(response.headers.get("x-powered-by")).toBeNull();
  });
});
