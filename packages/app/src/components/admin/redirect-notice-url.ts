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

/**
 * Removes `?notice=` from the address bar once the notice is on screen (#41), so the next
 * `refresh()` after a save, or a reload, renders the page without it. Next.js keeps its router
 * in sync with `history.replaceState` ("Native History API" in the Next 16 docs). Runs in the
 * browser only, as an effect of `RedirectNotice`.
 */
export function dropNoticeFromAddressBar(): void {
  const next = addressWithoutNotice(window.location.href);
  if (next !== null) window.history.replaceState(window.history.state, "", next);
}
