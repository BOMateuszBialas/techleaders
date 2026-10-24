import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Stories as tests (design system spec A8, A9): every story renders in Chromium, its `play`
 * function runs and accessibility violations fail it (`a11y: { test: "error" }` in preview.tsx).
 * Two projects run the same stories in the light and the dark theme. A separate file from the
 * root vitest.config.mts, so the Storybook plugin never loads for the unit, integration or e2e
 * runs (and never touches the 100% coverage gate).
 *
 *   npm run test:storybook         light theme
 *   npm run test:storybook:dark    dark theme
 *   npm run test:storybook:themes  both
 */

/**
 * Workaround for a Storybook 10.6.3 bug (spec D5): the generated test compares
 * `import.meta.url` with the test file path through `convertToFilePath`, which decodes only
 * `%20`. Under a path with a non-ASCII character (`C:\Users\Użytkownik\…`) no story becomes a
 * test ("No test suite found"). This decodes the whole URL. If Storybook changes the generated
 * code, the replace finds nothing and the plugin does nothing. Remove it once Storybook fixes it.
 */
const decodeStoryFilePath: Plugin = {
  name: "commerceos:decode-story-file-path",
  enforce: "post",
  transform(code, id) {
    if (!id.includes(".stories.")) return null;
    return code.replace(
      "convertToFilePath(import.meta.url)",
      "decodeURIComponent(convertToFilePath(import.meta.url))",
    );
  },
};

const configDir = fileURLToPath(new URL("./.storybook", import.meta.url));

function storybookProject(theme: "light" | "dark") {
  return {
    plugins: [storybookTest({ configDir }), decodeStoryFilePath],
    define: { __COMMERCEOS_STORYBOOK_THEME__: JSON.stringify(theme) },
    test: {
      name: `storybook-${theme}`,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" as const }],
        // Desktop width, so the density tokens apply (below 48rem every control is 44 px tall);
        // narrow-screen stories set their own width.
        viewport: { width: 1280, height: 800 },
      },
    },
  };
}

export default defineConfig({
  test: {
    projects: [storybookProject("light"), storybookProject("dark")],
  },
});
