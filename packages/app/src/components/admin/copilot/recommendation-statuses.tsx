"use client";

import { createContext, useMemo, useReducer, type ReactNode } from "react";
import { NO_SHARED_STATUSES, recordReportedStatus } from "./recommendation-copy";

/** The statuses reported on `/admin/copilot`; see `ReportedStatuses` (#67). */
export const RecommendationStatusesContext = createContext(NO_SHARED_STATUSES);

/**
 * Shares every status a card's action returned with the other cards on the page, so the answer
 * card and the "Your recommendations" card of one recommendation agree. Thin: the reducer and
 * the reporting action live in `recommendation-copy.ts`.
 */
export function RecommendationStatusesProvider({ children }: { children: ReactNode }) {
  const [statuses, report] = useReducer(recordReportedStatus, {});
  const value = useMemo(() => ({ statuses, report }), [statuses]);
  return <RecommendationStatusesContext value={value}>{children}</RecommendationStatusesContext>;
}
