import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/** Required by Better Auth core (verification tokens); unused by the MVP flows. */
export const AdminVerificationSchema = defineEntity({
  name: "AdminVerification",
  tableName: "admin_verifications",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    identifier: p.text().index(),
    value: p.text(),
    expiresAt: p.datetime(),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type AdminVerification = InferEntity<typeof AdminVerificationSchema>;
