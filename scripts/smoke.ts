import { formatSmokeReport, runSmokeChecks, type SmokeFetch } from "./smoke/check";

// Entry for `npm run smoke -- <base-url>` (for example https://shop.example.com or
// http://localhost:3000). The checks and their tests live in scripts/smoke/; this file only
// reads the argument, performs the real HTTP requests and sets the exit code.

const REQUEST_TIMEOUT_MS = 10_000;

const fetchUrl: SmokeFetch = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "User-Agent": "commerceos-smoke/1" },
  });
  return { status: response.status, headers: response.headers, body: await response.text() };
};

async function main(): Promise<number> {
  const argument = process.argv[2];
  if (argument === undefined) {
    process.stderr.write("usage: npm run smoke -- <base-url>\n");
    return 2;
  }
  let base: URL;
  try {
    base = new URL(argument);
  } catch {
    process.stderr.write(`smoke: "${argument}" is not a URL\n`);
    return 2;
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") {
    process.stderr.write("smoke: the base URL must start with http:// or https://\n");
    return 2;
  }
  const results = await runSmokeChecks(base.href, fetchUrl);
  return formatSmokeReport(results, (line) => process.stdout.write(`${line}\n`));
}

main().then((code) => {
  process.exitCode = code;
});
