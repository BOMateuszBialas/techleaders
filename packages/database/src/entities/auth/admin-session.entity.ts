import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { AdminUserSchema } from "./admin-user.entity";

/** A signed-in owner's session; deleted on sign-out (AC4) or when its user is deleted. */
export const AdminSessionSchema = defineEntity({
  name: "AdminSession",
  tableName: "admin_sessions",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    user: p.manyToOne(AdminUserSchema).deleteRule("cascade").index(),
    token: p.text().unique(),
    expiresAt: p.datetime(),
    ipAddress: p.text().nullable(),
    userAgent: p.text().nullable(),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type AdminSession = InferEntity<typeof AdminSessionSchema>;
