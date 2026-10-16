import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import {
  CART_COOKIE,
  CART_COOKIE_MAX_AGE_SECONDS,
  cartCookieOptions,
  decodeCart,
  encodeCart,
  readCartLines,
  writeCartLines,
} from "./cart-cookie";

const store = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => store) }));
vi.mock("../env", () => ({ getEnv: () => ({ APP_URL: "https://shop.example.test" }) }));

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const PULSE_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";

function raw(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, "warn").mockImplementation(() => {});
});

describe("cart cookie format", () => {
  it("round-trips the lines as { v: 1, lines: [{ p, q }] } without prices", () => {
    const lines = [
      { productId: VORTEX_ID, quantity: 2 },
      { productId: PULSE_ID, quantity: 1 },
    ];
    const value = encodeCart(lines);
    expect(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))).toEqual({
      v: 1,
      lines: [
        { p: VORTEX_ID, q: 2 },
        { p: PULSE_ID, q: 1 },
      ],
    });
    expect(decodeCart(value)).toEqual({ ok: true, lines });
  });

  it("reads a missing or empty cookie as an empty cart", () => {
    expect(decodeCart(undefined)).toEqual({ ok: true, lines: [] });
    expect(decodeCart("")).toEqual({ ok: true, lines: [] });
  });

  it("treats a tampered, oversized or unknown-version cookie as an empty cart", () => {
    const tampered = [
      "not-base64-json",
      raw({ v: 2, lines: [] }),
      raw({ v: 1, lines: [{ p: VORTEX_ID, q: 0 }] }),
      raw({ v: 1, lines: [{ p: VORTEX_ID, q: -1 }] }),
      raw({ v: 1, lines: [{ p: VORTEX_ID, q: 1, price: 1 }] }),
      raw({ v: 1, lines: [{ p: "not-a-uuid", q: 1 }] }),
      raw({
        v: 1,
        lines: [
          { p: VORTEX_ID, q: 1 },
          { p: VORTEX_ID, q: 2 },
        ],
      }),
      raw({ v: 1, lines: [], total: 0 }),
      raw({
        v: 1,
        lines: Array.from({ length: 21 }, (_, index) => ({
          p: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          q: 1,
        })),
      }),
    ];
    for (const value of tampered) {
      expect(decodeCart(value)).toEqual({ ok: false, lines: [], problem: "malformed" });
    }
    expect(decodeCart("a".repeat(4097))).toEqual({ ok: false, lines: [], problem: "too_large" });
  });

  it("sets HttpOnly, SameSite=Lax, path / and 30 days; Secure follows the APP_URL protocol", () => {
    expect(cartCookieOptions("https://shop.example.test")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE_SECONDS,
    });
    expect(CART_COOKIE_MAX_AGE_SECONDS).toBe(2_592_000);
    expect(cartCookieOptions("http://localhost:3000").secure).toBe(false);
  });
});

describe("reading and writing the cookie", () => {
  it("reads the stored lines", async () => {
    store.get.mockReturnValue({ value: encodeCart([{ productId: VORTEX_ID, quantity: 3 }]) });
    expect(await readCartLines()).toEqual([{ productId: VORTEX_ID, quantity: 3 }]);
    expect(store.get).toHaveBeenCalledWith(CART_COOKIE);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs an ignored cookie without its value", async () => {
    store.get.mockReturnValue({ value: "garbage" });
    expect(await readCartLines()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith("Cart cookie ignored", { problem: "malformed" });
    store.get.mockReturnValue(undefined);
    expect(await readCartLines()).toEqual([]);
  });

  it("writes the lines with the cookie options, and deletes the cookie for an empty cart", async () => {
    const lines = [{ productId: VORTEX_ID, quantity: 1 }];
    await writeCartLines(lines);
    expect(store.set).toHaveBeenCalledWith(
      CART_COOKIE,
      encodeCart(lines),
      cartCookieOptions("https://shop.example.test"),
    );
    await writeCartLines([]);
    expect(store.delete).toHaveBeenCalledWith(CART_COOKIE);
    expect(store.set).toHaveBeenCalledOnce();
  });
});
