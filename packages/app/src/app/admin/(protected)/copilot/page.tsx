import { SUGGESTED_QUESTIONS } from "@commerceos/ai";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ADVISORY_TEXT } from "@/components/admin/copilot/copilot-copy";
import { CopilotPanel } from "@/components/admin/copilot/copilot-panel";
import { requireAdminPage } from "@/server/auth/require-admin";

export const metadata: Metadata = { title: "Commerce Copilot" };

/**
 * Commerce Copilot (Copilot spec, Phase 1): a static shell with the advisory banner; the panel
 * renders once the session is checked. Answers come from `POST /api/admin/copilot/answers`.
 */
export default function CopilotPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Commerce Copilot</h1>
        <p role="note" className="rounded-md border bg-muted/40 p-3 text-sm">
          {ADVISORY_TEXT}
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Copilot…</p>}>
        <CopilotSection />
      </Suspense>
    </div>
  );
}

async function CopilotSection() {
  await requireAdminPage();
  const questions = SUGGESTED_QUESTIONS.map(({ id, question }) => ({ intent: id, question }));
  return <CopilotPanel questions={questions} />;
}
