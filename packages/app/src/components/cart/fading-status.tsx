"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "@tabler/icons-react";

/** How long a success message stays on screen (storefront visual polish, 2026-11-05). */
export const STATUS_VISIBLE_MS = 3000;

/**
 * A success line for a cart action: a small check and the green text, with no box or background.
 * It hides itself after `STATUS_VISIBLE_MS`. `token` is what the message came from (the action's
 * result object), so a new result shows the line again even when the text is the same.
 */
export function FadingStatus({ message, token }: { message: string | undefined; token: unknown }) {
  // The token whose message has finished: a new token has none, so its message shows again.
  const [hiddenFor, setHiddenFor] = useState<unknown>(undefined);
  useEffect(() => {
    const timer = setTimeout(() => setHiddenFor(token), STATUS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [token]);
  if (hiddenFor === token) return null;
  return (
    <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
      <IconCheck aria-hidden="true" className="size-4 shrink-0" />
      {message}
    </p>
  );
}
