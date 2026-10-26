import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkAgents, type AgentsRepo } from "./check";

/** The repository on disk, read relative to `root` (the repo root when run by npm). */
export function createFsRepo(root: string): AgentsRepo {
  return {
    readText(path) {
      const full = join(root, path);
      return existsSync(full) && statSync(full).isFile() ? readFileSync(full, "utf8") : undefined;
    },
    exists(path) {
      return existsSync(join(root, path));
    },
    packageAgentFiles() {
      return readdirSync(join(root, "packages"))
        .map((name) => `packages/${name}/AGENTS.md`)
        .filter((path) => existsSync(join(root, path)));
    },
  };
}

/** Prints every issue and returns the process exit code (0 when the agent instructions pass). */
export function runCheckAgents(repo: AgentsRepo, write: (line: string) => void): number {
  const issues = checkAgents(repo);
  if (issues.length === 0) {
    write(`check:agents: ok (${repo.packageAgentFiles().length + 1} agent files checked)`);
    return 0;
  }
  for (const issue of issues) {
    write(`check:agents: ${issue.file} ${issue.message}`);
  }
  write(`check:agents: ${issues.length} problem(s); see scripts/agents/check.ts for the budgets`);
  return 1;
}
