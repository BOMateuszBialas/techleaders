import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

/** Pinned in `.ai/browsers/agent-browser.md` and `.ai/scripts/ensure-agent-browser.sh`. */
export const AGENT_BROWSER_VERSION = "v0.35.2";
const COMMAND_TIMEOUT_MS = 30_000;

/**
 * Runs the CLI and resolves on process *exit*, not on stdio close: the first
 * command of a session starts a background daemon that inherits the stdout
 * pipe, so waiting for the pipe to close would hang until the timeout.
 */
function runCli(bin: string, args: string[]): Promise<{ code: number | null; stdout: string }> {
  return new Promise((done, fail) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const stdout: string[] = [];
    const stderr: string[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));

    const timer = setTimeout(() => {
      child.kill();
      fail(new Error(`agent-browser ${args.join(" ")} timed out after ${COMMAND_TIMEOUT_MS} ms`));
    }, COMMAND_TIMEOUT_MS);

    child.once("error", (error) => {
      clearTimeout(timer);
      fail(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      // Let already-buffered output arrive, then stop listening to the shared pipe.
      setImmediate(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        const output = stdout.join("");
        if (output.trim() === "") {
          fail(new Error(`agent-browser ${args[0]} printed no output: ${stderr.join("")}`));
          return;
        }
        done({ code, stdout: output });
      });
    });
  });
}

const resultSchema = z.object({
  success: z.boolean(),
  data: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable().optional(),
});

/** The binary from `AGENT_BROWSER_BIN`, the install script's cache, or `PATH`. */
export function resolveAgentBrowserBin(): string {
  const fromEnv = process.env.AGENT_BROWSER_BIN;
  if (fromEnv) return fromEnv;

  const asset =
    process.platform === "win32"
      ? "agent-browser-win32-x64.exe"
      : `agent-browser-${process.platform}-${process.arch === "arm64" ? "arm64" : "x64"}`;
  const cacheRoot = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  const cached = join(cacheRoot, "agent-tools", "agent-browser", AGENT_BROWSER_VERSION, asset);
  return existsSync(cached) ? cached : "agent-browser";
}

export async function assertAgentBrowserInstalled(bin: string): Promise<void> {
  try {
    const { code } = await runCli(bin, ["--version"]);
    if (code !== 0) throw new Error(`exit code ${code}`);
  } catch (error) {
    throw new Error(
      `agent-browser not found ("${bin}"). Run \`bash .ai/scripts/ensure-agent-browser.sh\` ` +
        "or set AGENT_BROWSER_BIN.",
      { cause: error },
    );
  }
}

type Snapshot = { snapshot: string; refs: Record<string, { role: string; name: string }> };

/**
 * One isolated agent-browser session for a test file. Every command runs
 * without a shell and with `--json`; a failed command throws with the CLI's
 * error message.
 */
export class BrowserSession {
  private constructor(
    private readonly bin: string,
    private readonly session: string,
    private readonly baseUrl: string,
  ) {}

  static create(baseUrl: string): BrowserSession {
    return new BrowserSession(resolveAgentBrowserBin(), `e2e-${randomUUID()}`, baseUrl);
  }

  private async command(args: string[]): Promise<Record<string, unknown>> {
    // A failing command exits non-zero but still prints its JSON result.
    const { stdout } = await runCli(this.bin, ["--session", this.session, ...args, "--json"]);
    const result = resultSchema.parse(JSON.parse(stdout));
    if (!result.success) {
      throw new Error(`agent-browser ${args[0]} failed: ${result.error ?? "unknown error"}`);
    }
    return result.data ?? {};
  }

  async open(path: string): Promise<void> {
    await this.command(["open", new URL(path, this.baseUrl).toString()]);
  }

  async snapshot(): Promise<Snapshot> {
    const data = await this.command(["snapshot"]);
    return z
      .object({
        snapshot: z.string(),
        refs: z.record(z.string(), z.object({ role: z.string(), name: z.string() })),
      })
      .parse(data);
  }

  async clickRole(role: string, name: string): Promise<void> {
    await this.command(["find", "role", role, "click", "--name", name, "--exact"]);
  }

  /** Clicks the element matching a CSS selector, for links that repeat in several menus. */
  async click(selector: string): Promise<void> {
    await this.command(["click", selector]);
  }

  /** Chooses the option with this value in the `<select>` matching a CSS selector. */
  async select(selector: string, value: string): Promise<void> {
    await this.command(["select", selector, value]);
  }

  /**
   * Copies this session's cookies into `other`, so `other` acts as the same signed-in owner
   * (another tab, in effect) without a new sign-in, which the sign-in rate limit would count.
   */
  async shareCookiesWith(other: BrowserSession): Promise<void> {
    const data = await this.command(["cookies", "get"]);
    const { cookies } = z
      .object({ cookies: z.array(z.object({ name: z.string(), value: z.string() })) })
      .parse(data);
    for (const cookie of cookies) {
      await other.command(["cookies", "set", cookie.name, cookie.value, "--url", other.baseUrl]);
    }
  }

  /** Sets every `name=value` pair of a `Cookie` header on this session's base URL. */
  async setCookieHeader(header: string): Promise<void> {
    for (const pair of header.split("; ")) {
      const separator = pair.indexOf("=");
      await this.command([
        "cookies",
        "set",
        pair.slice(0, separator),
        pair.slice(separator + 1),
        "--url",
        this.baseUrl,
      ]);
    }
  }

  async setViewport(width: number, height: number): Promise<void> {
    await this.command(["set", "viewport", String(width), String(height)]);
  }

  /** Fills the input labelled exactly `label` (clears it first). */
  async fillLabel(label: string, text: string): Promise<void> {
    await this.command(["find", "label", label, "fill", text, "--exact"]);
  }

  async clearCookies(): Promise<void> {
    await this.command(["cookies", "clear"]);
  }

  async waitForText(text: string): Promise<void> {
    await this.command(["wait", "--text", text]);
  }

  async waitForUrl(pattern: string): Promise<void> {
    await this.command(["wait", "--url", pattern]);
  }

  async url(): Promise<string> {
    return z.object({ url: z.string() }).parse(await this.command(["get", "url"])).url;
  }

  async title(): Promise<string> {
    return z.object({ title: z.string() }).parse(await this.command(["get", "title"])).title;
  }

  async text(selector: string): Promise<string> {
    return z.object({ text: z.string() }).parse(await this.command(["get", "text", selector])).text;
  }

  /** The current value of an input or textarea (e.g. typed values kept after a failed submit). */
  async value(selector: string): Promise<string> {
    const data = await this.command(["get", "value", selector]);
    return z.object({ value: z.string() }).parse(data).value;
  }

  /** How many elements match a CSS selector (e.g. to prove no card field exists). */
  async count(selector: string): Promise<number> {
    const data = await this.command(["get", "count", selector]);
    return z.object({ count: z.number() }).parse(data).count;
  }

  /** Evaluates a JavaScript expression in the page and returns its JSON result. */
  async evaluate(expression: string): Promise<unknown> {
    return z.object({ result: z.unknown() }).parse(await this.command(["eval", expression])).result;
  }

  async screenshot(path: string): Promise<void> {
    const absolute = resolve(path);
    mkdirSync(dirname(absolute), { recursive: true });
    await this.command(["screenshot", "--full", absolute]);
  }

  async close(): Promise<void> {
    await this.command(["close"]);
  }
}
