import { SUGGESTED_QUESTIONS } from "@commerceos/ai";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADVISORY_TEXT } from "@/components/admin/copilot/copilot-copy";
import { CopilotPanel } from "@/components/admin/copilot/copilot-panel";
import { RecommendationStatusesProvider } from "@/components/admin/copilot/recommendation-statuses";
import { SavedRecommendationsView } from "@/components/admin/copilot/saved-recommendations-view";
import { requireAdminPage } from "@/server/auth/require-admin";
import { changeRecommendationStatus } from "@/server/copilot/recommendation.action";
import { loadCopilotRecommendations } from "./load-copilot";

export const metadata: Metadata = { title: "Commerce Copilot" };

/**
 * Commerce Copilot (Copilot spec, Phases 1 and 4): a static shell with the advisory banner; the
 * panel and "Your recommendations" render once the session is checked. Answers come from
 * `POST /api/admin/copilot/answers`; save, dismiss and complete go through the
 * `changeRecommendationStatus` server action. `?page=` pages "Your recommendations".
 */
export default function CopilotPage({ searchParams }: PageProps<"/admin/copilot">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Commerce Copilot</h1>
        <Alert variant="info" role="note">
          <AlertDescription>{ADVISORY_TEXT}</AlertDescription>
        </Alert>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Copilot…</p>}>
        <CopilotSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CopilotSection({ searchParams }: Pick<PageProps<"/admin/copilot">, "searchParams">) {
  await requireAdminPage();
  const questions = SUGGESTED_QUESTIONS.map(({ id, question }) => ({ intent: id, question }));
  const result = await loadCopilotRecommendations((await searchParams).page);
  return (
    // One provider for both sections: a status change in either shows in the other (#67).
    <RecommendationStatusesProvider>
      <div className="flex flex-col gap-10">
        <CopilotPanel questions={questions} statusAction={changeRecommendationStatus} />
        <SavedRecommendationsView
          list={result.kind === "ok" ? result.data : null}
          statusAction={changeRecommendationStatus}
        />
      </div>
    </RecommendationStatusesProvider>
  );
}
