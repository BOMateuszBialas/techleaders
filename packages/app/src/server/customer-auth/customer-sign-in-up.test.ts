import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomerAuth } from "../container";
import { getEnv } from "../env";
import { logger } from "../logger";
import { attemptCustomerSignIn } from "./customer-sign-in";
import { attemptCustomerSignOut } from "./customer-sign-out";
import { attemptCustomerSignUp } from "./customer-sign-up";

const handler = vi.fn<(request: Request) => Promise<Response>>();
const signOut = vi.fn();
const cookieStore = { set: vi.fn() };
let incoming = new Headers();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => incoming),
  cookies: vi.fn(async () => cookieStore),
}));
vi.mock("../container", () => ({ getCustomerAuth: vi.fn() }));
vi.mock("../env", () => ({ getEnv: vi.fn() }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}
const valid = (extra: Record<string, string> = {}) =>
  form({ email: "Shopper@Example.com", password: "correct-horse", ...extra });
const sessionCookie =
  "commerceos-customer.session_token=tok.sig; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax";
const okResponse = () =>
  new Response(JSON.stringify({ token: "t", user: { id: "c1" } }), {
    status: 200,
    headers: { "set-cookie": sessionCookie },
  });

beforeEach(() => {
  vi.clearAllMocks();
  incoming = new Headers({
    origin: "https://shop.example",
    "user-agent": "test-agent",
    "x-forwarded-for": "1.2.3.4",
    cookie: "better-auth.session_token=owner",
  });
  // Test doubles: these modules use only the members faked here.
  vi.mocked(getCustomerAuth).mockReturnValue({ handler, api: { signOut } } as never);
  vi.mocked(getEnv).mockReturnValue({
    APP_URL: "https://shop.example",
    AUTH_TRUSTED_IP_HEADER: undefined,
  } as never);
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

const logText = () =>
  JSON.stringify([
    vi.mocked(logger.info).mock.calls,
    vi.mocked(logger.warn).mock.calls,
    vi.mocked(logger.error).mock.calls,
  ]);

describe("attemptCustomerSignIn", () => {
  it("rejects invalid input without calling Better Auth", async () => {
    await expect(attemptCustomerSignIn(form({ email: "nope", password: "x" }))).resolves.toBe(
      "invalid",
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("posts through the customer HTTP handler and copies only its session cookie", async () => {
    handler.mockResolvedValue(okResponse());
    await expect(attemptCustomerSignIn(valid())).resolves.toBe("ok");

    const request = handler.mock.calls[0]![0];
    expect(request.url).toBe("https://shop.example/api/customer-auth/sign-in/email");
    expect(request.method).toBe("POST");
    expect(request.headers.get("origin")).toBe("https://shop.example");
    expect(request.headers.get("x-forwarded-for")).toBeNull();
    expect(await request.json()).toEqual({
      email: "shopper@example.com",
      password: "correct-horse",
    });
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "commerceos-customer.session_token",
      "tok.sig",
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 28800 }),
    );
    expect(logger.info).toHaveBeenCalledWith("Customer signed in", {
      event: "customer_auth.sign_in",
      customerId: "c1",
    });
    expect(logText()).not.toContain("shopper@example.com");
  });

  it("maps 401 to invalid, 429 to rate_limited and anything else to unavailable", async () => {
    handler.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    await expect(attemptCustomerSignIn(valid())).resolves.toBe("invalid");
    expect(logger.warn).toHaveBeenCalledWith("Customer sign-in rejected", {
      event: "customer_auth.sign_in_failed",
    });
    handler.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(attemptCustomerSignIn(valid())).resolves.toBe("rate_limited");
    handler.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    await expect(attemptCustomerSignIn(valid())).resolves.toBe("unavailable");
    expect(logger.error).toHaveBeenCalledWith("Customer sign-in failed", {
      event: "customer_auth.sign_in_error",
      status: 403,
    });
    handler.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(attemptCustomerSignIn(valid())).resolves.toBe("unavailable");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("attemptCustomerSignUp (AC1, A7, A9)", () => {
  it("forwards only the email, the password and the fixed name, whatever the form holds", async () => {
    handler.mockResolvedValue(okResponse());
    const outcome = await attemptCustomerSignUp(
      valid({ role: "owner", name: "Mallory", image: "https://evil.example/x.png", from: "x" }),
    );
    expect(outcome).toBe("ok");
    const request = handler.mock.calls[0]![0];
    expect(request.url).toBe("https://shop.example/api/customer-auth/sign-up/email");
    expect(await request.json()).toEqual({
      email: "shopper@example.com",
      password: "correct-horse",
      name: "Customer",
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      "commerceos-customer.session_token",
      "tok.sig",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(logger.info).toHaveBeenCalledWith("Customer signed up", {
      event: "customer_auth.sign_up",
      customerId: "c1",
    });
  });

  it("forwards the configured trusted IP header only", async () => {
    vi.mocked(getEnv).mockReturnValue({
      APP_URL: "https://shop.example",
      AUTH_TRUSTED_IP_HEADER: "x-real-ip",
    } as never);
    incoming.set("x-real-ip", "203.0.113.9");
    handler.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(attemptCustomerSignUp(valid())).resolves.toBe("ok");
    expect(handler.mock.calls[0]![0].headers.get("x-real-ip")).toBe("203.0.113.9");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("turns invalid input and every 4xx refusal into one refused outcome that logs no cause", async () => {
    await expect(attemptCustomerSignUp(form({ email: "a@b.co", password: "short" }))).resolves.toBe(
      "refused",
    );
    expect(handler).not.toHaveBeenCalled();
    for (const status of [400, 403, 422]) {
      handler.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }), { status }),
      );
      await expect(attemptCustomerSignUp(valid())).resolves.toBe("refused");
    }
    expect(logger.warn).toHaveBeenCalledWith("Customer sign-up refused", {
      event: "customer_auth.sign_up_refused",
    });
    expect(logText()).not.toMatch(/422|USER_ALREADY_EXISTS|shopper@example\.com/);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("maps 429 to rate_limited and a 5xx or a thrown error to unavailable", async () => {
    handler.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(attemptCustomerSignUp(valid())).resolves.toBe("rate_limited");
    handler.mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(attemptCustomerSignUp(valid())).resolves.toBe("unavailable");
    expect(logger.error).toHaveBeenCalledWith("Customer sign-up failed", {
      event: "customer_auth.sign_up_error",
      status: 500,
    });
    handler.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(attemptCustomerSignUp(valid())).resolves.toBe("unavailable");
  });
});

describe("attemptCustomerSignOut", () => {
  it("revokes the current customer session with this request's headers", async () => {
    await attemptCustomerSignOut();
    expect(signOut).toHaveBeenCalledWith({ headers: incoming });
  });
});
