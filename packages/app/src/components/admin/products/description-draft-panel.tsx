"use client";

import { useActionState } from "react";
import {
  createDraftPanelAction,
  draftPanelHandlers,
  IDLE_DRAFT_STATE,
} from "./description-draft-client";
import { DescriptionDraftPanelView } from "./description-draft-panel-view";

// Called as a plain function (no `this`), which the global fetch accepts.
const draftPanelAction = createDraftPanelAction(fetch);

/** Thin client wrapper: `useActionState` over the JSON route plus the view, no branches. */
export function DescriptionDraftPanel({ available }: { available: boolean }) {
  const [state, dispatch, pending] = useActionState(draftPanelAction, IDLE_DRAFT_STATE);
  return (
    <DescriptionDraftPanelView
      available={available}
      state={state}
      pending={pending}
      {...draftPanelHandlers(dispatch)}
    />
  );
}
