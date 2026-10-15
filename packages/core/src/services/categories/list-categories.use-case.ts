import type { AdminCategoryRecord, CategoryRepositoryPort } from "../../ports/catalog.port";

/** Every category with its product count, sorted by name. */
export class ListCategoriesUseCase {
  constructor(private readonly deps: { categoryRepository: CategoryRepositoryPort }) {}

  execute(): Promise<AdminCategoryRecord[]> {
    return this.deps.categoryRepository.list();
  }
}
