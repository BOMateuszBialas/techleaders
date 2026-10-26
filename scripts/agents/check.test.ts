import { describe, expect, it } from "vitest";
import {
  checkAgents,
  checkClaudeFile,
  checkLessonsBudget,
  checkRootSize,
  LESSONS_MAX_LINES,
  ROOT_AGENTS_MAX_BYTES,
  referencedPaths,
  type AgentsRepo,
} from "./check";

/** A repo made of in-memory files; a directory exists when some file lives under it. */
function fakeRepo(files: Record<string, string>, packageFiles: string[] = []): AgentsRepo {
  return {
    readText: (path) => files[path],
    exists: (path) => path in files || Object.keys(files).some((file) => file.startsWith(path)),
    packageAgentFiles: () => packageFiles,
  };
}

const GOOD_CLAUDE =
  "@AGENTS.md\n\n## Claude Code reminders\n\n- Read the lessons first.\n- Log runs.\n";
const GOOD_LESSONS = "# Lessons\n\n- **2026-10-26 — One**\n";

describe("referencedPaths", () => {
  it("returns backticked repo paths and skips other code spans and fenced code", () => {
    const markdown = [
      "Read `packages/app/src/server/container.ts` and `docs/design-system.md`.",
      "Run `npm run lint` or `/api/health` or `https://example.com/a` or `@commerceos/app`.",
      "Skip `~/.ssh`, `a/<name>.ts`, `.ai/specs/YYYY-MM-DD-slug.md`, `a b/c`, `x/*.ts`, `noslash`.",
      "Directories count too: `packages/app/e2e/artifacts/` and `src/app/admin/(protected)/`.",
      "```bash",
      "npm run check:agents packages/fenced/inside.ts",
      "```",
    ].join("\n");
    expect(referencedPaths(markdown)).toEqual([
      "packages/app/src/server/container.ts",
      "docs/design-system.md",
      "packages/app/e2e/artifacts/",
      "src/app/admin/(protected)/",
    ]);
  });
});

describe("checkRootSize", () => {
  it("accepts a router at the budget", () => {
    expect(checkRootSize("x".repeat(ROOT_AGENTS_MAX_BYTES))).toEqual([]);
  });

  it("reports a router one byte over the budget", () => {
    const issues = checkRootSize("x".repeat(ROOT_AGENTS_MAX_BYTES + 1));
    expect(issues).toEqual([
      `is ${ROOT_AGENTS_MAX_BYTES + 1} bytes, the budget is ${ROOT_AGENTS_MAX_BYTES} bytes (12 KB)`,
    ]);
  });

  it("counts bytes, not characters", () => {
    // 'ó' is two bytes in UTF-8.
    const text = "ó".repeat(ROOT_AGENTS_MAX_BYTES / 2 + 1);
    expect(checkRootSize(text)).toHaveLength(1);
  });
});

describe("checkClaudeFile", () => {
  it("accepts the import, the reminders heading and its bullets", () => {
    expect(checkClaudeFile(GOOD_CLAUDE)).toEqual([]);
  });

  it("ignores trailing spaces and blank lines", () => {
    expect(checkClaudeFile("@AGENTS.md   \n\n\n## Claude Code reminders  \n- One  \n")).toEqual([]);
  });

  it("reports a missing import", () => {
    expect(checkClaudeFile("## Claude Code reminders\n- One\n")).toEqual([
      "has 0 `@AGENTS.md` lines, expected 1",
    ]);
  });

  it("reports a missing or repeated reminders heading", () => {
    expect(checkClaudeFile("@AGENTS.md\n")).toEqual([
      "has 0 `## Claude Code reminders` headings, expected 1",
    ]);
    expect(
      checkClaudeFile("@AGENTS.md\n## Claude Code reminders\n## Claude Code reminders\n"),
    ).toEqual(["has 2 `## Claude Code reminders` headings, expected 1"]);
  });

  it("reports any other line, with its number", () => {
    const issues = checkClaudeFile("@AGENTS.md\n## Claude Code reminders\nA stray paragraph.\n");
    expect(issues).toEqual([
      "line 3 is not the import, the reminders heading or a reminder bullet",
    ]);
  });

  it("reports a bullet placed before the reminders heading", () => {
    const issues = checkClaudeFile("- too early\n@AGENTS.md\n## Claude Code reminders\n");
    expect(issues).toEqual([
      "line 1 is not the import, the reminders heading or a reminder bullet",
    ]);
  });
});

describe("checkLessonsBudget", () => {
  it("accepts an index at the budget, the final newline not counted", () => {
    const text = `${"- line\n".repeat(LESSONS_MAX_LINES)}`;
    expect(checkLessonsBudget(text)).toEqual([]);
  });

  it("reports an index over the budget", () => {
    const text = `${"- line\n".repeat(LESSONS_MAX_LINES + 1)}`;
    expect(checkLessonsBudget(text)).toEqual([
      `has ${LESSONS_MAX_LINES + 1} lines, the budget is ${LESSONS_MAX_LINES}`,
    ]);
  });

  it("counts a file without a final newline", () => {
    expect(checkLessonsBudget("one\ntwo")).toEqual([]);
  });
});

describe("checkAgents", () => {
  const rootWithOneReference = "# Router\n\nSee `docs/design-system.md`.\n";

  it("passes when every file, reference and budget is in order", () => {
    const repo = fakeRepo(
      {
        "AGENTS.md": rootWithOneReference,
        "CLAUDE.md": GOOD_CLAUDE,
        ".ai/lessons.md": GOOD_LESSONS,
        "docs/design-system.md": "doc",
        "packages/app/AGENTS.md": "Edit `src/server/container.ts`.",
        "packages/app/src/server/container.ts": "export {};",
      },
      ["packages/app/AGENTS.md"],
    );
    expect(checkAgents(repo)).toEqual([]);
  });

  it("reports a missing root, package, CLAUDE.md or lessons file", () => {
    const repo = fakeRepo({}, ["packages/gone/AGENTS.md"]);
    expect(checkAgents(repo)).toEqual([
      { file: "AGENTS.md", message: "is missing" },
      { file: "packages/gone/AGENTS.md", message: "is missing" },
      { file: "CLAUDE.md", message: "is missing" },
      { file: ".ai/lessons.md", message: "is missing" },
    ]);
  });

  it("reports a reference that resolves neither next to its file nor from the root", () => {
    const repo = fakeRepo({
      "AGENTS.md": "Mentions `docs/gone.md`.",
      "CLAUDE.md": GOOD_CLAUDE,
      ".ai/lessons.md": GOOD_LESSONS,
    });
    expect(checkAgents(repo)).toEqual([
      { file: "AGENTS.md", message: "references `docs/gone.md`, which does not exist" },
    ]);
  });

  it("accepts a reference that exists only after a test run, and resolves package-relative paths", () => {
    const repo = fakeRepo(
      {
        "AGENTS.md": "Failing runs save `packages/app/e2e/artifacts/`.",
        "packages/app/AGENTS.md": "Failing runs save `e2e/artifacts/`.",
        "CLAUDE.md": GOOD_CLAUDE,
        ".ai/lessons.md": GOOD_LESSONS,
      },
      ["packages/app/AGENTS.md"],
    );
    expect(checkAgents(repo)).toEqual([]);
  });

  it("resolves a package AGENTS.md path under the package's src/ folder", () => {
    const repo = fakeRepo(
      {
        "AGENTS.md": "Root.",
        "packages/app/AGENTS.md":
          "Only `server/customer-auth/` may call it; `server/gone/` may not.",
        "packages/app/src/server/customer-auth/index.ts": "export {};",
        "CLAUDE.md": GOOD_CLAUDE,
        ".ai/lessons.md": GOOD_LESSONS,
      },
      ["packages/app/AGENTS.md"],
    );
    expect(checkAgents(repo)).toEqual([
      {
        file: "packages/app/AGENTS.md",
        message: "references `server/gone/`, which does not exist",
      },
    ]);
  });

  it("reports an oversized root and bad CLAUDE.md or lessons content", () => {
    const repo = fakeRepo({
      "AGENTS.md": "x".repeat(ROOT_AGENTS_MAX_BYTES + 1),
      "CLAUDE.md": "@AGENTS.md\nstray\n",
      ".ai/lessons.md": "- line\n".repeat(LESSONS_MAX_LINES + 1),
    });
    const issues = checkAgents(repo);
    expect(issues.map((issue) => issue.file)).toEqual([
      "AGENTS.md",
      "CLAUDE.md",
      "CLAUDE.md",
      ".ai/lessons.md",
    ]);
  });

  it("applies the size budget to the root router only, not to package files", () => {
    const repo = fakeRepo(
      {
        "AGENTS.md": "root",
        "packages/app/AGENTS.md": "x".repeat(ROOT_AGENTS_MAX_BYTES + 1),
        "CLAUDE.md": GOOD_CLAUDE,
        ".ai/lessons.md": GOOD_LESSONS,
      },
      ["packages/app/AGENTS.md"],
    );
    expect(checkAgents(repo)).toEqual([]);
  });
});
