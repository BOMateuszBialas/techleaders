import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { CHECKOUT_SESSION_LOST } from "@/components/checkout/checkout-mode";
import type * as ContainerModule from "../container";
import type * as OrderActions from "./order.action";

// Mirrors the augmentation in `@commerceos/database/testing`, which app code must not import.
declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * E07 spec A24, step 12 (integration): `placeOrder` against the real container, database and
 * customer Better Auth instance. Only the request (headers, the cart cookie) and Next.js control
 * flow are faked. A session-read failure on an account checkout must save nothing (no guest
 * order, no stock change); the explicit guest resubmission then stores one guest order; a
 * confirmed customer session attaches the order to that customer.
 */
let cartLines: { productId: string; quantity: number }[] = [];
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));
vi.mock("../cart/cart-cookie", () => ({
  readCartLines: vi.fn(async () => cartLines),
  writeCartLines: vi.fn(async (lines: typeof cartLines) => {
    cartLines = lines;
  }),
}));

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const tsxCli = fileURLToPath(new URL("node_modules/tsx/dist/cli.mjs", `file:///${repoRoot}`));
const databaseUrl = inject("databaseUrl");
const pool = new Pool({ connectionString: databaseUrl });
const SLUG = "int-a24-mouse";

let container: typeof ContainerModule;
let actions: typeof OrderActions;
let productId = "";
let customerId = "";

async function state() {
  const { rows } = await pool.query<{ orders: string; stock: number }>(
    `select (select count(*) from orders where idempotency_key in (select unnest($1::uuid[]))) as orders,
       (select stock_quantity from products where slug = $2) as stock`,
    [keys, SLUG],
  );
  return { orders: Number(rows[0]?.orders), stock: rows[0]?.stock };
}

const keys: string[] = [];
function checkoutForm(checkoutAs: string): FormData {
  const key = randomUUID();
  keys.push(key);
  const data = new FormData();
  for (const [name, value] of Object.entries({
    idempotencyKey: key,
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.test",
    shippingLine1: "ul. Marszałkowska 1",
    shippingLine2: "",
    shippingCity: "Warszawa",
    shippingPostalCode: "00-950",
    shippingCountry: "PL",
    expectedTotalMinor: "1000",
    cartFingerprint: `${productId}:1`,
    checkoutAs,
  })) {
    data.set(name, value);
  }
  return data;
}

describe("placeOrder and the customer session (E07 A24, integration)", () => {
  beforeAll(async () => {
    await run(process.execPath, [tsxCli, "packages/database/src/cli/migrate.ts", "up"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    const { rows } = await pool.query<{ id: string }>(
      `insert into products (name, slug, price_minor, currency, stock_quantity, status)
         values ('[INT] A24 Mouse', $1, 1000, 'PLN', 10, 'published')
       on conflict (slug) do update set stock_quantity = 10 returning id`,
      [SLUG],
    );
    productId = rows[0]?.id ?? "";
    const customer = await pool.query<{ id: string }>(
      `insert into customer_users (name, email, email_verified) values ('Customer', 'a24@int.test', false)
       on conflict (email) do update set name = excluded.name returning id`,
    );
    customerId = customer.rows[0]?.id ?? "";

    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-secret-integration-secret-1";
    container = await import("../container");
    actions = await import("./order.action");
  });

  beforeEach(() => {
    cartLines = [{ productId, quantity: 1 }];
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves nothing when the session read fails on an account checkout, then places the guest resubmission", async () => {
    const getSession = vi
      .spyOn(container.getCustomerAuth().api, "getSession")
      .mockRejectedValue(new Error("database unavailable"));
    const before = await state();

    const lost = await actions.placeOrder(IDLE_ACTION_STATE, checkoutForm("account"));
    expect(lost).toMatchObject({ status: "error", code: CHECKOUT_SESSION_LOST });
    expect(getSession).toHaveBeenCalledOnce();
    expect(await state()).toEqual(before);
    expect(cartLines).toHaveLength(1);

    // The shopper now submits the guest form the page switched to: no session read at all.
    await expect(actions.placeOrder(lost, checkoutForm("guest"))).rejects.toThrow(
      /^NEXT_REDIRECT \/checkout\/pay\/CO-/,
    );
    expect(getSession).toHaveBeenCalledOnce();
    expect(await state()).toEqual({ orders: before.orders + 1, stock: (before.stock ?? 0) - 1 });
    const { rows } = await pool.query<{ customer_id: string | null }>(
      "select customer_id from orders where idempotency_key = $1",
      [keys.at(-1)],
    );
    expect(rows).toEqual([{ customer_id: null }]);
  });

  it("attaches an account checkout to the confirmed customer", async () => {
    vi.spyOn(container.getCustomerAuth().api, "getSession").mockResolvedValue({
      session: { token: "t" },
      user: { id: customerId, email: "a24@int.test", role: "customer" },
    } as never);
    await expect(actions.placeOrder(IDLE_ACTION_STATE, checkoutForm("account"))).rejects.toThrow(
      /^NEXT_REDIRECT \/checkout\/pay\/CO-/,
    );
    const { rows } = await pool.query<{ customer_id: string | null }>(
      "select customer_id from orders where idempotency_key = $1",
      [keys.at(-1)],
    );
    expect(rows).toEqual([{ customer_id: customerId }]);
  });
});
