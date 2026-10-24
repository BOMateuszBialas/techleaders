import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runTokenCheck, TOKEN_SCAN_ROOTS } from "../src/lib/design-tokens/find-off-token-values";

// Entry for `npm run check:tokens` (runs in packages/app). The logic and its tests live in
// src/lib/design-tokens; this file only lists the files and sets the exit code.
const appDir = process.cwd();
const files = TOKEN_SCAN_ROOTS.filter((root) => existsSync(join(appDir, root))).flatMap((root) =>
  readdirSync(join(appDir, root), { recursive: true, encoding: "utf8" })
    .filter((path) => !path.includes("node_modules"))
    .map((path) => `${root}/${path.replaceAll("\\", "/")}`),
);

process.exitCode = runTokenCheck({
  files,
  readFile: (path) => readFileSync(join(appDir, path), "utf8"),
  write: (line) => process.stdout.write(`${line}\n`),
});
