import { NotFoundError } from "../../errors/app-error";
import type { CategoryRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import {
  CATEGORY_NOT_FOUND_MESSAGE,
  CATEGORY_PRODUCT_PREVIEW_LIMIT,
  type AdminCategoryDetail,
} from "./category.dto";

/** One category and up to 10 of its products. A malformed or unknown id is `NotFoundError`. */
export class GetCategoryUseCase {
  constructor(private readonly deps: { categoryRepository: CategoryRepositoryPort }) {}

  async execute(input: { id: string }): Promise<AdminCategoryDetail> {
    if (!isUuid(input.id)) throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    const category = await this.deps.categoryRepository.findById(input.id);
    if (!category) throw new NotFoundError(CATEGORY_NOT_FOUND_MESSAGE);
    const products =
      category.productCount === 0
        ? []
        : await this.deps.categoryRepository.listProducts(
            category.id,
            CATEGORY_PRODUCT_PREVIEW_LIMIT,
          );
    return { ...category, products };
  }
}
