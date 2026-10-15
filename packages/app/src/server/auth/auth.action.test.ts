import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "./auth.action";
import { attemptSignIn, attemptSignOut } from "./sign-in";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("./sign-in", () => ({
  ADMIN_HOME: "/admin",
  attemptSignIn: vi.fn(),
  attemptSignOut: vi.fn(),
}));
vi.mock("./require-admin", () => ({ SIGN_IN_PAGE: "/admin/sign-in" }));

beforeEach(() => vi.clearAllMocks());

describe("signIn action", () => {
  it("redirects to the dashboard on success", async () => {
    vi.mocked(attemptSignIn).mockResolvedValue("ok");
    await expect(signIn(new FormData())).rejects.toThrow("NEXT_REDIRECT /admin");
  });

  it("redirects back with a fixed error code, and the redirect is never swallowed", async () => {
    vi.mocked(attemptSignIn).mockResolvedValue("rate_limited");
    await expect(signIn(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT /admin/sign-in?error=rate_limited",
    );
  });
});

describe("signOut action", () => {
  it("revokes the session, then redirects to the sign-in page", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT /admin/sign-in");
    expect(attemptSignOut).toHaveBeenCalled();
  });
});
