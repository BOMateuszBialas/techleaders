/**
 * Customer roles (E07 spec A1). One role, `customer`, on the separate customer auth instance;
 * it is never an admin role, and an admin role is never a customer role (spec R09).
 */
export const CUSTOMER_ROLES = ["customer"] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

export function isCustomerRole(value: unknown): value is CustomerRole {
  return CUSTOMER_ROLES.some((role) => role === value);
}
