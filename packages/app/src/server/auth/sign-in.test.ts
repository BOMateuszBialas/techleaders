import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuth } from "../container";
import { getEnv } from "../env";
import { logger } from "../logger";
import { attemptSignIn, attemptSignOut } from "./sign-in";

const handler = vi.fn<(request: Request) => Promise<Response>>();
const signOut = vi.fn();
const cookieStore = { set: vi.fn() };
let incoming = new Headers();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => incoming),
  cookies: vi.fn(async () => cookieStore),
}));
vi.mock("../container", () => ({ getAuth: vi.fn() }));
vi.mock("../env", () => ({ getEnv: vi.fn() }));

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}
const valid = () => form("Owner@Example.com", "correct-horse");

beforeEach(() => {
  vi.clearAllMocks();
  incoming = new Headers({
    origin: "https://shop.example",
    "user-agent": "test-agent",
    "x-forwarded-for": "1.2.3.4",
  });
  // Test doubles: these modules use only the members faked here.
  vi.mocked(getAuth).mockReturnValue({ handler, api: { signOut } } as never);
  vi.mocked(getEnv).mockReturnValue({
    APP_URL: "https://shop.example",
    AUTH_TRUSTED_IP_HEADER: undefined,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

describe("attemptSignIn", () => {
  it("rejects invalid input without calling Better Auth", async () => {
    await expect(attemptSignIn(form("not-an-email", "x"))).resolves.toBe("invalid");
    expect(handler).not.toHaveBeenCalled();
  });

  it("posts through the HTTP handler (rate limit + origin check) and copies the session cookie", async () => {
    handler.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "u1" } }), {
        status: 200,
        headers: {
          "set-cookie":
            "better-auth.session_token=tok.sig; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax",
        },
      }),
    );
    await expect(attemptSignIn(valid())).resolves.toBe("ok");

    const request = handler.mock.calls[0]![0];
    expect(request.url).toBe("https://shop.example/api/auth/sign-in/email");
    expect(request.method).toBe("POST");
    expect(request.headers.get("origin")).toBe("https://shop.example");
    expect(request.headers.get("user-agent")).toBe("test-agent");
    // Never forwarded unless it is the configured trusted IP header.
    expect(request.headers.get("x-forwarded-for")).toBeNull();
    expect(await request.json()).toEqual({ email: "owner@example.com", password: "correct-horse" });

    expect(cookieStore.set).toHaveBeenCalledWith(
      "better-auth.session_token",
      "tok.sig",
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 28800 }),
    );
    expect(logger.info).toHaveBeenCalledWith("Admin signed in", {
      event: "auth.sign_in",
      userId: "u1",
    });
  });

  it("forwards only the configured trusted IP header", async () => {
    vi.mocked(getEnv).mockReturnValue({
      APP_URL: "https://shop.example",
      AUTH_TRUSTED_IP_HEADER: "x-real-ip",
    } as never);
    incoming.set("x-real-ip", "203.0.113.9");
    handler.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(attemptSignIn(valid())).resolves.toBe("ok");
    expect(handler.mock.calls[0]![0].headers.get("x-real-ip")).toBe("203.0.113.9");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("maps 401 to the generic invalid message and logs no email", async () => {
    handler.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(attemptSignIn(valid())).resolves.toBe("invalid");
    expect(logger.warn).toHaveBeenCalledWith("Admin sign-in rejected", {
      event: "auth.sign_in_failed",
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("maps 429 to rate_limited", async () => {
    handler.mockResolvedValue(new Response("{}", { status: 429 }));
    await expect(attemptSignIn(valid())).resolves.toBe("rate_limited");
  });

  it("maps any other failure, or a thrown error, to unavailable and logs it", async () => {
    handler.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(attemptSignIn(valid())).resolves.toBe("unavailable");
    expect(logger.error).toHaveBeenCalledWith("Admin sign-in failed", {
      event: "auth.sign_in_error",
      status: 403,
    });

    handler.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(attemptSignIn(valid())).resolves.toBe("unavailable");
  });
});

describe("attemptSignOut", () => {
  it("revokes the current session with this request's headers", async () => {
    await attemptSignOut();
    expect(signOut).toHaveBeenCalledWith({ headers: incoming });
  });
});
