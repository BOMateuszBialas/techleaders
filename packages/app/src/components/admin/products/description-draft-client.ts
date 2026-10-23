import type {
  DescriptionDraftDto,
  DescriptionField,
  DescriptionUnavailableReason,
} from "@commerceos/ai";
import { startTransition } from "react";
import type { ApiResult } from "@/server/http/api-result";
import {
  DESCRIPTION_DRAFTS_URL,
  RATE_LIMITED_TEXT,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_REASON_TEXT,
  UNAVAILABLE_TEXT,
  UNDO_UNAVAILABLE_TEXT,
} from "./description-draft-copy";

/**
 * How a message reads: `guidance` when the owner can act on it in the form (a field to fill in,
 * Undo no longer possible), `error` for a failure or a limit. Only errors use the error colour.
 */
export type MessageTone = "guidance" | "error";

/**
 * The draft panel's states (descriptions spec, UI/UX). `ready` holds the checked draft;
 * `applied` holds the description it replaced, so Undo can restore it, and the draft it put in,
 * so Undo can tell whether the owner has changed or saved it since; `message` is every case in
 * which no draft is shown (a reason, the per-owner limit, a field error, a failure).
 */
export type DraftPanelState =
  | { kind: "idle" }
  | { kind: "ready"; text: string; fieldsUsed: DescriptionField[] }
  | { kind: "applied"; previous: string; text: string }
  | { kind: "message"; message: string; tone: MessageTone };

export const IDLE_DRAFT_STATE: DraftPanelState = { kind: "idle" };

/** Reasons the owner resolves in the form itself, not failures. */
const GUIDANCE_REASONS: ReadonlySet<DescriptionUnavailableReason> = new Set([
  "insufficient_input",
  "not_configured",
]);

const errorMessage = (message: string) => ({ kind: "message", message, tone: "error" }) as const;
const guidanceMessage = (message: string) =>
  ({ kind: "message", message, tone: "guidance" }) as const;

/** What a button asks the panel to do; `form` is the product form the button belongs to. */
export type DraftCommand =
  | { type: "draft"; form: HTMLFormElement | null }
  | { type: "apply"; form: HTMLFormElement | null }
  | { type: "undo"; form: HTMLFormElement | null }
  | { type: "discard" };

/** The product form's values as the browser would submit them. */
export function formDataOf(form: HTMLFormElement): FormData {
  return new FormData(form);
}

/** The four fields a draft uses (A4): the form's current values, the description as notes. */
export function readDraftFields(data: FormData) {
  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    name: text("name"),
    categoryId: text("categoryId"),
    price: text("price"),
    notes: text("description"),
  };
}

/** The form's Description textarea, or null when the form has none. */
export function descriptionFieldOf(form: HTMLFormElement | null): HTMLTextAreaElement | null {
  const field = form?.elements.namedItem("description");
  return field instanceof HTMLTextAreaElement ? field : null;
}

async function readResult(response: Response): Promise<ApiResult<DescriptionDraftDto> | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function failureState(status: number, result: ApiResult<DescriptionDraftDto> | null) {
  if (status === 400 && result && !result.ok) {
    // The field message ("Enter a name.") says what to fix; the form-level one does not.
    const [first] = Object.values(result.error.fieldErrors ?? {}).flat();
    return first ? guidanceMessage(first) : errorMessage(result.error.message);
  }
  if (status === 401) return errorMessage(SESSION_ENDED_TEXT);
  if (status === 429) return errorMessage(RATE_LIMITED_TEXT);
  return errorMessage(UNAVAILABLE_TEXT);
}

async function requestDraft(
  fetcher: typeof fetch,
  form: HTMLFormElement | null,
): Promise<DraftPanelState> {
  if (!form) return IDLE_DRAFT_STATE;
  let response: Response;
  try {
    response = await fetcher(DESCRIPTION_DRAFTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readDraftFields(formDataOf(form))),
    });
  } catch {
    return errorMessage(UNAVAILABLE_TEXT);
  }
  const result = await readResult(response);
  if (!response.ok || !result?.ok) return failureState(response.status, result);
  const draft = result.data;
  if (draft.kind === "unavailable") {
    const message = UNAVAILABLE_REASON_TEXT[draft.reason];
    return GUIDANCE_REASONS.has(draft.reason) ? guidanceMessage(message) : errorMessage(message);
  }
  return { kind: "ready", text: draft.text, fieldsUsed: draft.fieldsUsed };
}

/**
 * The panel's action (runs in the browser, through `useActionState`). "draft" posts the form's
 * current values to the JSON route; "apply" copies the draft into the Description textarea and
 * keeps the old text; "undo" puts it back, unless the owner has edited the field or saved the
 * draft since (the field's stored value is then the draft), in which case nothing is
 * overwritten and a message says so; "discard" drops the draft. Nothing is saved: the owner
 * still clicks Save on the product form (R02, N04). Failures become a message; nothing internal
 * is shown.
 */
export function createDraftPanelAction(fetcher: typeof fetch) {
  return async (state: DraftPanelState, command: DraftCommand): Promise<DraftPanelState> => {
    if (command.type === "draft") return requestDraft(fetcher, command.form);
    if (command.type === "discard") return IDLE_DRAFT_STATE;
    const field = descriptionFieldOf(command.form);
    if (command.type === "apply") {
      if (state.kind !== "ready" || !field) return state;
      const previous = field.value;
      field.value = state.text;
      return { kind: "applied", previous, text: state.text };
    }
    if (state.kind !== "applied" || !field) return state;
    const editedOrSaved = field.value !== state.text || field.defaultValue === state.text;
    if (editedOrSaved) return guidanceMessage(UNDO_UNAVAILABLE_TEXT);
    field.value = state.previous;
    return IDLE_DRAFT_STATE;
  };
}

/** A button click as the handlers read it: the button and the form it belongs to. */
export type DraftButtonEvent = { currentTarget: { form: HTMLFormElement | null } };

/**
 * The panel's click handlers: each dispatches one command inside a transition (an async
 * `useActionState` action must run in one). The buttons are `type="button"`, so a click never
 * submits the product form.
 */
export function draftPanelHandlers(dispatch: (command: DraftCommand) => void) {
  const send = (command: DraftCommand) => startTransition(() => dispatch(command));
  return {
    onDraft: (event: DraftButtonEvent) => send({ type: "draft", form: event.currentTarget.form }),
    onApply: (event: DraftButtonEvent) => send({ type: "apply", form: event.currentTarget.form }),
    onUndo: (event: DraftButtonEvent) => send({ type: "undo", form: event.currentTarget.form }),
    onDiscard: () => send({ type: "discard" }),
  };
}
