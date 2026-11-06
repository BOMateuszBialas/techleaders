import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Measures the agent context that the repository puts on disk: the instruction files, the skill
// descriptions and the MCP servers of the project. Read-only. Tokens are estimates (characters / 4,
// rounded up), not a tokenizer count. Run through `npx tsx scripts/measure-context.ts` from the
// repo root (entry file; the pure logic and the disk reads live here so the unit tests cover them).

/** Loaded at session start by Claude Code: the root router and the CLAUDE.md import. */
export const SESSION_START_FILES: readonly string[] = ["AGENTS.md", "CLAUDE.md"];
/** Read for a task (root routing table, "Any task" and "New feature" rows). */
export const TASK_START_FILES: readonly string[] = [
  "ENGINEERING_STANDARDS.md",
  "SDLC.md",
  ".ai/lessons.md",
];
/** Read only when a task needs them. */
export const ON_DEMAND_FILES: readonly string[] = [".ai/specs/2026-10-13-commerceos-mvp.md"];
/** Skill folders that are searched for SKILL.md files; `home` is the user's home directory. */
export const SKILL_LOCATIONS = [
  { label: ".ai/skills", path: ".ai/skills" },
  { label: ".agents/skills", path: ".agents/skills" },
  {
    label: "~/.claude/skills (personal, counts only)",
    path: join(".claude", "skills"),
    home: true,
  },
] as const;

export interface FileMeasure {
  path: string;
  present: boolean;
  bytes: number;
  lines: number;
  chars: number;
  tokens: number;
}

export interface SkillLocationMeasure {
  label: string;
  skillFiles: number;
  withoutDescription: number;
  descriptionChars: number;
  descriptionTokens: number;
  skillBytes: number;
}

export type McpMeasure =
  { status: "absent" } | { status: "invalid" } | { status: "ok"; servers: string[] };

export interface ContextMeasurement {
  sessionStart: FileMeasure[];
  taskStart: FileMeasure[];
  onDemand: FileMeasure[];
  lazy: FileMeasure[];
  skills: SkillLocationMeasure[];
  mcp: McpMeasure;
}

/** Characters are counted as code points; the estimate is characters / 4, rounded up. */
export function estimateTokens(text: string): number {
  return Math.ceil([...text].length / 4);
}

/** Lines of a text; a final newline ends the last line and does not start a new one. */
export function countLines(text: string): number {
  if (text === "") {
    return 0;
  }
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

export function measureText(path: string, text: string): FileMeasure {
  return {
    path,
    present: true,
    bytes: Buffer.byteLength(text, "utf8"),
    lines: countLines(text),
    chars: [...text].length,
    tokens: estimateTokens(text),
  };
}

export function missingFile(path: string): FileMeasure {
  return { path, present: false, bytes: 0, lines: 0, chars: 0, tokens: 0 };
}

function unquote(value: string): string {
  const quote = value.charAt(0);
  const isQuoted = (quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2;
  return isQuoted ? value.slice(1, -1) : value;
}

/**
 * The `description` of a SKILL.md frontmatter: a plain or quoted scalar, or a block scalar
 * (`>` folded, `|` literal) made of the indented lines below the key. Undefined when the file has
 * no frontmatter or no description.
 */
export function frontmatterDescription(markdown: string): string | undefined {
  const body = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)?.[1];
  if (body === undefined) {
    return undefined;
  }
  const lines = body.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith("description:"));
  const keyLine = lines[index];
  if (keyLine === undefined) {
    return undefined;
  }
  const value = keyLine.slice("description:".length).trim();
  if (!/^[>|][-+]?$/.test(value)) {
    return unquote(value);
  }
  const block: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (line.length > 0 && !/^\s/.test(line)) {
      break;
    }
    block.push(line.trim());
  }
  return block.filter((line) => line.length > 0).join(value.startsWith(">") ? " " : "\n");
}

/** The server names of a project `.mcp.json` (its `mcpServers` keys). Throws on invalid JSON. */
export function mcpServerNames(json: string): string[] {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || !("mcpServers" in parsed)) {
    return [];
  }
  const servers = parsed.mcpServers;
  return typeof servers === "object" && servers !== null ? Object.keys(servers) : [];
}

/** Every SKILL.md below a folder (symbolic links are not followed). */
function findSkillFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findSkillFiles(full));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      found.push(full);
    }
  }
  return found;
}

function skillLocation(label: string, dir: string): SkillLocationMeasure {
  const measure: SkillLocationMeasure = {
    label,
    skillFiles: 0,
    withoutDescription: 0,
    descriptionChars: 0,
    descriptionTokens: 0,
    skillBytes: 0,
  };
  for (const file of findSkillFiles(dir)) {
    const text = readFileSync(file, "utf8");
    measure.skillFiles += 1;
    measure.skillBytes += Buffer.byteLength(text, "utf8");
    const description = frontmatterDescription(text);
    if (description === undefined) {
      measure.withoutDescription += 1;
    } else {
      measure.descriptionChars += [...description].length;
      measure.descriptionTokens += estimateTokens(description);
    }
  }
  return measure;
}

function readRepoText(root: string, path: string): string | undefined {
  const full = join(root, path);
  return existsSync(full) && statSync(full).isFile() ? readFileSync(full, "utf8") : undefined;
}

function measureRepoFile(root: string, path: string): FileMeasure {
  const text = readRepoText(root, path);
  return text === undefined ? missingFile(path) : measureText(path, text);
}

function packageAgentPaths(root: string): string[] {
  const packages = join(root, "packages");
  if (!existsSync(packages)) {
    return [];
  }
  return readdirSync(packages, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}/AGENTS.md`);
}

function measureMcp(root: string): McpMeasure {
  const text = readRepoText(root, ".mcp.json");
  if (text === undefined) {
    return { status: "absent" };
  }
  try {
    return { status: "ok", servers: mcpServerNames(text) };
  } catch {
    return { status: "invalid" };
  }
}

/** Measures the repository at `root`; `home` is the user's home directory (only counted). */
export function collectMeasurement(root: string, home: string): ContextMeasurement {
  return {
    sessionStart: SESSION_START_FILES.map((path) => measureRepoFile(root, path)),
    taskStart: TASK_START_FILES.map((path) => measureRepoFile(root, path)),
    onDemand: ON_DEMAND_FILES.map((path) => measureRepoFile(root, path)),
    lazy: packageAgentPaths(root).map((path) => measureRepoFile(root, path)),
    skills: SKILL_LOCATIONS.map((location) =>
      skillLocation(
        location.label,
        "home" in location ? join(home, location.path) : join(root, location.path),
      ),
    ),
    mcp: measureMcp(root),
  };
}

function sumTokens(files: readonly FileMeasure[]): number {
  return files.reduce((total, file) => total + file.tokens, 0);
}

function fileRow(file: FileMeasure): string {
  if (!file.present) {
    return `| \`${file.path}\` | missing | – | – | – |`;
  }
  return `| \`${file.path}\` | ${file.bytes} | ${file.lines} | ${file.chars} | ${file.tokens} |`;
}

function skillRow(skill: SkillLocationMeasure): string {
  return `| ${skill.label} | ${skill.skillFiles} | ${skill.withoutDescription} | ${skill.descriptionChars} | ${skill.descriptionTokens} | ${skill.skillBytes} |`;
}

function mcpLines(mcp: McpMeasure): string[] {
  if (mcp.status === "absent") {
    return ["No project `.mcp.json` in the repository. Servers come from the user's account."];
  }
  if (mcp.status === "invalid") {
    return ["The project `.mcp.json` is not valid JSON; its servers were not counted."];
  }
  return [
    `Servers in the project \`.mcp.json\`: ${mcp.servers.length}${mcp.servers.length > 0 ? ` (${mcp.servers.join(", ")})` : ""}.`,
  ];
}

/** The Markdown report printed by the script (no timestamp, so two runs on one tree match). */
export function renderMeasurement(measurement: ContextMeasurement): string {
  const fileHeader =
    "| File | Bytes | Lines | Characters | Tokens (est.) |\n|---|---:|---:|---:|---:|";
  const skillHeader =
    "| Location | Skill files | Without description | Description characters | Description tokens (est.) | SKILL.md bytes |\n|---|---:|---:|---:|---:|---:|";
  const sessionTokens = sumTokens(measurement.sessionStart);
  const taskTokens = sessionTokens + sumTokens(measurement.taskStart);
  const skillTokens = measurement.skills.reduce(
    (total, skill) => total + skill.descriptionTokens,
    0,
  );
  return [
    "# Context measurement (AS-IS)",
    "",
    "Tokens are estimates: characters / 4, rounded up. Characters are code points. Not a tokenizer count.",
    "",
    "## Session start (loaded by Claude Code)",
    "",
    fileHeader,
    ...measurement.sessionStart.map(fileRow),
    "",
    `Session start total: ${sessionTokens} tokens (est.).`,
    "",
    "## Task start (read for a task, per the root routing table)",
    "",
    fileHeader,
    ...measurement.taskStart.map(fileRow),
    "",
    `Task start total (session start + task start files): ${taskTokens} tokens (est.).`,
    "",
    "## On demand",
    "",
    fileHeader,
    ...measurement.onDemand.map(fileRow),
    "",
    "## Lazy: package AGENTS.md (loaded when work is in that package)",
    "",
    fileHeader,
    ...measurement.lazy.map(fileRow),
    "",
    "## Skills (count and description size only)",
    "",
    skillHeader,
    ...measurement.skills.map(skillRow),
    "",
    `Skill descriptions total: ${skillTokens} tokens (est.). The skill names and descriptions are part of the session start in Claude Code.`,
    "",
    "## MCP",
    "",
    ...mcpLines(measurement.mcp),
    "",
    "## Not measured by this script",
    "",
    "- `/context` (the live session figure): to be measured by the owner in a fresh session.",
    "- MCP servers and tools of the user's account and the session's deferred tool list: the script cannot read the session.",
    "",
  ].join("\n");
}
