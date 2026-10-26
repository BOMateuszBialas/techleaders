import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// The prototype imports the implemented components and tokens from the app's source
// (packages/app/src) through the `@/` alias, the same alias the app uses. Nothing is copied.
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const appSrc = fileURLToPath(new URL("../../../packages/app/src", import.meta.url));
const coreSrc = fileURLToPath(new URL("../../../packages/core/src", import.meta.url));
const shimLink = fileURLToPath(new URL("./src/shims/next-link.tsx", import.meta.url));

export default defineConfig({
  // Use this prototype tsconfig for every file, including the app sources it imports. Without it,
  // Vite would pick packages/app/tsconfig.json, which extends an app-only workspace package.
  tsconfig: "./tsconfig.json",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${appSrc}/$1` },
      { find: /^@core\/(.*)$/, replacement: `${coreSrc}/$1` },
      { find: /^next\/link$/, replacement: shimLink },
    ],
    // Files under packages/app resolve bare imports from this package's node_modules.
    dedupe: [
      "react",
      "react-dom",
      "@base-ui/react",
      "class-variance-authority",
      "cn",
      "@tabler/icons-react",
    ],
  },
  server: { fs: { allow: [repoRoot] }, port: 5180, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
