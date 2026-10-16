import { describe, expect, it } from "vitest";
import { hasAppErrorCode } from "../../errors/app-error";
import { SLUG_EMPTY_MESSAGE, SLUG_FORMAT_MESSAGE } from "../catalog/slug.schema";
import { parseInput } from "../parse-input";
import {
  CATEGORY_CHOICE_MESSAGE,
  createProductInputSchema,
  IMAGE_URL_MESSAGE,
  isAllowedImageUrl,
  PRICE_EMPTY_MESSAGE,
  PRICE_FORMAT_MESSAGE,
  productInputSchema,
  productStatusSchema,
  STATUS_MESSAGE,
  STOCK_QUANTITY_MESSAGE,
} from "./product-input.schema";

const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";

const valid = {
  name: " Phantom Pro Mouse ",
  slug: "",
  description: "  [DEMO] A light wireless mouse. ",
  price: "199,90",
  sku: " demo-mou-009 ",
  categoryId: MICE_ID,
  imageUrl: "https://images.example.com/phantom.png",
  featured: "on",
};

function fieldErrorsFor(schema: typeof productInputSchema | typeof createProductInputSchema) {
  return (input: unknown): Record<string, string[]> => {
    const result = schema.safeParse(input);
    if (result.success) throw new Error("expected invalid input");
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      errors[field] = [...(errors[field] ?? []), issue.message];
    }
    return errors;
  };
}

const editErrors = fieldErrorsFor(productInputSchema);
const createErrors = fieldErrorsFor(createProductInputSchema);

describe("productInputSchema", () => {
  it("trims, derives the slug, parses the price and normalises the SKU", () => {
    expect(productInputSchema.parse(valid)).toEqual({
      name: "Phantom Pro Mouse",
      slug: "phantom-pro-mouse",
      description: "[DEMO] A light wireless mouse.",
      priceMinor: 19990,
      sku: "DEMO-MOU-009",
      categoryId: MICE_ID,
      imageUrl: "https://images.example.com/phantom.png",
      featured: true,
    });
  });

  it("stores blank optional fields as null or empty, and an unticked Featured as false", () => {
    expect(
      productInputSchema.parse({
        name: "Arena Fight Stick",
        slug: " Arena-Stick ",
        price: "449",
        sku: " ",
        categoryId: "",
        imageUrl: "",
        featured: "",
      }),
    ).toEqual({
      name: "Arena Fight Stick",
      slug: "arena-stick",
      description: "",
      priceMinor: 44900,
      sku: null,
      categoryId: null,
      imageUrl: null,
      featured: false,
    });
    expect(productInputSchema.parse({ name: "X", price: "1" }).featured).toBe(false);
    expect(productInputSchema.parse({ name: "X", price: "1", featured: true }).featured).toBe(true);
  });

  it("never carries status or stock in an edit", () => {
    const parsed = productInputSchema.parse({ ...valid, status: "published", stockQuantity: "0" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("stockQuantity");
  });

  it.each([
    ["", PRICE_EMPTY_MESSAGE],
    ["12.345", PRICE_FORMAT_MESSAGE],
    ["-1", PRICE_FORMAT_MESSAGE],
    ["1e3", PRICE_FORMAT_MESSAGE],
    ["abc", PRICE_FORMAT_MESSAGE],
    ["99999999999", PRICE_FORMAT_MESSAGE],
  ])("refuses the price %j", (price, message) => {
    expect(editErrors({ ...valid, price })).toEqual({ price: [message] });
  });

  it("asks for a name and limits lengths", () => {
    expect(editErrors({ ...valid, name: "  " })).toMatchObject({ name: ["Enter a name."] });
    expect(editErrors({ ...valid, name: "x".repeat(201) })).toMatchObject({
      name: ["Use at most 200 characters."],
    });
    expect(editErrors({ ...valid, description: "x".repeat(5001) })).toEqual({
      description: ["Use at most 5000 characters."],
    });
    expect(editErrors({ ...valid, sku: "X".repeat(65) })).toEqual({
      sku: ["Use at most 64 characters."],
    });
    // Upper-casing "ß" gives "SS", so the limit is checked after normalising.
    expect(editErrors({ ...valid, sku: "ß".repeat(33) })).toEqual({
      sku: ["Use at most 64 characters."],
    });
    expect(editErrors({ ...valid, imageUrl: `https://x.test/${"a".repeat(2040)}` })).toEqual({
      imageUrl: ["Use at most 2048 characters."],
    });
  });

  it("refuses a slug that is not valid, cannot be derived or is too long", () => {
    expect(editErrors({ ...valid, slug: "Not a slug!" })).toEqual({ slug: [SLUG_FORMAT_MESSAGE] });
    expect(editErrors({ ...valid, name: "!!!", slug: "" })).toEqual({
      slug: [SLUG_EMPTY_MESSAGE],
    });
    expect(editErrors({ ...valid, slug: "a".repeat(221) })).toEqual({
      slug: ["Use at most 220 characters."],
    });
  });

  it("refuses a category id that is not a uuid", () => {
    expect(editErrors({ ...valid, categoryId: "mice" })).toEqual({
      categoryId: [CATEGORY_CHOICE_MESSAGE],
    });
  });

  it.each([
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "http://images.example.com/x.png",
    "not a url",
    "/demo/../secret.svg",
  ])("refuses the image address %j", (imageUrl) => {
    expect(editErrors({ ...valid, imageUrl })).toEqual({ imageUrl: [IMAGE_URL_MESSAGE] });
  });

  it("refuses a Featured value that is not a checkbox value", () => {
    expect(editErrors({ ...valid, featured: "yes" })).toHaveProperty("featured");
  });

  it("turns a failure into a ValidationError with field errors", () => {
    let caught: unknown;
    try {
      parseInput(productInputSchema, { ...valid, price: "abc" });
    } catch (error) {
      caught = error;
    }
    expect(hasAppErrorCode(caught, "VALIDATION_FAILED")).toBe(true);
    expect(caught).toMatchObject({ fieldErrors: { price: [PRICE_FORMAT_MESSAGE] } });
  });
});

describe("isAllowedImageUrl", () => {
  it("allows https URLs and the seeded local demo images only", () => {
    expect(isAllowedImageUrl("https://images.example.com/a.png")).toBe(true);
    expect(isAllowedImageUrl("/demo/products/vortex-wireless-mouse.svg")).toBe(true);
    expect(isAllowedImageUrl("/demo/products/x.exe")).toBe(false);
    expect(isAllowedImageUrl("/uploads/x.png")).toBe(false);
    expect(isAllowedImageUrl("ftp://x.test/a.png")).toBe(false);
  });
});

describe("createProductInputSchema", () => {
  it("adds the initial status and stock", () => {
    expect(
      createProductInputSchema.parse({ ...valid, status: "published", stockQuantity: " 0 " }),
    ).toMatchObject({ slug: "phantom-pro-mouse", status: "published", stockQuantity: 0 });
  });

  it("defaults the status to draft", () => {
    expect(createProductInputSchema.parse({ ...valid, stockQuantity: "5" }).status).toBe("draft");
    expect(
      createProductInputSchema.parse({ ...valid, stockQuantity: "5", status: "" }).status,
    ).toBe("draft");
  });

  it.each(["", "-1", "1.5", "abc", "1000001", "99999999"])(
    "refuses the stock quantity %j",
    (stockQuantity) => {
      expect(createErrors({ ...valid, stockQuantity })).toEqual({
        stockQuantity: [STOCK_QUANTITY_MESSAGE],
      });
    },
  );

  it("accepts the largest stock quantity", () => {
    expect(
      createProductInputSchema.parse({ ...valid, stockQuantity: "1000000" }).stockQuantity,
    ).toBe(1_000_000);
  });

  it("refuses an unknown status and a bad slug", () => {
    expect(createErrors({ ...valid, stockQuantity: "1", status: "archived" })).toEqual({
      status: [STATUS_MESSAGE],
    });
    expect(createErrors({ ...valid, stockQuantity: "1", name: "???", slug: "" })).toEqual({
      slug: [SLUG_EMPTY_MESSAGE],
    });
  });
});

describe("productStatusSchema", () => {
  it("accepts draft and published only", () => {
    expect(productStatusSchema.parse("published")).toBe("published");
    expect(productStatusSchema.safeParse("archived").success).toBe(false);
  });
});
