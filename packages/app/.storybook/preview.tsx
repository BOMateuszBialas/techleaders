import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { fontVariables } from "@/app/fonts";
import "../src/app/globals.css";

/**
 * The default theme of this run. `vitest.storybook.config.mts` defines it per project, so the same
 * stories are tested in both themes; in `storybook dev` it is undefined and the toolbar decides.
 */
declare const __COMMERCEOS_STORYBOOK_THEME__: "light" | "dark" | undefined;
const defaultTheme =
  typeof __COMMERCEOS_STORYBOOK_THEME__ === "undefined" ? "light" : __COMMERCEOS_STORYBOOK_THEME__;

// The font variables go on <html> once, as in the root layout, so docs pages (which render
// blocks without a story decorator) use Archivo too.
document.documentElement.classList.add(...fontVariables.split(" "));

/**
 * Theme and density go on `<html>`, like in the app (spec A4, prompt rule 9), so dialogs, menus
 * and popovers that Base UI renders in a portal outside the story get them too.
 */
const withThemeAndDensity: Decorator = (Story, context) => {
  const root = document.documentElement;
  root.classList.toggle("dark", context.globals.theme === "dark");
  if (context.globals.density === "admin") root.setAttribute("data-density", "admin");
  else root.removeAttribute("data-density");
  return <Story />;
};

const preview: Preview = {
  decorators: [withThemeAndDensity],
  globalTypes: {
    theme: {
      description: "Color theme (the .dark class on <html>)",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: "Density scope (data-density on <html>, P15)",
      toolbar: {
        title: "Density",
        icon: "component",
        items: [
          { value: "store", title: "Store" },
          { value: "admin", title: "Admin" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: defaultTheme, density: "store" },
  parameters: {
    layout: "padded",
    // Accessibility violations fail the story test (lesson 06, prompt stage 1).
    a11y: { test: "error" },
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          "Design system",
          "Foundations",
          [
            "Colors",
            "Typography",
            "Spacing and layout",
            "Shape and depth",
            "Motion",
            "Icons",
            "Themes",
          ],
          "Primitives",
          "Product",
          "Patterns",
        ],
      },
    },
  },
};

export default preview;
