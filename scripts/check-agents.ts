import { createFsRepo, runCheckAgents } from "./agents/run";

// Entry for `npm run check:agents` (runs at the repo root). The checks and their tests live in
// scripts/agents/; this file only wires the real disk to the runner and sets the exit code.
process.exitCode = runCheckAgents(createFsRepo(process.cwd()), (line) =>
  process.stdout.write(`${line}\n`),
);
