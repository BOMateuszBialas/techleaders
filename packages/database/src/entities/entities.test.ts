import { afterAll, describe, expect, it } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const timestampHooks = [...orm.getMetadata().getAll().values()].flatMap((meta) =>
  Object.values(meta.properties).flatMap((property) =>
    (["onCreate", "onUpdate"] as const).flatMap((hook) => {
      const fn = property[hook];
      return fn ? [{ label: `${meta.className}.${property.name} ${hook}`, fn }] : [];
    }),
  ),
);

describe("entity timestamp hooks", () => {
  it("exist on every entity", () => {
    expect(timestampHooks.length).toBeGreaterThan(0);
  });

  it.each(timestampHooks)("$label sets the current time", ({ fn }) => {
    const before = Date.now();
    const value: unknown = fn({}, orm.em.fork());
    expect(value).toBeInstanceOf(Date);
    expect(value instanceof Date && value.getTime()).toBeGreaterThanOrEqual(before);
  });
});
