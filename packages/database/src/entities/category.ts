import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const CategorySchema = defineEntity({
  name: "Category",
  tableName: "categories",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.string().length(120),
    slug: p.string().length(140).unique(),
    description: p.text().nullable(),
    createdAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export type Category = InferEntity<typeof CategorySchema>;
