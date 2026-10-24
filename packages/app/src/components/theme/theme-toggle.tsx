"use client";

import { useEffect } from "react";
import { bindThemeControlsInBrowser, THEME_INPUT_NAME, THEME_OPTIONS } from "@/lib/theme/theme";

/**
 * The theme switch (design system spec A5): a native radio group, so arrow keys, focus order
 * and the announced role come from the browser (WAI-ARIA APG "Radio Group"). It has no
 * branches: the effect (`bindThemeControlsInBrowser`) checks the stored choice and applies
 * changes. The server renders "System" checked; without JavaScript the page stays light.
 */
export function ThemeToggle() {
  useEffect(bindThemeControlsInBrowser, []);
  return (
    <fieldset className="flex flex-col gap-related">
      <legend className="type-small mb-related text-muted-foreground">Theme</legend>
      <div className="inline-flex w-fit gap-1 rounded-control border border-input p-1">
        {THEME_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="inline-flex h-control-sm cursor-pointer items-center rounded-sm px-3 type-small text-muted-foreground transition-colors hover:text-foreground has-checked:bg-secondary has-checked:text-secondary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
          >
            <input
              type="radio"
              name={THEME_INPUT_NAME}
              value={option.value}
              defaultChecked={option.value === "system"}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
