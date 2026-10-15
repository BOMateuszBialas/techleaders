/** Admin roles. One role for the MVP (spec decision Q4); a new role is an additive migration. */
export const ADMIN_ROLES = ["owner"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** The owner account is the only privileged account, so its password is stricter than sign-in's 8. */
export const OWNER_PASSWORD_MIN_LENGTH = 12;
