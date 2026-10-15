import { ConflictError, NotFoundError } from "../../errors/app-error";
import type { CategoryRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { CATEGORY_NOT_FOUND_MESSAGE } from "./category.dto";

/** Why a category cannot be deleted yet (spec API Contracts, `deleteCategory`). */
export function categoryInUseMessage(productCount: number): string {
  return productCount === 1
    ? "1 product still uses this category. Move it to another category or remove the category from it first."
    : `${productCount} products still use this category. Move them to another category or remove the category from them first.`;
}

/**
 * Deletes an empty category (spec A3, G1). A category that products still use is refused
 * with a `ConflictError` naming the count, so the FK rule `on delete set null` is never
 * reached through the admin. The repository locks the row first, so the check is race-free.
 */
export class DeleteCategoryUseCase {
  constructor(private readonly deps: { categoryRepository: CategoryRepositoryPort }) {}

  async execute(input: { id: string }): Promise<void> {
    if (!isUuid(input.id)) throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    const result = await this.deps.categoryRepository.deleteIfEmpty(input.id);
    if (result.kind === "not_found") throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    if (result.kind === "in_use")
      throw new ConflictError(categoryInUseMessage(result.productCount));
  }
}
