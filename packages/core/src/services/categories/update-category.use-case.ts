import { NotFoundError } from "../../errors/app-error";
import type { AdminCategoryRecord, CategoryRepositoryPort } from "../../ports/catalog.port";
import type { CategoryInput } from "../../validators/categories/category-input.schema";
import { isUuid } from "../../validators/common/uuid.schema";
import { CATEGORY_NOT_FOUND_MESSAGE } from "./category.dto";

/** Updates a category. A malformed or unknown id is `NotFoundError`; a taken slug a conflict. */
export class UpdateCategoryUseCase {
  constructor(private readonly deps: { categoryRepository: CategoryRepositoryPort }) {}

  async execute(input: { id: string; values: CategoryInput }): Promise<AdminCategoryRecord> {
    if (!isUuid(input.id)) throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    const updated = await this.deps.categoryRepository.update(input.id, input.values);
    if (!updated) throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    return updated;
  }
}
