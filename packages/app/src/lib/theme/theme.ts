/**
 * Light and dark theme (design system spec A4–A5, tokeny.md rule 19, decision "Motyw"). The
 * theme is the `.dark` class on `<html>`; the choice (`light`, `dark` or `system`) lives in
 * `localStorage`, and no entry means "follow the system". The server always renders the same
 * HTML, so prerendering and cache components are unaffected: an inline script in `<head>` sets
 * the class before the first paint, and the theme toggle keeps it in sync after hydration
 * (Next 16 guide "Preventing flash before hydration").
 */

export const THEME_STORAGE_KEY = "commerceos-theme";
/** The `name` of the toggle's radio inputs. */
export const THEME_INPUT_NAME = "theme";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export type ThemeChoice = "light" | "dark" | "system";
export type Theme = "light" | "dark";

/** The toggle's options, in display order. */
export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** A stored value as a choice; anything unknown or missing means "system". */
export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Theme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Reads the choice; storage that is missing or throws (private mode) means "system". */
export function readThemeChoice(getStorage: () => StorageLike): ThemeChoice {
  try {
    return parseThemeChoice(getStorage().getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Saves the choice ("system" removes the entry). Blocked storage keeps it for this page only. */
export function storeThemeChoice(getStorage: () => StorageLike, choice: ThemeChoice): void {
  try {
    const storage = getStorage();
    if (choice === "system") storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage is unavailable (private mode, blocked site data): the choice lasts until reload.
  }
}

export function applyTheme(root: Pick<HTMLElement, "classList">, theme: Theme): void {
  root.classList.toggle("dark", theme === "dark");
}

/**
 * The inline `<head>` script: the same rules as `readThemeChoice` + `resolveTheme` +
 * `applyTheme`, as plain ES5 that runs while the HTML is parsed (unit tests run it).
 */
export const THEME_INIT_SCRIPT = `(function(){var c=null;try{c=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var d=c==="dark"||(c!=="light"&&window.matchMedia(${JSON.stringify(
  DARK_SCHEME_QUERY,
)}).matches);document.documentElement.classList.toggle("dark",d)})()`;

/** The value of a changed theme radio, or null for any other form control on the page. */
function themeInputValue(target: EventTarget | null): string | null {
  if (target === null || !("name" in target) || target.name !== THEME_INPUT_NAME) return null;
  return "value" in target && typeof target.value === "string" ? target.value : null;
}

type ThemeInput = { value: string; checked: boolean };
type ThemeDocument = Pick<Document, "addEventListener" | "removeEventListener"> & {
  documentElement: Pick<HTMLElement, "classList">;
  querySelectorAll(selector: string): Iterable<ThemeInput>;
};
type ThemeWindow = {
  localStorage: StorageLike;
  matchMedia(
    query: string,
  ): Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
};

/**
 * Connects every theme radio group on the page: checks the stored choice, applies the theme
 * again (React's Strict Mode remount in development clears the class the script set), saves a
 * new choice, and follows the system setting while the choice is "system". Returns the cleanup.
 */
export function bindThemeControls(doc: ThemeDocument, win: ThemeWindow): () => void {
  const getStorage = () => win.localStorage;
  const systemDark = win.matchMedia(DARK_SCHEME_QUERY);
  let choice = readThemeChoice(getStorage);
  const selector = `input[name="${THEME_INPUT_NAME}"]`;

  const sync = () => {
    for (const input of doc.querySelectorAll(selector)) input.checked = input.value === choice;
    applyTheme(doc.documentElement, resolveTheme(choice, systemDark.matches));
  };
  const onChange = (event: Event) => {
    const value = themeInputValue(event.target);
    if (value === null) return;
    choice = parseThemeChoice(value);
    storeThemeChoice(getStorage, choice);
    sync();
  };

  sync();
  doc.addEventListener("change", onChange);
  systemDark.addEventListener("change", sync);
  return () => {
    doc.removeEventListener("change", onChange);
    systemDark.removeEventListener("change", sync);
  };
}

/** The toggle's effect: `bindThemeControls` on the real document. Browser only. */
export function bindThemeControlsInBrowser(): () => void {
  return bindThemeControls(document, window);
}
