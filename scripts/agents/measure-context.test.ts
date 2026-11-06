import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectMeasurement,
  countLines,
  estimateTokens,
  frontmatterDescription,
  mcpServerNames,
  measureText,
  missingFile,
  renderMeasurement,
  type ContextMeasurement,
} from "./measure-context";

describe("estimateTokens", () => {
  it("counts characters / 4, rounded up, with code points", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("ąęść")).toBe(1);
  });
});

describe("countLines", () => {
  it("counts lines and does not count a final newline as a new line", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a")).toBe(1);
    expect(countLines("a\n")).toBe(1);
    expect(countLines("a\nb")).toBe(2);
  });
});

describe("measureText and missingFile", () => {
  it("reports bytes (UTF-8), lines, characters and tokens", () => {
    expect(measureText("x.md", "zażółć\n")).toEqual({
      path: "x.md",
      present: true,
      bytes: 11,
      lines: 1,
      chars: 7,
      tokens: 2,
    });
  });

  it("reports a missing file with zeros", () => {
    expect(missingFile("y.md")).toEqual({
      path: "y.md",
      present: false,
      bytes: 0,
      lines: 0,
      chars: 0,
      tokens: 0,
    });
  });
});

describe("frontmatterDescription", () => {
  it("returns undefined without frontmatter or without a description", () => {
    expect(frontmatterDescription("# No frontmatter")).toBeUndefined();
    expect(frontmatterDescription("---\nname: x\n---\nbody")).toBeUndefined();
  });

  it("reads a plain scalar and unquotes a quoted one", () => {
    expect(frontmatterDescription("---\ndescription: Use when X\n---\n")).toBe("Use when X");
    expect(frontmatterDescription('---\ndescription: "Use when Y"\n---\n')).toBe("Use when Y");
    expect(frontmatterDescription("---\ndescription: 'Use when Z'\n---\n")).toBe("Use when Z");
  });

  it("keeps a lone or unclosed quote as it is", () => {
    expect(frontmatterDescription('---\ndescription: "\n---\n')).toBe('"');
    expect(frontmatterDescription('---\ndescription: "open\n---\n')).toBe('"open');
  });

  it("folds a folded block scalar into one line and keeps lines of a literal block", () => {
    expect(
      frontmatterDescription("---\ndescription: >-\n  first part\n\n  second part\nname: x\n---\n"),
    ).toBe("first part second part");
    expect(frontmatterDescription("---\ndescription: |\n  line one\n  line two\n---\n")).toBe(
      "line one\nline two",
    );
  });
});

describe("mcpServerNames", () => {
  it("returns the keys of mcpServers", () => {
    expect(mcpServerNames('{"mcpServers":{"a":{},"b":{}}}')).toEqual(["a", "b"]);
  });

  it("returns no names for other shapes", () => {
    expect(mcpServerNames("[]")).toEqual([]);
    expect(mcpServerNames("null")).toEqual([]);
    expect(mcpServerNames("3")).toEqual([]);
    expect(mcpServerNames("{}")).toEqual([]);
    expect(mcpServerNames('{"mcpServers":null}')).toEqual([]);
    expect(mcpServerNames('{"mcpServers":"x"}')).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => mcpServerNames("{")).toThrow();
  });
});

let root: string;
let home: string;

function put(base: string, relative: string, text: string): void {
  const full = join(base, relative);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "measure-context-"));
  home = mkdtempSync(join(tmpdir(), "measure-home-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

describe("collectMeasurement", () => {
  it("measures the instruction files, package files, skills and MCP of a repository", () => {
    put(root, "AGENTS.md", "# Router\n");
    put(root, "CLAUDE.md", "@AGENTS.md\n");
    put(root, "ENGINEERING_STANDARDS.md", "standards\n");
    put(root, "packages/app/AGENTS.md", "app\n");
    put(root, "packages/core/src/index.ts", "export {};\n");
    put(root, "packages/notes.txt", "not a package\n");
    put(root, ".ai/skills/one/SKILL.md", "---\ndescription: >\n  Use when one\n---\nbody\n");
    put(root, ".ai/skills/one/notes.md", "not a skill\n");
    put(root, ".agents/skills/two/SKILL.md", "no frontmatter\n");
    put(root, ".mcp.json", '{"mcpServers":{"figma":{}}}');
    put(home, ".claude/skills/three/SKILL.md", "---\ndescription: Personal\n---\n");

    const measurement = collectMeasurement(root, home);

    expect(measurement.sessionStart.map((file) => [file.path, file.present])).toEqual([
      ["AGENTS.md", true],
      ["CLAUDE.md", true],
    ]);
    expect(measurement.taskStart.map((file) => file.present)).toEqual([true, false, false]);
    expect(measurement.onDemand).toEqual([missingFile(".ai/specs/2026-10-13-commerceos-mvp.md")]);
    expect(measurement.lazy.map((file) => [file.path, file.present])).toEqual([
      ["packages/app/AGENTS.md", true],
      ["packages/core/AGENTS.md", false],
    ]);
    expect(measurement.skills).toEqual([
      {
        label: ".ai/skills",
        skillFiles: 1,
        withoutDescription: 0,
        descriptionChars: 12,
        descriptionTokens: 3,
        skillBytes: 43,
      },
      {
        label: ".agents/skills",
        skillFiles: 1,
        withoutDescription: 1,
        descriptionChars: 0,
        descriptionTokens: 0,
        skillBytes: 15,
      },
      {
        label: "~/.claude/skills (personal, counts only)",
        skillFiles: 1,
        withoutDescription: 0,
        descriptionChars: 8,
        descriptionTokens: 2,
        skillBytes: 30,
      },
    ]);
    expect(measurement.mcp).toEqual({ status: "ok", servers: ["figma"] });
  });

  it("reports absent packages, skill folders and MCP file, and invalid MCP JSON", () => {
    expect(collectMeasurement(root, home)).toMatchObject({
      lazy: [],
      mcp: { status: "absent" },
      skills: [{ skillFiles: 0 }, { skillFiles: 0 }, { skillFiles: 0 }],
    });

    put(root, ".mcp.json", "{");
    expect(collectMeasurement(root, home).mcp).toMatchObject({ status: "invalid" });
  });
});

describe("renderMeasurement", () => {
  it("renders every section, with missing files, skills and MCP states", () => {
    const measurement: ContextMeasurement = {
      sessionStart: [measureText("AGENTS.md", "abcdefgh\n"), missingFile("CLAUDE.md")],
      taskStart: [measureText("SDLC.md", "abcd")],
      onDemand: [missingFile("spec.md")],
      lazy: [measureText("packages/app/AGENTS.md", "x")],
      skills: [
        {
          label: ".ai/skills",
          skillFiles: 2,
          withoutDescription: 1,
          descriptionChars: 40,
          descriptionTokens: 10,
          skillBytes: 900,
        },
      ],
      mcp: { status: "ok", servers: ["a", "b"] },
    };
    const text = renderMeasurement(measurement);
    expect(text).toContain("| `AGENTS.md` | 9 | 1 | 9 | 3 |");
    expect(text).toContain("| `CLAUDE.md` | missing | – | – | – |");
    expect(text).toContain("Session start total: 3 tokens (est.).");
    expect(text).toContain("Task start total (session start + task start files): 4 tokens (est.).");
    expect(text).toContain("| .ai/skills | 2 | 1 | 40 | 10 | 900 |");
    expect(text).toContain("Skill descriptions total: 10 tokens (est.).");
    expect(text).toContain("Servers in the project `.mcp.json`: 2 (a, b).");
    expect(text).toContain("to be measured by the owner");
  });

  it("renders the absent and invalid MCP states and an empty server list", () => {
    const base: ContextMeasurement = {
      sessionStart: [],
      taskStart: [],
      onDemand: [],
      lazy: [],
      skills: [],
      mcp: { status: "absent" },
    };
    expect(renderMeasurement(base)).toContain("No project `.mcp.json`");
    expect(renderMeasurement({ ...base, mcp: { status: "invalid" } })).toContain(
      "not valid JSON; its servers were not counted.",
    );
    expect(renderMeasurement({ ...base, mcp: { status: "ok", servers: [] } })).toContain(
      "Servers in the project `.mcp.json`: 0.",
    );
  });
});
