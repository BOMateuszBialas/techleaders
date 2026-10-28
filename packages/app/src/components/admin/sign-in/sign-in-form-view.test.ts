import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SignInFormView } from "./sign-in-form-view";

const action = vi.fn();

function render(errorMessage: string | null) {
  return renderToStaticMarkup(createElement(SignInFormView, { action, errorMessage }));
}

describe("SignInFormView", () => {
  it("renders the email and password fields with their names and autocomplete values", () => {
    const html = render(null);
    expect(html).toContain('name="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('minLength="8"');
    expect(html).toContain('maxLength="128"');
    expect(html).toContain('data-slot="field-label"');
    expect(html).toContain(">Sign in</button>");
  });

  it("shows no alert before an error", () => {
    expect(render(null)).not.toContain('role="alert"');
  });

  it("shows the fixed error message as a form-level alert", () => {
    const html = render("Invalid email or password.");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Invalid email or password.");
  });
});
