import { existsSync, mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentsRepo } from "./check";
import { createFsRepo, runCheckAgents } from "./run";

const GOOD_CLAUDE = "@AGENTS.md\n\n## Claude Code reminders\n\n- Read the lessons first.\n";
const GOOD_LESSONS = "- **2026-10-26 — One**\n";

let root: string;
const createdFiles: string[] = [];
const createdDirs: string[] = [];

/** Writes a file under the temporary root, creating its folders. */
function put(relative: string, text: string): void {
  let current = root;
  for (const segment of relative.split("/").slice(0, -1)) {
    current = join(current, segment);
    if (!createdDirs.includes(current)) {
      mkdirSync(current);
      createdDirs.push(current);
    }
  }
  const full = join(root, relative);
  writeFileSync(full, text);
  createdFiles.push(full);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-agents-"));
});

// Removes only what the test created: files first, then folders from the deepest.
afterEach(() => {
  for (const file of createdFiles.splice(0)) {
    unlinkSync(file);
  }
  for (const dir of createdDirs.splice(0).reverse()) {
    rmdirSync(dir);
  }
  rmdirSync(root);
});

describe("createFsRepo", () => {
  it("reads files, and reports directories and missing paths as absent text", () => {
    put("CLAUDE.md", GOOD_CLAUDE);
    put("docs/note.md", "note");
    const repo = createFsRepo(root);
    expect(repo.readText("CLAUDE.md")).toBe(GOOD_CLAUDE);
    expect(repo.readText("docs")).toBeUndefined();
    expect(repo.readText("missing.md")).toBeUndefined();
  });

  it("reports whether a file or a folder exists", () => {
    put("docs/note.md", "note");
    const repo = createFsRepo(root);
    expect(repo.exists("docs/note.md")).toBe(true);
    expect(repo.exists("docs")).toBe(true);
    expect(repo.exists("docs/missing.md")).toBe(false);
  });

  it("lists the package AGENTS.md files that exist", () => {
    put("packages/app/AGENTS.md", "app");
    put("packages/config/package.json", "{}");
    put("packages/notes.txt", "not a package");
    expect(createFsRepo(root).packageAgentFiles()).toEqual(["packages/app/AGENTS.md"]);
    expect(existsSync(join(root, "packages", "config", "AGENTS.md"))).toBe(false);
  });
});

/** A fake repo whose package files and their contents are given directly. */
function fakeRepo(packageFiles: string[], files: Record<string, string>): AgentsRepo {
  return {
    readText: (path) => files[path],
    exists: (path) => path in files,
    packageAgentFiles: () => packageFiles,
  };
}

describe("runCheckAgents", () => {
  it("prints an ok line and returns 0 when every check passes", () => {
    const lines: string[] = [];
    const repo = fakeRepo(["packages/app/AGENTS.md"], {
      "AGENTS.md": "# Router",
      "packages/app/AGENTS.md": "# App",
      "CLAUDE.md": GOOD_CLAUDE,
      ".ai/lessons.md": GOOD_LESSONS,
    });
    expect(runCheckAgents(repo, (line) => lines.push(line))).toBe(0);
    expect(lines).toEqual(["check:agents: ok (2 agent files checked)"]);
  });

  it("prints each problem and returns 1 when a check fails", () => {
    const lines: string[] = [];
    const repo = fakeRepo([], {
      "AGENTS.md": "Mentions `docs/gone.md`.",
      "CLAUDE.md": GOOD_CLAUDE,
    });
    expect(runCheckAgents(repo, (line) => lines.push(line))).toBe(1);
    expect(lines).toEqual([
      "check:agents: AGENTS.md references `docs/gone.md`, which does not exist",
      "check:agents: .ai/lessons.md is missing",
      "check:agents: 2 problem(s); see scripts/agents/check.ts for the budgets",
    ]);
  });
});
