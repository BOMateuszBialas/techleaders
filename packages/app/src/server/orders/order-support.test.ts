import { createHash } from "node:crypto";
import { money } from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import { DemoPaymentGateway } from "../payments/demo-payment-gateway";
import { newIdempotencyKey, randomBytes, sha256Hex } from "./order-crypto";
import {
  LOOKUP_LIMIT_PER_IP,
  LOOKUP_LIMIT_SHARED,
  LOOKUP_WINDOW_SECONDS,
  consumeOrderLookup,
  orderLookupBucket,
} from "./order-lookup-limit";
import { orderPaths } from "./order-paths";

const REFERENCE = "CO-0DT7M-1EV8N-2FW9P-3GXAQ";

function headers(values: Record<string, string>): Pick<Headers, "get"> {
  return new Headers(values);
}

describe("order crypto helpers", () => {
  it("returns random bytes of the asked length, a hex SHA-256 and a UUID key", async () => {
    const bytes = randomBytes(20);
    expect(bytes).toHaveLength(20);
    expect(bytes).not.toEqual(randomBytes(20));
    expect(await sha256Hex("abc")).toBe(createHash("sha256").update("abc").digest("hex"));
    expect(newIdempotencyKey()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("DemoPaymentGateway", () => {
  it("is not live and returns the deterministic DEMO-PAY reference without charging", async () => {
    const gateway = new DemoPaymentGateway();
    expect(gateway.provider).toBe("demo");
    expect(gateway.isLive).toBe(false);
    expect(
      await gateway.authorize({ idempotencyKey: "order-1", amount: money(24900, "PLN") }),
    ).toEqual({ providerReference: "DEMO-PAY-order-1" });
  });
});

describe("order lookup limit", () => {
  it("uses one shared bucket unless a trusted client-IP header is configured", () => {
    const forged = headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" });
    expect(orderLookupBucket({}, forged)).toEqual({
      key: "order-lookup|shared",
      limit: LOOKUP_LIMIT_SHARED,
    });
    expect(orderLookupBucket({ AUTH_TRUSTED_IP_HEADER: "x-real-ip" }, forged)).toEqual({
      key: "order-lookup|5.6.7.8",
      limit: LOOKUP_LIMIT_PER_IP,
    });
  });

  it("takes the first entry of a list and falls back to shared when the header is missing", () => {
    const env = { AUTH_TRUSTED_IP_HEADER: "x-forwarded-for" };
    expect(orderLookupBucket(env, headers({ "x-forwarded-for": " 9.9.9.9 , 10.0.0.1" })).key).toBe(
      "order-lookup|9.9.9.9",
    );
    expect(orderLookupBucket(env, headers({})).key).toBe("order-lookup|shared");
  });

  it("consumes one request from the bucket and reports whether it is allowed", async () => {
    const consume = vi.fn(async () => ({ allowed: false, remaining: 0 }));
    expect(await consumeOrderLookup({ consume }, {}, headers({}))).toBe(false);
    expect(consume).toHaveBeenCalledWith(
      "order-lookup|shared",
      LOOKUP_LIMIT_SHARED,
      LOOKUP_WINDOW_SECONDS,
    );
  });
});

describe("order paths", () => {
  it("builds the payment, order and confirmation URLs", () => {
    expect(orderPaths.pay(REFERENCE)).toBe(`/checkout/pay/${REFERENCE}`);
    expect(orderPaths.order(REFERENCE)).toBe(`/orders/${REFERENCE}`);
    expect(orderPaths.confirmation(REFERENCE)).toBe(`/orders/${REFERENCE}?paid=1`);
    expect(orderPaths.lookup).toBe("/orders/lookup");
  });
});
