import {
  GetCategoryUseCase,
  type AdminCategoryRecord,
  type CategoryRepositoryPort,
} from "@commerceos/core";

/** Category ids of the description evals and tests: the seeded categories' names. */
export const EVAL_CATEGORY_IDS = {
  Mice: "0b6c5c1e-1a11-4c6e-9d70-000000000001",
  Keyboards: "0b6c5c1e-1a11-4c6e-9d70-000000000002",
  Headsets: "0b6c5c1e-1a11-4c6e-9d70-000000000003",
  Controllers: "0b6c5c1e-1a11-4c6e-9d70-000000000004",
  Mousepads: "0b6c5c1e-1a11-4c6e-9d70-000000000005",
} as const;

export type EvalCategoryName = keyof typeof EVAL_CATEGORY_IDS;

/** An in-memory, read-only category repository holding the seeded categories. */
export function evalCategoryRepository(): CategoryRepositoryPort {
  const records: AdminCategoryRecord[] = Object.entries(EVAL_CATEGORY_IDS).map(([name, id]) => ({
    id,
    slug: name.toLowerCase(),
    name,
    description: null,
    productCount: 0,
  }));
  const readOnly = async (): Promise<never> => {
    throw new Error("The description evals never write categories");
  };
  return {
    list: async () => records,
    findById: async (id) => records.find((record) => record.id === id) ?? null,
    listProducts: async () => [],
    create: readOnly,
    update: readOnly,
    deleteIfEmpty: readOnly,
  };
}

/** The real `GetCategoryUseCase` over `evalCategoryRepository`. */
export function evalCategories(): GetCategoryUseCase {
  return new GetCategoryUseCase({ categoryRepository: evalCategoryRepository() });
}
