import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/server/http/security-headers";

// One `.env` for the whole monorepo lives at the repository root. Next.js only
// loads env files from this package directory, so load the root file here.
// Real environment variables always take precedence.
const rootEnvFile = resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Hide the framework name (X-Powered-By: Next.js) from every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
  // The Turbopack root is auto-detected from the root package-lock.json (npm workspaces).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
