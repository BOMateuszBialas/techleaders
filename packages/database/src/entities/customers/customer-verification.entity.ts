import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/** Required by Better Auth core; unused, since customers have no email verification (spec A4). */
export const CustomerVerificationSchema = defineEntity({
  name: "CustomerVerification",
  tableName: "customer_verifications",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    identifier: p.text().index(),
    value: p.text(),
    expiresAt: p.datetime(),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type CustomerVerification = InferEntity<typeof CustomerVerificationSchema>;
