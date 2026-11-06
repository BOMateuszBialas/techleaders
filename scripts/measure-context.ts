import { homedir } from "node:os";
import { collectMeasurement, renderMeasurement } from "./agents/measure-context";

// Entry for `npx tsx scripts/measure-context.ts` (run from the repo root). Read-only: prints a
// Markdown report to stdout and writes nothing. The logic and its tests live in scripts/agents/.
process.stdout.write(renderMeasurement(collectMeasurement(process.cwd(), homedir())));
