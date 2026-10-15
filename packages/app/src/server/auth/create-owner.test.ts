import { ConflictError } from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import { createOwner, type OwnerContext } from "./create-owner";

type Existing = Awaited<ReturnType<OwnerContext["internalAdapter"]["findUserByEmail"]>>;

function fakeContext(existing: Existing, totalUsers = existing ? 1 : 0) {
  const internalAdapter = {
    findUserByEmail: vi.fn(async () => existing),
    countTotalUsers: vi.fn(async () => totalUsers),
    createUser: vi.fn(async () => ({ id: "new-user" })),
    linkAccount: vi.fn(async () => ({})),
    updatePassword: vi.fn(async () => {}),
    deleteUserSessions: vi.fn(async () => {}),
  } satisfies OwnerContext["internalAdapter"];
  const password = { hash: vi.fn(async (plain: string) => `hashed:${plain}`) };
  return { auth: { $context: Promise.resolve({ internalAdapter, password }) }, internalAdapter };
}

const input = { email: "owner@example.com", password: "a-long-password", rotate: false };
const credential = { providerId: "credential" };

describe("createOwner", () => {
  it("creates the owner with a hashed credential when no admin exists", async () => {
    const { auth, internalAdapter } = fakeContext(null);
    await expect(createOwner({ auth }, input)).resolves.toBe("created");
    expect(internalAdapter.createUser).toHaveBeenCalledWith(
      { email: input.email, name: "Store owner", emailVerified: true },
      { method: "admin" },
    );
    expect(internalAdapter.linkAccount).toHaveBeenCalledWith({
      userId: "new-user",
      providerId: "credential",
      accountId: "new-user",
      password: "hashed:a-long-password",
    });
  });

  it("refuses a second owner with a different email", async () => {
    const { auth, internalAdapter } = fakeContext(null, 1);
    await expect(createOwner({ auth }, input)).rejects.toThrow(/different owner account/);
    expect(internalAdapter.createUser).not.toHaveBeenCalled();
  });

  it("refuses to change an existing owner without --rotate-password", async () => {
    const { auth, internalAdapter } = fakeContext({ user: { id: "u1" }, accounts: [credential] });
    const attempt = createOwner({ auth }, input);
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    await expect(attempt).rejects.toThrow(/--rotate-password/);
    expect(internalAdapter.updatePassword).not.toHaveBeenCalled();
  });

  it("rotates the password and signs the owner out everywhere", async () => {
    const { auth, internalAdapter } = fakeContext({ user: { id: "u1" }, accounts: [credential] });
    await expect(createOwner({ auth }, { ...input, rotate: true })).resolves.toBe("rotated");
    expect(internalAdapter.updatePassword).toHaveBeenCalledWith("u1", "hashed:a-long-password");
    expect(internalAdapter.deleteUserSessions).toHaveBeenCalledWith("u1");
  });

  it("repairs an owner left without a credential by a failed earlier run", async () => {
    const { auth, internalAdapter } = fakeContext({ user: { id: "u1" }, accounts: [] });
    await expect(createOwner({ auth }, input)).resolves.toBe("created");
    expect(internalAdapter.linkAccount).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", providerId: "credential" }),
    );
    expect(internalAdapter.updatePassword).not.toHaveBeenCalled();
  });
});
