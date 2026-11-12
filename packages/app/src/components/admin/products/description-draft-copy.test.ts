import { DRAFT_DEADLINE_MS } from "@commerceos/ai";
import { describe, expect, it } from "vitest";

import { PENDING_TEXT, UNAVAILABLE_TEXT } from "./description-draft-copy";

// The pending copy promises a time the owner can wait. It must be the server's use-case
// deadline plus a fixed margin for the HTTP round trip and the client (review F-15).
const HTTP_AND_CLIENT_MARGIN_SECONDS = 5;

describe("description draft copy", () => {
  it("promises the use-case deadline plus the HTTP and client margin", () => {
    const promised = Number(/up to (\d+) seconds/.exec(PENDING_TEXT)?.[1]);

    expect(promised).toBe(DRAFT_DEADLINE_MS / 1000 + HTTP_AND_CLIENT_MARGIN_SECONDS);
  });

  it("uses the same generic unavailable sentence for provider faults (review Gemini 3)", () => {
    expect(UNAVAILABLE_TEXT).toBe("AI drafting is unavailable right now.");
  });
});
