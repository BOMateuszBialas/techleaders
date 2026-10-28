import { describe, expect, it, vi } from "vitest";
import StorefrontError from "./error";

describe("storefront error boundary", () => {
  it("hands the boundary's reset to the view as the retry action", () => {
    const reset = vi.fn();
    const element = StorefrontError({ reset });

    expect(element.props).toEqual({ onRetry: reset });
  });
});
