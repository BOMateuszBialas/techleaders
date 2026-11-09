import { describe, expect, it } from "vitest";
import {
  formatSmokeReport,
  runSmokeChecks,
  type SmokeFetch,
  type SmokeResponse,
  type SmokeResult,
} from "./check";

const SECURE_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "text/html; charset=utf-8",
};

function response(
  status: number,
  body = "",
  headers: Record<string, string> = SECURE_HEADERS,
): SmokeResponse {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, body, headers: { get: (name) => map.get(name.toLowerCase()) ?? null } };
}

/** A fake deployment: a map from URL to response; an unknown URL fails the request. */
function deployment(routes: Record<string, SmokeResponse | Error>): {
  fetchUrl: SmokeFetch;
  requested: string[];
} {
  const requested: string[] = [];
  const fetchUrl: SmokeFetch = async (url) => {
    requested.push(url);
    const route = routes[url];
    if (route === undefined) throw new Error(`no route for ${url}`);
    if (route instanceof Error) throw route;
    return route;
  };
  return { fetchUrl, requested };
}

const HEALTHY = {
  "https://app.test/api/health": response(200, JSON.stringify({ status: "ok", components: [] })),
  "https://app.test/": response(200, "<html></html>"),
};

function byName(results: SmokeResult[], name: string): SmokeResult {
  const result = results.find((item) => item.name === name);
  if (result === undefined) throw new Error(`no result named ${name}`);
  return result;
}

describe("runSmokeChecks", () => {
  it("passes every check on a healthy deployment and requests the trimmed base URL", async () => {
    const { fetchUrl, requested } = deployment(HEALTHY);

    const results = await runSmokeChecks("https://app.test//", fetchUrl);

    expect(results.every((result) => result.ok)).toBe(true);
    expect(requested).toEqual(["https://app.test/api/health", "https://app.test/"]);
    expect(results.map((result) => result.name)).toEqual([
      "GET /api/health",
      "GET /",
      "header X-Frame-Options on /",
      "header X-Content-Type-Options on /",
    ]);
  });

  it("fails the health check when the status is not 200", async () => {
    const { fetchUrl } = deployment({
      ...HEALTHY,
      "https://app.test/api/health": response(503, JSON.stringify({ status: "degraded" })),
    });

    const result = byName(await runSmokeChecks("https://app.test", fetchUrl), "GET /api/health");

    expect(result.ok).toBe(false);
    expect(result.detail).toBe("expected HTTP 200, got 503");
  });

  it("fails the health check when the body is not JSON or does not say ok", async () => {
    const notJson = deployment({
      ...HEALTHY,
      "https://app.test/api/health": response(200, "<html>"),
    });
    const notOk = deployment({
      ...HEALTHY,
      "https://app.test/api/health": response(200, JSON.stringify({ status: "degraded" })),
    });
    const noStatus = deployment({
      ...HEALTHY,
      "https://app.test/api/health": response(200, JSON.stringify(["ok"])),
    });

    const fromNotJson = byName(
      await runSmokeChecks("https://app.test", notJson.fetchUrl),
      "GET /api/health",
    );
    const fromNotOk = byName(
      await runSmokeChecks("https://app.test", notOk.fetchUrl),
      "GET /api/health",
    );
    const fromNoStatus = byName(
      await runSmokeChecks("https://app.test", noStatus.fetchUrl),
      "GET /api/health",
    );

    expect(fromNotJson.detail).toBe('expected body status "ok", got undefined');
    expect(fromNotOk.detail).toBe('expected body status "ok", got degraded');
    expect(fromNoStatus.detail).toBe('expected body status "ok", got undefined');
    expect(fromNotOk.ok).toBe(false);
  });

  it("reports a network error as a failed check and keeps running the others", async () => {
    const { fetchUrl } = deployment({
      "https://app.test/": response(200, "<html></html>"),
      "https://app.test/api/health": new Error("connect ECONNREFUSED"),
    });

    const results = await runSmokeChecks("https://app.test", fetchUrl);

    expect(byName(results, "GET /api/health").detail).toBe("request failed: connect ECONNREFUSED");
    expect(byName(results, "GET /").ok).toBe(true);
  });

  it("reports a non-Error rejection as a failed check", async () => {
    const fetchUrl: SmokeFetch = async (url) => {
      if (url.endsWith("/api/health")) throw "boom";
      return response(200, "<html></html>");
    };

    const result = byName(await runSmokeChecks("https://app.test", fetchUrl), "GET /api/health");

    expect(result.detail).toBe("request failed: boom");
  });

  it("fails the home page when the status is not 200 and still reads its headers", async () => {
    const { fetchUrl } = deployment({ ...HEALTHY, "https://app.test/": response(500, "") });

    const results = await runSmokeChecks("https://app.test", fetchUrl);

    expect(byName(results, "GET /").detail).toBe("expected HTTP 200, got 500");
    expect(byName(results, "header X-Frame-Options on /").ok).toBe(true);
  });

  it("skips the header checks when the home page request itself fails", async () => {
    const { fetchUrl } = deployment({
      ...HEALTHY,
      "https://app.test/": new Error("timeout"),
    });

    const results = await runSmokeChecks("https://app.test", fetchUrl);

    expect(byName(results, "header X-Frame-Options on /").detail).toBe(
      "skipped: the home page request failed",
    );
  });

  it("fails the home page when it is not HTML", async () => {
    const { fetchUrl } = deployment({
      ...HEALTHY,
      "https://app.test/": response(200, "{}", {
        ...SECURE_HEADERS,
        "Content-Type": "application/json",
      }),
    });

    const result = byName(await runSmokeChecks("https://app.test", fetchUrl), "GET /");

    expect(result.detail).toBe('expected text/html, got "application/json"');
  });

  it("fails the home page when it has no content type", async () => {
    const { fetchUrl } = deployment({
      ...HEALTHY,
      "https://app.test/": response(200, "", { ...SECURE_HEADERS, "Content-Type": "" }),
    });

    const result = byName(await runSmokeChecks("https://app.test", fetchUrl), "GET /");

    expect(result.ok).toBe(false);
  });

  it("fails a security header that is missing or has another value", async () => {
    const wrongFrame = deployment({
      ...HEALTHY,
      "https://app.test/": response(200, "<html></html>", {
        ...SECURE_HEADERS,
        "X-Frame-Options": "SAMEORIGIN",
      }),
    });
    const missingNosniff = deployment({
      ...HEALTHY,
      "https://app.test/": response(200, "<html></html>", { "Content-Type": "text/html" }),
    });

    const frame = byName(
      await runSmokeChecks("https://app.test", wrongFrame.fetchUrl),
      "header X-Frame-Options on /",
    );
    const nosniff = byName(
      await runSmokeChecks("https://app.test", missingNosniff.fetchUrl),
      "header X-Content-Type-Options on /",
    );

    expect(frame.detail).toBe('expected "DENY", got "SAMEORIGIN"');
    expect(nosniff.detail).toBe('expected "nosniff", got no header');
    expect(nosniff.ok).toBe(false);
  });
});

describe("formatSmokeReport", () => {
  it("prints one line per check and returns 0 when all pass", () => {
    const lines: string[] = [];
    const code = formatSmokeReport(
      [
        { name: "a", ok: true, detail: "fine" },
        { name: "b", ok: true, detail: "fine" },
      ],
      (line) => lines.push(line),
    );

    expect(code).toBe(0);
    expect(lines).toEqual(["PASS a: fine", "PASS b: fine", "smoke: ok (2 checks)"]);
  });

  it("returns 1 and counts the failures when a check fails", () => {
    const lines: string[] = [];
    const code = formatSmokeReport(
      [
        { name: "a", ok: false, detail: "bad" },
        { name: "b", ok: true, detail: "fine" },
      ],
      (line) => lines.push(line),
    );

    expect(code).toBe(1);
    expect(lines).toContain("FAIL a: bad");
    expect(lines.at(-1)).toBe("smoke: 1 of 2 checks failed");
  });
});
