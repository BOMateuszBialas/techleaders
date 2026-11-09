/** What a smoke check needs from one HTTP response. Injected, so the checks run without a network. */
export interface SmokeResponse {
  status: number;
  headers: { get(name: string): string | null };
  body: string;
}

/** Performs a GET and returns the response. The entry point wires this to `fetch`. */
export type SmokeFetch = (url: string) => Promise<SmokeResponse>;

export interface SmokeResult {
  name: string;
  ok: boolean;
  detail: string;
}

/** Response headers that must be present with exactly this value (from `next.config.ts`). */
export const REQUIRED_HEADERS: ReadonlyArray<{ name: string; value: string }> = [
  { name: "X-Frame-Options", value: "DENY" },
  { name: "X-Content-Type-Options", value: "nosniff" },
];

/**
 * Smoke checks against a deployed base URL, in order:
 * - GET /api/health returns 200 with `status: "ok"` (the database is up);
 * - GET / returns 200 HTML;
 * - the security headers are on the home page response.
 * Every check runs even when an earlier one fails, so one run shows all problems.
 */
export async function runSmokeChecks(
  baseUrl: string,
  fetchUrl: SmokeFetch,
): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  const root = baseUrl.replace(/\/+$/, "");

  const health = await safely(() => fetchUrl(`${root}/api/health`));
  results.push(checkHealth(health));

  const home = await safely(() => fetchUrl(`${root}/`));
  results.push(checkHome(home));

  for (const header of REQUIRED_HEADERS) {
    results.push(checkHeader(header, home));
  }
  return results;
}

/** Turns a network error into a failed check result instead of an exception. */
async function safely(
  request: () => Promise<SmokeResponse>,
): Promise<SmokeResponse | { error: string }> {
  try {
    return await request();
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function isError(value: SmokeResponse | { error: string }): value is { error: string } {
  return "error" in value;
}

function checkHealth(response: SmokeResponse | { error: string }): SmokeResult {
  const name = "GET /api/health";
  if (isError(response)) return { name, ok: false, detail: `request failed: ${response.error}` };
  if (response.status !== 200) {
    return { name, ok: false, detail: `expected HTTP 200, got ${response.status}` };
  }
  const parsed: unknown = parseJson(response.body);
  const status =
    typeof parsed === "object" && parsed !== null && "status" in parsed ? parsed.status : undefined;
  if (status !== "ok") {
    return { name, ok: false, detail: `expected body status "ok", got ${String(status)}` };
  }
  return { name, ok: true, detail: "HTTP 200, status ok" };
}

function checkHome(response: SmokeResponse | { error: string }): SmokeResult {
  const name = "GET /";
  if (isError(response)) return { name, ok: false, detail: `request failed: ${response.error}` };
  if (response.status !== 200) {
    return { name, ok: false, detail: `expected HTTP 200, got ${response.status}` };
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) {
    return { name, ok: false, detail: `expected text/html, got "${type}"` };
  }
  return { name, ok: true, detail: "HTTP 200, text/html" };
}

function checkHeader(
  header: { name: string; value: string },
  response: SmokeResponse | { error: string },
): SmokeResult {
  const name = `header ${header.name} on /`;
  if (isError(response))
    return { name, ok: false, detail: "skipped: the home page request failed" };
  const actual = response.headers.get(header.name);
  if (actual !== header.value) {
    return {
      name,
      ok: false,
      detail: `expected "${header.value}", got ${actual === null ? "no header" : `"${actual}"`}`,
    };
  }
  return { name, ok: true, detail: `"${header.value}"` };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Prints one line per check and returns the exit code (0 only when every check passes). */
export function formatSmokeReport(results: SmokeResult[], write: (line: string) => void): number {
  for (const result of results) {
    write(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  write(
    failed === 0
      ? `smoke: ok (${results.length} checks)`
      : `smoke: ${failed} of ${results.length} checks failed`,
  );
  return failed === 0 ? 0 : 1;
}
