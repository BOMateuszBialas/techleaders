import { ORDER_STATUSES, PAYMENT_PROVIDERS, SUPPORTED_CURRENCIES } from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * A shopper's order (cart spec, Data Model). Money in integer minor units; `paid_at` is the
 * payment fact. The customer's name, email and address are personal data: never logged, never
 * shown on the public order page. Every check and index is declared here, not only in the
 * migration, so the drift test sees them.
 */
export const OrderSchema = defineEntity({
  name: "Order",
  tableName: "orders",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    /** `CO-XXXXX-XXXXX-XXXXX-XXXXX`, a bearer secret (spec A8). */
    publicReference: p.string().length(32).unique(),
    idempotencyKey: p.uuid().unique(),
    /** SHA-256 hex of the cart fingerprint plus the customer fields (spec A7). */
    requestFingerprint: p.text(),
    status: p.enum(ORDER_STATUSES).default("pending_payment").index(),
    customerName: p.string().length(200),
    customerEmail: p.string().length(320),
    shippingLine1: p.string().length(200),
    shippingLine2: p.string().length(200).nullable(),
    shippingCity: p.string().length(100),
    shippingPostalCode: p.string().length(20),
    shippingCountry: p
      .string()
      .length(2)
      .columnType("char(2)")
      .check("shipping_country ~ '^[A-Z]{2}$'"),
    currency: p.enum(SUPPORTED_CURRENCIES),
    subtotalMinor: p.integer().check("subtotal_minor >= 0"),
    shippingMinor: p.integer().default(0).check("shipping_minor >= 0"),
    totalMinor: p.integer().check("total_minor >= 0"),
    paymentProvider: p.enum(PAYMENT_PROVIDERS).nullable(),
    paymentReference: p.string().length(64).nullable().unique(),
    paidAt: p.datetime().nullable(),
    createdAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date())
      .index(),
    updatedAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  checks: [
    { name: "orders_total_check", expression: "total_minor = subtotal_minor + shipping_minor" },
    // A pending order has no payment yet; every paid state has one.
    {
      name: "orders_pending_unpaid_check",
      expression: "status <> 'pending_payment' or paid_at is null",
    },
    {
      name: "orders_paid_at_check",
      expression:
        "status not in ('paid', 'processing', 'shipped', 'refunded') or paid_at is not null",
    },
  ],
});

export type Order = InferEntity<typeof OrderSchema>;
