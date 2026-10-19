import { descriptionDraftSchema } from "@commerceos/core";
import { adminApiHandler } from "@/server/auth/require-admin";
import { createRequestScope } from "@/server/container";
import { parseRequestBody } from "@/server/http/api-handler";
import { jsonOk } from "@/server/http/api-result";

/**
 * POST /api/admin/products/description-drafts (descriptions spec, API Contracts): the product
 * form's `{ name, categoryId, price, notes }` → `ApiResult<DescriptionDraftDto>`. 400 invalid
 * body or unknown category, 401 no session, 429 too many drafts, 500 generic (database down).
 * An AI failure is a 200 with `kind: "unavailable"`. Nothing is stored or written.
 */
export const POST = adminApiHandler(
  "POST /api/admin/products/description-drafts",
  async (request, admin) => {
    const input = await parseRequestBody(request, descriptionDraftSchema);
    const scope = createRequestScope();
    try {
      return jsonOk(await scope.cradle.draftProductDescriptionUseCase.execute(input, admin));
    } finally {
      await scope.dispose();
    }
  },
);
