import { askCopilotSchema } from "@commerceos/core";
import { adminApiHandler } from "@/server/auth/require-admin";
import { createRequestScope } from "@/server/container";
import { parseRequestBody } from "@/server/http/api-handler";
import { jsonOk } from "@/server/http/api-result";

/**
 * POST /api/admin/copilot/answers (Copilot spec, API Contracts): `{ question }` or
 * `{ intent }` → `ApiResult<CopilotAnswerDto>`. 400 invalid body, 401 no session, 429 too many
 * questions, 500 generic (database down). Copilot reads store data and never changes it.
 */
export const POST = adminApiHandler("POST /api/admin/copilot/answers", async (request, admin) => {
  const input = await parseRequestBody(request, askCopilotSchema);
  const scope = createRequestScope();
  try {
    return jsonOk(await scope.cradle.askCopilotUseCase.execute(input, admin));
  } finally {
    await scope.dispose();
  }
});
