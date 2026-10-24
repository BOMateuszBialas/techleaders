import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInCustomer, signOutCustomer, signUpCustomer } from "./customer-auth.action";
import { attemptCustomerSignIn } from "./customer-sign-in";
import { attemptCustomerSignOut } from "./customer-sign-out";
import { attemptCustomerSignUp } from "./customer-sign-up";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("./customer-sign-in", () => ({ attemptCustomerSignIn: vi.fn() }));
vi.mock("./customer-sign-up", () => ({ attemptCustomerSignUp: vi.fn() }));
vi.mock("./customer-sign-out", () => ({ attemptCustomerSignOut: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

function form(from?: string) {
  const data = new FormData();
  if (from !== undefined) data.set("from", from);
  return data;
}

describe("signUpCustomer action", () => {
  it("redirects to My orders, or to checkout only for from=checkout (A17)", async () => {
    vi.mocked(attemptCustomerSignUp).mockResolvedValue("ok");
    await expect(signUpCustomer(form())).rejects.toThrow("NEXT_REDIRECT /account/orders");
    await expect(signUpCustomer(form("checkout"))).rejects.toThrow("NEXT_REDIRECT /checkout");
    await expect(signUpCustomer(form("https://evil.example"))).rejects.toThrow(
      "NEXT_REDIRECT /account/orders",
    );
  });

  it("redirects back with a fixed error code, keeping only from=checkout", async () => {
    vi.mocked(attemptCustomerSignUp).mockResolvedValue("refused");
    await expect(signUpCustomer(form("checkout"))).rejects.toThrow(
      "NEXT_REDIRECT /account/sign-up?error=refused&from=checkout",
    );
    vi.mocked(attemptCustomerSignUp).mockResolvedValue("rate_limited");
    await expect(signUpCustomer(form("/admin"))).rejects.toThrow(
      "NEXT_REDIRECT /account/sign-up?error=rate_limited",
    );
  });
});

describe("signInCustomer action", () => {
  it("redirects to My orders or checkout on success", async () => {
    vi.mocked(attemptCustomerSignIn).mockResolvedValue("ok");
    await expect(signInCustomer(form())).rejects.toThrow("NEXT_REDIRECT /account/orders");
    await expect(signInCustomer(form("checkout"))).rejects.toThrow("NEXT_REDIRECT /checkout");
  });

  it("redirects back with a fixed error code, and the redirect is never swallowed", async () => {
    vi.mocked(attemptCustomerSignIn).mockResolvedValue("invalid");
    await expect(signInCustomer(form())).rejects.toThrow(
      "NEXT_REDIRECT /account/sign-in?error=invalid",
    );
    vi.mocked(attemptCustomerSignIn).mockResolvedValue("unavailable");
    await expect(signInCustomer(form("checkout"))).rejects.toThrow(
      "NEXT_REDIRECT /account/sign-in?error=unavailable&from=checkout",
    );
  });
});

describe("signOutCustomer action", () => {
  it("revokes the customer session, then redirects to the store", async () => {
    await expect(signOutCustomer()).rejects.toThrow("NEXT_REDIRECT /");
    expect(attemptCustomerSignOut).toHaveBeenCalled();
  });
});
