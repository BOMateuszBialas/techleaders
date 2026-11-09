import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// One `.env` for the whole monorepo lives at the repository root. Next.js only
// loads env files from this package directory, so load the root file here.
// Real environment variables always take precedence.
const rootEnvFile = resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

// Response headers for every route. This is the safe subset: it stops clickjacking, MIME
// sniffing and needless data leaks, and it does not change how scripts load. A full script
// CSP needs per-request nonces (proxy), which forces dynamic rendering and conflicts with
// cacheComponents, so that is a separate decision. The list is inlined here (not imported),
// because Next compiles this file on its own; the e2e test security-headers.e2e.test.ts checks it.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Self-contained server for the Docker image (`node .next/standalone/packages/app/server.js`).
  output: "standalone",
  // Monorepo: trace from the repository root, so the workspace packages (TypeScript source,
  // no build step) and the hoisted node_modules are included in the standalone output.
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  // Hide the framework name (X-Powered-By: Next.js) from every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
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
