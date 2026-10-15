import { describe, expect, it, vi } from "vitest";
import { getAuth } from "@/server/container";
import { GET, POST } from "./route";

vi.mock("@/server/container", () => ({ getAuth: vi.fn() }));

describe("/api/auth/[...all]", () => {
  it("hands GET and POST to the Better Auth instance resolved per request", async () => {
    const handler = vi.fn(async (request: Request) => new Response(request.method));
    // Test double: toNextJsHandler uses only the handler.
    vi.mocked(getAuth).mockReturnValue({ handler } as never);

    expect(await (await GET(new Request("http://x/api/auth/get-session"))).text()).toBe("GET");
    expect(
      await (await POST(new Request("http://x/api/auth/sign-out", { method: "POST" }))).text(),
    ).toBe("POST");
    expect(getAuth).toHaveBeenCalledTimes(2);
  });
});
