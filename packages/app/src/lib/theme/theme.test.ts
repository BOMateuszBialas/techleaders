import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  applyTheme,
  bindThemeControls,
  bindThemeControlsInBrowser,
  DARK_SCHEME_QUERY,
  parseThemeChoice,
  readThemeChoice,
  resolveTheme,
  storeThemeChoice,
  THEME_INIT_SCRIPT,
  THEME_INPUT_NAME,
  THEME_STORAGE_KEY,
} from "./theme";

afterEach(() => {
  vi.unstubAllGlobals();
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("blocked");
  };
  return { getItem: vi.fn(fail), setItem: vi.fn(fail), removeItem: vi.fn(fail) };
}

function classList(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    classes,
    toggle: vi.fn((name: string, force?: boolean) => {
      if (force) classes.add(name);
      else classes.delete(name);
      return Boolean(force);
    }),
  };
}

describe("theme choice", () => {
  it("accepts light and dark and treats anything else as system", () => {
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("system")).toBe("system");
    expect(parseThemeChoice("sepia")).toBe("system");
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice(undefined)).toBe("system");
  });

  it("resolves system from the color-scheme preference and keeps an explicit choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("reads the stored choice, and falls back to system when storage is blocked", () => {
    expect(readThemeChoice(() => memoryStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
    expect(readThemeChoice(() => memoryStorage())).toBe("system");
    expect(readThemeChoice(() => throwingStorage())).toBe("system");
    expect(
      readThemeChoice(() => {
        throw new Error("no localStorage");
      }),
    ).toBe("system");
  });

  it("stores light and dark, removes the entry for system, and ignores blocked storage", () => {
    const storage = memoryStorage();
    storeThemeChoice(() => storage, "dark");
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("dark");
    storeThemeChoice(() => storage, "system");
    expect(storage.data.has(THEME_STORAGE_KEY)).toBe(false);
    expect(() => storeThemeChoice(() => throwingStorage(), "light")).not.toThrow();
  });

  it("toggles the dark class on the root element", () => {
    const list = classList();
    applyTheme({ classList: list as unknown as DOMTokenList }, "dark");
    expect(list.classes.has("dark")).toBe(true);
    applyTheme({ classList: list as unknown as DOMTokenList }, "light");
    expect(list.classes.has("dark")).toBe(false);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  function run(stored: string | null, systemDark: boolean, storageThrows = false) {
    const list = classList();
    const localStorage = storageThrows
      ? throwingStorage()
      : memoryStorage(stored === null ? {} : { [THEME_STORAGE_KEY]: stored });
    const matchMedia = vi.fn(() => ({ matches: systemDark }));
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { matchMedia });
    vi.stubGlobal("document", { documentElement: { classList: list } });
    new Function(THEME_INIT_SCRIPT)();
    return { dark: list.classes.has("dark"), matchMedia };
  }

  it("applies the stored choice before the first paint", () => {
    expect(run("dark", false).dark).toBe(true);
    expect(run("light", true).dark).toBe(false);
  });

  it("follows the system setting without a stored choice, or when storage is blocked", () => {
    const { dark, matchMedia } = run(null, true);
    expect(dark).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(DARK_SCHEME_QUERY);
    expect(run(null, false).dark).toBe(false);
    expect(run(null, true, true).dark).toBe(true);
  });
});

describe("bindThemeControls", () => {
  function setup(stored: string | null, systemDark = false) {
    const inputs = ["light", "dark", "system"].map((value) => ({ value, checked: false }));
    const list = classList(["dark"]);
    const docListeners = new Map<string, (event: Event) => void>();
    const doc = {
      documentElement: { classList: list as unknown as DOMTokenList },
      querySelectorAll: vi.fn(() => inputs),
      addEventListener: vi.fn((type: string, listener: (event: Event) => void) =>
        docListeners.set(type, listener),
      ),
      removeEventListener: vi.fn(),
    };
    let systemListener: (() => void) | undefined;
    const media = {
      matches: systemDark,
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        systemListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    const storage = memoryStorage(stored === null ? {} : { [THEME_STORAGE_KEY]: stored });
    const win = { localStorage: storage, matchMedia: vi.fn(() => media) };
    const cleanup = bindThemeControls(doc, win);
    const change = (target: unknown) =>
      docListeners.get("change")?.({ target } as unknown as Event);
    return { inputs, list, doc, media, storage, cleanup, change, system: () => systemListener?.() };
  }

  const checked = (inputs: Array<{ value: string; checked: boolean }>) =>
    inputs.filter((input) => input.checked).map((input) => input.value);

  it("checks the stored choice and applies it again on mount", () => {
    const { inputs, list, doc } = setup("light");
    expect(checked(inputs)).toEqual(["light"]);
    expect(list.classes.has("dark")).toBe(false);
    expect(doc.querySelectorAll).toHaveBeenCalledWith(`input[name="${THEME_INPUT_NAME}"]`);
  });

  it("saves a new choice from the radio group and applies it", () => {
    const { inputs, list, storage, change } = setup(null);
    expect(checked(inputs)).toEqual(["system"]);
    change({ name: THEME_INPUT_NAME, value: "dark" });
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(checked(inputs)).toEqual(["dark"]);
    expect(list.classes.has("dark")).toBe(true);
  });

  it("ignores other form controls and targets without a value", () => {
    const { storage, change } = setup(null);
    change({ name: "q", value: "mouse" });
    change({ name: THEME_INPUT_NAME });
    change({ name: THEME_INPUT_NAME, value: 3 });
    change({});
    change(null);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("follows the system setting while the choice is system", () => {
    const { list, media, system } = setup(null, false);
    expect(list.classes.has("dark")).toBe(false);
    media.matches = true;
    system();
    expect(list.classes.has("dark")).toBe(true);
  });

  it("removes both listeners on cleanup", () => {
    const { doc, media, cleanup } = setup(null);
    cleanup();
    expect(doc.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("binds the real document and window in the browser", () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal("window", { localStorage: memoryStorage(), matchMedia: () => media });
    vi.stubGlobal("document", {
      documentElement: { classList: classList() },
      querySelectorAll: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    expect(bindThemeControlsInBrowser()).toEqual(expect.any(Function));
    expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

describe("ThemeToggle", () => {
  it("renders a labelled radio group with System checked on the server", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle));
    expect(html).toContain("<fieldset");
    expect(html).toMatch(/<legend[^>]*>Theme<\/legend>/);
    expect(html.match(/<input type="radio" class="sr-only" name="theme"/g)).toHaveLength(3);
    expect(html).toMatch(/checked="" value="system"/);
    for (const label of ["Light", "Dark", "System"]) expect(html).toContain(`/>${label}</label>`);
  });
});
