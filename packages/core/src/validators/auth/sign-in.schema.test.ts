import { describe, expect, it } from "vitest";
import { signInSchema } from "./sign-in.schema";

describe("signInSchema", () => {
  it("normalises the email and keeps the password as typed", () => {
    expect(
      signInSchema.parse({ email: "  Owner@Example.COM ", password: " correct horse " }),
    ).toEqual({ email: "owner@example.com", password: " correct horse " });
  });

  it("rejects an invalid email, a short password and an overlong password", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "12345678" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(
      false,
    );
  });
});
