import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { CustomerUserSchema } from "./customer-user.entity";

/** A signed-in customer's session; deleted on sign-out or when its user is deleted (spec A8). */
export const CustomerSessionSchema = defineEntity({
  name: "CustomerSession",
  tableName: "customer_sessions",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    user: p.manyToOne(CustomerUserSchema).deleteRule("cascade").index(),
    token: p.text().unique(),
    expiresAt: p.datetime(),
    ipAddress: p.text().nullable(),
    userAgent: p.text().nullable(),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type CustomerSession = InferEntity<typeof CustomerSessionSchema>;
