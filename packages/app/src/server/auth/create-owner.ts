import { ConflictError } from "@commerceos/core";
import { OWNER_NAME } from "./create-auth";

/**
 * The slice of Better Auth's context that owner provisioning needs (spike d). Declared
 * narrowly so tests can fake it; the real `auth.$context` must stay assignable to it.
 */
export type OwnerContext = {
  internalAdapter: {
    findUserByEmail(
      email: string,
      options: { includeAccounts: boolean },
    ): Promise<{ user: { id: string }; accounts: { providerId: string }[] } | null>;
    countTotalUsers(): Promise<number>;
    createUser(
      user: { email: string; name: string; emailVerified: boolean },
      source: { method: "admin" },
    ): Promise<{ id: string }>;
    linkAccount(account: {
      userId: string;
      providerId: string;
      accountId: string;
      password: string;
    }): Promise<unknown>;
    updatePassword(userId: string, password: string): Promise<void>;
    deleteUserSessions(userId: string): Promise<void>;
  };
  password: { hash(password: string): Promise<string> };
};

export type CreateOwnerInput = { email: string; password: string; rotate: boolean };
export type CreateOwnerResult = "created" | "rotated";

const CREDENTIAL_PROVIDER = "credential";

/**
 * Creates the single owner account, or, with `rotate`, replaces its password and signs
 * it out everywhere (also the recovery path for a lost password; spec G7). Public
 * sign-up stays disabled: this goes through the library's internal adapter and hashing.
 */
export async function createOwner(
  deps: { auth: { $context: Promise<OwnerContext> } },
  input: CreateOwnerInput,
): Promise<CreateOwnerResult> {
  const { internalAdapter, password } = await deps.auth.$context;
  const existing = await internalAdapter.findUserByEmail(input.email, { includeAccounts: true });
  const hash = await password.hash(input.password);

  if (!existing) {
    if ((await internalAdapter.countTotalUsers()) > 0) {
      throw new ConflictError(
        "A different owner account already exists. CommerceOS has exactly one owner.",
      );
    }
    const user = await internalAdapter.createUser(
      { email: input.email, name: OWNER_NAME, emailVerified: true },
      { method: "admin" },
    );
    await linkCredential(internalAdapter, user.id, hash);
    return "created";
  }

  const hasCredential = existing.accounts.some((a) => a.providerId === CREDENTIAL_PROVIDER);
  if (!input.rotate && hasCredential) {
    throw new ConflictError(
      "The owner account already exists. Run with --rotate-password to change its password.",
    );
  }
  if (hasCredential) {
    await internalAdapter.updatePassword(existing.user.id, hash);
  } else {
    // A previous run created the user but failed before linking the password.
    await linkCredential(internalAdapter, existing.user.id, hash);
  }
  await internalAdapter.deleteUserSessions(existing.user.id);
  return hasCredential ? "rotated" : "created";
}

function linkCredential(adapter: OwnerContext["internalAdapter"], userId: string, hash: string) {
  return adapter.linkAccount({
    userId,
    providerId: CREDENTIAL_PROVIDER,
    accountId: userId,
    password: hash,
  });
}
