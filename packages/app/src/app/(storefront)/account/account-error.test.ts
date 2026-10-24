import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccountError from "./error";

describe("account error boundary (A24)", () => {
  it("shows a generic message and a retry button, never the error's text", () => {
    const html = renderToStaticMarkup(
      createElement(AccountError, {
        error: new Error("Failed to get session: connect ECONNREFUSED 10.0.0.5"),
        retry: () => {},
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Your account is unavailable");
    expect(html).toContain(">Try again<");
    expect(html).not.toContain("ECONNREFUSED");
  });
});
