import {
  INVALID_FIELDS_MESSAGE,
  UniqueFieldConflictError,
  ValidationError,
} from "@commerceos/core";

/** PostgreSQL SQLSTATE codes of the constraint violations the admin forms can trigger. */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

type FieldProblem = { field: string; message: string };

/** Unique constraints (named in the migrations) → the form field they belong to. */
const UNIQUE_CONSTRAINTS: Record<string, FieldProblem> = {
  categories_slug_unique: {
    field: "slug",
    message: "This slug is already used by another category.",
  },
  products_slug_unique: { field: "slug", message: "This slug is already used by another product." },
  products_sku_unique: { field: "sku", message: "This SKU is already used by another product." },
};

/** Foreign-key and check constraints → a field error (a second line of defence after Zod). */
const FIELD_CONSTRAINTS: Record<string, FieldProblem> = {
  products_category_id_foreign: { field: "categoryId", message: "Choose an existing category." },
  products_price_minor_check: { field: "price", message: "Enter a price of 0 or more." },
  products_stock_quantity_check: {
    field: "stockQuantity",
    message: "Enter a quantity of 0 or more.",
  },
};

/**
 * Reads the SQLSTATE and constraint name of a database error. MikroORM's `DriverException`
 * copies the `pg` error's own properties (`code`, `constraint`), so both are read
 * structurally: no `instanceof` against an exception class from another bundled copy.
 */
function readConstraintViolation(error: unknown): { sqlState: string; constraint: string } | null {
  if (!(error instanceof Error)) return null;
  const sqlState = "code" in error ? error.code : undefined;
  const constraint = "constraint" in error ? error.constraint : undefined;
  return typeof sqlState === "string" && typeof constraint === "string"
    ? { sqlState, constraint }
    : null;
}

/**
 * Translates a catalog write failure into an application error the form can show:
 * a unique violation becomes `UniqueFieldConflictError` on its field, a known foreign-key or
 * check violation a `ValidationError` on its field. Anything else is returned unchanged, so
 * the caller rethrows it and it is logged as an internal error.
 */
export function toCatalogWriteError(error: unknown): unknown {
  const violation = readConstraintViolation(error);
  if (!violation) return error;

  const unique =
    violation.sqlState === UNIQUE_VIOLATION ? UNIQUE_CONSTRAINTS[violation.constraint] : undefined;
  if (unique) return new UniqueFieldConflictError(unique.field, unique.message);

  const isFieldViolation =
    violation.sqlState === FOREIGN_KEY_VIOLATION || violation.sqlState === CHECK_VIOLATION;
  const field = isFieldViolation ? FIELD_CONSTRAINTS[violation.constraint] : undefined;
  if (field) {
    return new ValidationError(INVALID_FIELDS_MESSAGE, { [field.field]: [field.message] });
  }
  return error;
}

/** Check constraints a stock change can hit → the stock panel's quantity field. */
const STOCK_CHECK_CONSTRAINTS = new Set([
  "products_stock_quantity_check",
  "stock_adjustments_new_quantity_check",
]);

export const STOCK_QUANTITY_CHECK_MESSAGE = "Enter a quantity of 0 or more.";

/**
 * Translates a stock write failure (admin catalog spec, Edge Cases): a negative quantity that
 * reached the database despite the schema becomes a `ValidationError` on `newQuantity`, the
 * field the stock panel shows. Anything else is returned unchanged, so the caller rethrows it.
 */
export function toStockWriteError(error: unknown): unknown {
  const violation = readConstraintViolation(error);
  if (
    violation?.sqlState === CHECK_VIOLATION &&
    STOCK_CHECK_CONSTRAINTS.has(violation.constraint)
  ) {
    return new ValidationError(INVALID_FIELDS_MESSAGE, {
      newQuantity: [STOCK_QUANTITY_CHECK_MESSAGE],
    });
  }
  return error;
}
