import type { AdminCategoryRecord, CategoryRepositoryPort } from "../../ports/catalog.port";
import type { CategoryInput } from "../../validators/categories/category-input.schema";

/** Creates a category from validated input. A taken slug is a `UniqueFieldConflictError`. */
export class CreateCategoryUseCase {
  constructor(private readonly deps: { categoryRepository: CategoryRepositoryPort }) {}

  execute(input: CategoryInput): Promise<AdminCategoryRecord> {
    return this.deps.categoryRepository.create(input);
  }
}
