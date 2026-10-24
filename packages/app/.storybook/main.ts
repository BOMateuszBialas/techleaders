import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import remarkGfm from "remark-gfm";

/**
 * Storybook for the CommerceOS design system (spec .ai/specs/2026-10-24-design-system.md).
 * Stories live in packages/app/stories/, outside src/ (no coverage exclusion, spec A2) and outside
 * this dot-directory (the Vitest addon only turns stories it can glob into tests).
 */
const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    {
      name: "@storybook/addon-docs",
      // Markdown tables in MDX pages (prompt rule 8).
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Only the product's name in the UI: no onboarding checklist (prompt rule 10).
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  // The app compiles Tailwind with Turbopack; Storybook builds with Vite, so it needs the Vite
  // plugin to compile the same globals.css.
  viteFinal(viteConfig) {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
