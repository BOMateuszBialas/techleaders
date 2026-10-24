import { describe, expect, it, vi } from "vitest";
import { getCustomerAuth } from "@/server/container";
import { CUSTOMER_DISABLED_PATHS } from "@/server/customer-auth/create-customer-auth";
import { GET, POST } from "./route";

vi.mock("@/server/container", () => ({ getCustomerAuth: vi.fn() }));

const BASE = "http://x/api/customer-auth";
const handler = vi.fn(async (request: Request) => new Response(`${request.method} ok`));
// Test double: toNextJsHandler uses only the handler.
vi.mocked(getCustomerAuth).mockReturnValue({ handler } as never);

const get = (path: string) => GET(new Request(`${BASE}${path}`));
const post = (path: string) => POST(new Request(`${BASE}${path}`, { method: "POST" }));

describe("/api/customer-auth/[...all] (E07 spec A1, spike h)", () => {
  it("hands the four allowed method-and-path pairs to the customer instance", async () => {
    expect(await (await post("/sign-up/email")).text()).toBe("POST ok");
    expect(await (await post("/sign-in/email")).text()).toBe("POST ok");
    expect(await (await post("/sign-out")).text()).toBe("POST ok");
    expect(await (await get("/get-session")).text()).toBe("GET ok");
    expect(getCustomerAuth).toHaveBeenCalledTimes(4);
  });

  it("answers 404 to anything else without resolving the instance", async () => {
    vi.mocked(getCustomerAuth).mockClear();
    const refused = [
      // The right path with the wrong method.
      await get("/sign-in/email"),
      await get("/sign-up/email"),
      await get("/sign-out"),
      await post("/get-session"),
      // Parameterised paths `disabledPaths` cannot match.
      await get("/callback/credential"),
      await get("/reset-password/some-token"),
      // Path variants.
      await post("/sign-in/email/"),
      await post("/SIGN-IN/EMAIL"),
      await post("//sign-in/email"),
      await post("/%73ign-in/email"),
      await post("/sign-in%2Femail"),
      await post("/sign-in/email?x=1"),
      await post(""),
      // Every disabled library path, with both methods.
      ...(await Promise.all(CUSTOMER_DISABLED_PATHS.flatMap((path) => [get(path), post(path)]))),
    ];
    for (const response of refused) {
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    }
    expect(getCustomerAuth).not.toHaveBeenCalled();
  });
});
