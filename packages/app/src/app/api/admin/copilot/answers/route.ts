import { askCopilotSchema } from "@commerceos/core";
import {
  COPILOT_DATA_UNAVAILABLE_CODE,
  COPILOT_DATA_UNAVAILABLE_MESSAGE,
  isCopilotDataUnavailable,
} from "@commerceos/ai";
import { adminApiHandler } from "@/server/auth/require-admin";
import { createRequestScope } from "@/server/container";
import { parseRequestBody } from "@/server/http/api-handler";
import { jsonError, jsonOk } from "@/server/http/api-result";

/**
 * POST /api/admin/copilot/answers (Copilot spec, API Contracts): `{ question }` or
 * `{ intent }` → `ApiResult<CopilotAnswerDto>`. 400 invalid body, 401 no session, 429 too many
 * questions, 503 `COPILOT_DATA_UNAVAILABLE` when a store read failed (FALL-02: no recommendation,
 * the page shows its unavailable state), 500 generic for anything else. Copilot reads store data
 * and never changes it.
 */
export const POST = adminApiHandler("POST /api/admin/copilot/answers", async (request, admin) => {
  const input = await parseRequestBody(request, askCopilotSchema);
  const scope = createRequestScope();
  try {
    return jsonOk(await scope.cradle.askCopilotUseCase.execute(input, admin));
  } catch (error) {
    if (isCopilotDataUnavailable(error)) {
      return jsonError(
        { code: COPILOT_DATA_UNAVAILABLE_CODE, message: COPILOT_DATA_UNAVAILABLE_MESSAGE },
        503,
      );
    }
    throw error;
  } finally {
    await scope.dispose();
  }
});
