/** The query parameter that carries a fixed notice code after a redirect (`?notice=created`). */
export const NOTICE_PARAM = "notice";

/**
 * The same address without `?notice=`, as a path plus the remaining query and hash, or null
 * when there is no notice to drop.
 */
export function addressWithoutNotice(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(NOTICE_PARAM)) return null;
  url.searchParams.delete(NOTICE_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The id of the rendered notice, so the submit listener can hide it. */
export const REDIRECT_NOTICE_ID = "redirect-notice";

/**
 * Retires a redirect notice once it is on screen (#41). It drops `?notice=` from the address bar
 * (Next.js keeps its router in sync with `history.replaceState`, "Native History API" in the
 * Next 16 docs), so a reload does not show it again, and it hides the notice on the next form
 * submit on the page, so a later save, publish or stock change shows only its own message.
 * Runs in the browser only, as the effect of `RedirectNotice`; returns the effect cleanup.
 */
export function retireRedirectNotice(): () => void {
  const next = addressWithoutNotice(window.location.href);
  if (next !== null) window.history.replaceState(window.history.state, "", next);
  const hide = () => document.getElementById(REDIRECT_NOTICE_ID)?.setAttribute("hidden", "");
  document.addEventListener("submit", hide, { once: true });
  return () => document.removeEventListener("submit", hide);
}
