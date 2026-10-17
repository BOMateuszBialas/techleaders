import { describe, expect, it } from "vitest";
import { CART_QUANTITY_LIMIT_MESSAGE } from "../../domain/cart/cart";
import { money } from "../../domain/money";
import { hasAppErrorCode } from "../../errors/app-error";
import {
  CART_PRODUCT_MESSAGE,
  CART_QUANTITY_MESSAGE,
  cartQuantitySchema,
} from "../../validators/cart/cart-line.schema";
import { INVALID_FIELDS_MESSAGE } from "../../validators/parse-input";
import { InMemoryCatalog, MICE, productRecord } from "../catalog/in-memory-catalog.fixture";
import {
  AddToCartUseCase,
  ONE_CURRENCY_MESSAGE,
  OUT_OF_STOCK_MESSAGE,
  PRODUCT_UNAVAILABLE_MESSAGE,
} from "./add-to-cart.use-case";
import { GetCartUseCase } from "./get-cart.use-case";
import { RemoveCartLineUseCase } from "./remove-cart-line.use-case";
import { UpdateCartLineUseCase } from "./update-cart-line.use-case";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const PULSE_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const TITAN_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e03";
const DRAFT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e04";
const EURO_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e05";
const MISSING_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff";

function catalog() {
  return new InMemoryCatalog(
    [MICE],
    [
      productRecord({ id: VORTEX_ID, stockQuantity: 25 }),
      productRecord({
        id: PULSE_ID,
        slug: "pulse-ultralight-mouse",
        name: "Pulse Ultralight Mouse",
        priceMinor: 18900,
        stockQuantity: 3,
      }),
      productRecord({
        id: TITAN_ID,
        slug: "titan-mmo-mouse",
        name: "Titan MMO Mouse",
        stockQuantity: 0,
      }),
      productRecord({ id: DRAFT_ID, slug: "draft", name: "Draft", status: "draft" }),
      productRecord({ id: EURO_ID, slug: "euro", name: "Euro Mouse", currency: "EUR" }),
    ],
  );
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

describe("cartQuantitySchema", () => {
  it("accepts whole numbers from 1 to 99 as text or numbers", () => {
    expect(cartQuantitySchema.parse(" 2 ")).toBe(2);
    expect(cartQuantitySchema.parse(99)).toBe(99);
    for (const bad of ["", "0", "-1", "1.5", "1e1", "100", 0, 1.5]) {
      expect(cartQuantitySchema.safeParse(bad).error?.issues[0]?.message).toBe(
        CART_QUANTITY_MESSAGE,
      );
    }
  });
});

describe("AddToCartUseCase", () => {
  const add = (repository = catalog()) => new AddToCartUseCase({ catalogRepository: repository });

  it("adds an in-stock product with quantity 1 by default", async () => {
    const repository = catalog();
    const result = await add(repository).execute({
      lines: [],
      request: { productId: VORTEX_ID, quantity: "" },
    });
    expect(result).toEqual({
      lines: [{ productId: VORTEX_ID, quantity: 1 }],
      itemCount: 1,
      productName: "Vortex Wireless Mouse",
    });
    expect(repository.idLookups).toEqual([[VORTEX_ID]]);
  });

  it("merges into an existing line and loads every cart product once", async () => {
    const repository = catalog();
    const result = await add(repository).execute({
      lines: [
        { productId: PULSE_ID, quantity: 1 },
        { productId: VORTEX_ID, quantity: 2 },
      ],
      request: { productId: VORTEX_ID, quantity: "3" },
    });
    expect(result.lines).toEqual([
      { productId: PULSE_ID, quantity: 1 },
      { productId: VORTEX_ID, quantity: 5 },
    ]);
    expect(result.itemCount).toBe(6);
    expect(repository.idLookups).toEqual([[PULSE_ID, VORTEX_ID]]);
  });

  it("refuses an out-of-stock product", async () => {
    const error = await rejection(add().execute({ lines: [], request: { productId: TITAN_ID } }));
    expect(hasAppErrorCode(error, "CONFLICT")).toBe(true);
    expect(error).toMatchObject({ message: OUT_OF_STOCK_MESSAGE });
  });

  it("refuses an unknown or unpublished product as not found", async () => {
    for (const productId of [MISSING_ID, DRAFT_ID]) {
      const error = await rejection(add().execute({ lines: [], request: { productId } }));
      expect(hasAppErrorCode(error, "NOT_FOUND")).toBe(true);
      expect(error).toMatchObject({ message: PRODUCT_UNAVAILABLE_MESSAGE });
    }
  });

  it("refuses more than the stock, counting what the cart already holds", async () => {
    let error = await rejection(
      add().execute({ lines: [], request: { productId: PULSE_ID, quantity: 4 } }),
    );
    expect(hasAppErrorCode(error, "CONFLICT")).toBe(true);
    expect(error).toMatchObject({ message: "Only 3 left in stock." });

    error = await rejection(
      add().execute({
        lines: [{ productId: PULSE_ID, quantity: 2 }],
        request: { productId: PULSE_ID, quantity: 2 },
      }),
    );
    expect(error).toMatchObject({ message: "Only 3 left in stock, and 2 already in your cart." });
  });

  it("refuses a second currency", async () => {
    const error = await rejection(
      add().execute({
        lines: [{ productId: VORTEX_ID, quantity: 1 }],
        request: { productId: EURO_ID },
      }),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ message: ONE_CURRENCY_MESSAGE });
  });

  it("validates the input before any query", async () => {
    const repository = catalog();
    const error = await rejection(
      add(repository).execute({ lines: [], request: { productId: VORTEX_ID, quantity: "0" } }),
    );
    expect(error).toMatchObject({
      message: INVALID_FIELDS_MESSAGE,
      fieldErrors: { quantity: [CART_QUANTITY_MESSAGE] },
    });
    expect(repository.idLookups).toEqual([]);
  });

  it("refuses a forged product id with a form-level message, nothing to highlight (#48)", async () => {
    const repository = catalog();
    for (const productId of ["x", ""]) {
      const error = await rejection(
        add(repository).execute({ lines: [], request: { productId, quantity: "0" } }),
      );
      expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
      expect(error).toMatchObject({ message: CART_PRODUCT_MESSAGE, fieldErrors: {} });
    }
    expect(repository.idLookups).toEqual([]);
  });

  it("applies the 99-per-product limit after merging", async () => {
    const repository = new InMemoryCatalog(
      [],
      [productRecord({ id: VORTEX_ID, stockQuantity: 500 })],
    );
    const error = await rejection(
      add(repository).execute({
        lines: [{ productId: VORTEX_ID, quantity: 90 }],
        request: { productId: VORTEX_ID, quantity: 10 },
      }),
    );
    expect(error).toMatchObject({ message: CART_QUANTITY_LIMIT_MESSAGE });
  });
});

describe("UpdateCartLineUseCase", () => {
  const update = () => new UpdateCartLineUseCase({ catalogRepository: catalog() });
  const lines = [
    { productId: VORTEX_ID, quantity: 1 },
    { productId: PULSE_ID, quantity: 1 },
  ];

  it("sets a line's quantity", async () => {
    expect(
      await update().execute({ lines, request: { productId: PULSE_ID, quantity: "3" } }),
    ).toEqual({
      lines: [
        { productId: VORTEX_ID, quantity: 1 },
        { productId: PULSE_ID, quantity: 3 },
      ],
      itemCount: 4,
    });
  });

  it("refuses a quantity above the stock under the field", async () => {
    const error = await rejection(
      update().execute({ lines, request: { productId: PULSE_ID, quantity: "4" } }),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({
      message: "Only 3 left in stock.",
      fieldErrors: { quantity: ["Only 3 left in stock."] },
    });
  });

  it("refuses a line that is not in the cart or no longer available", async () => {
    for (const productId of [TITAN_ID, MISSING_ID]) {
      const error = await rejection(
        update().execute({
          lines: [...lines, { productId: TITAN_ID, quantity: 1 }],
          request: { productId, quantity: 1 },
        }),
      );
      expect(hasAppErrorCode(error, "NOT_FOUND")).toBe(true);
    }
    const error = await rejection(
      update().execute({ lines: [], request: { productId: VORTEX_ID, quantity: 1 } }),
    );
    expect(hasAppErrorCode(error, "NOT_FOUND")).toBe(true);
  });

  it("refuses a forged product id with a form-level message (#48)", async () => {
    const error = await rejection(
      update().execute({ lines, request: { productId: "not-a-uuid", quantity: "abc" } }),
    );
    expect(error).toMatchObject({ message: CART_PRODUCT_MESSAGE, fieldErrors: {} });
  });
});

describe("RemoveCartLineUseCase", () => {
  it("removes a line, and an absent one is a no-op", async () => {
    const remove = new RemoveCartLineUseCase();
    const lines = [{ productId: VORTEX_ID, quantity: 2 }];
    expect(await remove.execute({ lines, request: { productId: VORTEX_ID } })).toEqual({
      lines: [],
      itemCount: 0,
    });
    expect(await remove.execute({ lines, request: { productId: PULSE_ID } })).toEqual({
      lines,
      itemCount: 2,
    });
    const error = await rejection(remove.execute({ lines, request: { productId: "nope" } }));
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ message: CART_PRODUCT_MESSAGE, fieldErrors: {} });
  });
});

describe("GetCartUseCase", () => {
  it("prices the stored lines and skips the query for an empty cart", async () => {
    const repository = catalog();
    const get = new GetCartUseCase({ catalogRepository: repository });

    expect((await get.execute({ lines: [] })).lines).toEqual([]);
    expect(repository.idLookups).toEqual([]);

    const cart = await get.execute({
      lines: [
        { productId: VORTEX_ID, quantity: 2 },
        { productId: TITAN_ID, quantity: 1 },
      ],
    });
    expect(cart.subtotal).toEqual(money(49800, "PLN"));
    expect(cart.notices).toEqual([
      "Titan MMO Mouse is no longer available and was removed from your cart.",
    ]);
  });
});
