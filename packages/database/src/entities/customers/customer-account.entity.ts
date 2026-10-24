import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { CustomerUserSchema } from "./customer-user.entity";

/**
 * Credential account of a customer. `password` holds the library's scrypt hash and never
 * leaves the server. The OAuth columns are required by Better Auth and stay null.
 */
export const CustomerAccountSchema = defineEntity({
  name: "CustomerAccount",
  tableName: "customer_accounts",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    user: p.manyToOne(CustomerUserSchema).deleteRule("cascade").index(),
    accountId: p.text(),
    providerId: p.text(),
    accessToken: p.text().nullable(),
    refreshToken: p.text().nullable(),
    idToken: p.text().nullable(),
    accessTokenExpiresAt: p.datetime().nullable(),
    refreshTokenExpiresAt: p.datetime().nullable(),
    scope: p.text().nullable(),
    password: p.text().nullable(),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type CustomerAccount = InferEntity<typeof CustomerAccountSchema>;
