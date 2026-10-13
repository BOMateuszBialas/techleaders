import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import "@commerceos/database/testing";
import { BrowserSession } from "./agent-browser";

/** Failure screenshots land here; CI uploads the folder as an artifact. */
export const ARTIFACTS_DIR = "packages/app/e2e/artifacts";

/**
 * Opens one agent-browser session for the calling test file, closes it
 * afterwards and saves a full-page screenshot of every failing test.
 */
export function useBrowser(): () => BrowserSession {
  let browser: BrowserSession | undefined;

  beforeAll(() => {
    browser = BrowserSession.create(inject("baseUrl"));
  });

  beforeEach(({ task, onTestFailed }) => {
    onTestFailed(async () => {
      const name = task.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      await browser?.screenshot(`${ARTIFACTS_DIR}/${name}.png`);
    });
  });

  afterAll(async () => {
    await browser?.close();
  });

  return () => {
    if (!browser) throw new Error("useBrowser() is only available inside tests");
    return browser;
  };
}
