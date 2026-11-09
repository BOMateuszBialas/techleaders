import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./security-headers";

function valueOf(key: string): string | undefined {
  return SECURITY_HEADERS.find((header) => header.key === key)?.value;
}

describe("SECURITY_HEADERS", () => {
  it("forbids MIME sniffing and framing by other sites", () => {
    expect(valueOf("X-Content-Type-Options")).toBe("nosniff");
    expect(valueOf("X-Frame-Options")).toBe("DENY");
    expect(valueOf("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("limits the referrer and disables sensitive browser features", () => {
    expect(valueOf("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valueOf("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });

  it("does not restrict script or style loading (that needs nonces, a separate decision)", () => {
    const csp = valueOf("Content-Security-Policy") ?? "";
    expect(csp).not.toContain("script-src");
    expect(csp).not.toContain("default-src");
  });

  it("names each header once", () => {
    const keys = SECURITY_HEADERS.map((header) => header.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
