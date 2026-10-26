import { posix } from "node:path";

// Checks for the agent instruction files (root AGENTS.md, package AGENTS.md, CLAUDE.md, the
// lessons index). Pure logic: the file access is injected, so the unit tests need no disk.
// Run through `npm run check:agents` (entry: scripts/check-agents.ts).

/** Root AGENTS.md is a router: it must stay under 12 KB (12 * 1024 bytes). */
export const ROOT_AGENTS_MAX_BYTES = 12 * 1024;
/** .ai/lessons.md is an index with one line per lesson; the budget keeps it short. */
export const LESSONS_MAX_LINES = 100;

export const ROOT_AGENTS = "AGENTS.md";
export const CLAUDE = "CLAUDE.md";
export const LESSONS = ".ai/lessons.md";

/** CLAUDE.md holds the import of AGENTS.md and the reminders section (with its bullets) only. */
export const CLAUDE_IMPORT = "@AGENTS.md";
export const CLAUDE_REMINDERS_HEADING = "## Claude Code reminders";

/** Paths a reference may name that exist only after a test run (written by failing e2e tests, not in git). */
export const GENERATED_PATHS: readonly string[] = ["packages/app/e2e/artifacts/"];

/** Read-only view of the repository (root-relative, forward-slash paths). */
export interface AgentsRepo {
  /** Text of a file, or undefined when it is missing. */
  readText(path: string): string | undefined;
  /** True when a file or a directory exists. */
  exists(path: string): boolean;
  /** AGENTS.md files of the packages, e.g. `packages/core/AGENTS.md`. */
  packageAgentFiles(): string[];
}

export interface CheckIssue {
  file: string;
  message: string;
}

const FENCED_BLOCK = /```[\s\S]*?```/g;
/**
 * A repo path: at least one slash, made of path characters only. It rejects URLs, routes
 * (`/api/health`), scopes (`@commerceos/app`), flags, globs, placeholders (`<name>`, `…`,
 * `YYYY`), anything with a space or a colon, and home-relative paths (`~/.ssh`).
 */
const REPO_PATH = /^(?!https?:)(?![/~@-])(?!.*YYYY)[\w.()[\]-]+(?:\/[\w.()[\]-]*)+$/;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The backticked spans of a Markdown text that look like repo paths (fenced code is skipped). */
export function referencedPaths(markdown: string): string[] {
  // Splitting on the backtick puts every code span at an odd index.
  const parts = markdown.replace(FENCED_BLOCK, "").split("`");
  return parts.filter((_, index) => index % 2 === 1).filter((span) => REPO_PATH.test(span));
}

/**
 * A referenced path resolves next to the file that names it, under that package's `src/`
 * (package AGENTS.md files name paths such as `server/customer-auth/`), or from the repo root.
 */
function checkReferences(file: string, text: string, repo: AgentsRepo): CheckIssue[] {
  const directory = posix.dirname(file);
  return referencedPaths(text)
    .filter((token) => {
      const candidates = [posix.join(directory, token), posix.join(directory, "src", token), token];
      return !candidates.some(
        (candidate) => repo.exists(candidate) || GENERATED_PATHS.includes(candidate),
      );
    })
    .map((token) => ({ file, message: `references \`${token}\`, which does not exist` }));
}

/** The root router's size budget. */
export function checkRootSize(text: string): string[] {
  const size = byteLength(text);
  return size > ROOT_AGENTS_MAX_BYTES
    ? [`is ${size} bytes, the budget is ${ROOT_AGENTS_MAX_BYTES} bytes (12 KB)`]
    : [];
}

/** CLAUDE.md: one import line, one reminders heading, and reminder bullets below the heading. */
export function checkClaudeFile(text: string): string[] {
  const problems: string[] = [];
  let imports = 0;
  let headings = 0;
  let inReminders = false;
  text.split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    if (line === "") {
      return;
    }
    if (line === CLAUDE_IMPORT) {
      imports += 1;
      return;
    }
    if (line === CLAUDE_REMINDERS_HEADING) {
      headings += 1;
      inReminders = true;
      return;
    }
    if (inReminders && line.startsWith("- ")) {
      return;
    }
    problems.push(
      `line ${index + 1} is not the import, the reminders heading or a reminder bullet`,
    );
  });
  if (imports !== 1) {
    problems.push(`has ${imports} \`${CLAUDE_IMPORT}\` lines, expected 1`);
  }
  if (headings !== 1) {
    problems.push(`has ${headings} \`${CLAUDE_REMINDERS_HEADING}\` headings, expected 1`);
  }
  return problems;
}

/** The lessons index line budget (the final newline does not count as a line). */
export function checkLessonsBudget(text: string): string[] {
  const lines = text.replace(/\n$/, "").split("\n").length;
  return lines > LESSONS_MAX_LINES
    ? [`has ${lines} lines, the budget is ${LESSONS_MAX_LINES}`]
    : [];
}

function checkWholeFile(
  file: string,
  text: string | undefined,
  check: (text: string) => string[],
): CheckIssue[] {
  if (text === undefined) {
    return [{ file, message: "is missing" }];
  }
  return check(text).map((message) => ({ file, message }));
}

/** Runs every check; an empty list means the agent instructions pass the gate. */
export function checkAgents(repo: AgentsRepo): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const agentFiles = [ROOT_AGENTS, ...repo.packageAgentFiles()];
  for (const file of agentFiles) {
    const text = repo.readText(file);
    if (text === undefined) {
      issues.push({ file, message: "is missing" });
      continue;
    }
    issues.push(...checkReferences(file, text, repo));
    if (file === ROOT_AGENTS) {
      issues.push(...checkWholeFile(file, text, checkRootSize));
    }
  }
  issues.push(...checkWholeFile(CLAUDE, repo.readText(CLAUDE), checkClaudeFile));
  issues.push(...checkWholeFile(LESSONS, repo.readText(LESSONS), checkLessonsBudget));
  return issues;
}
