import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/postgresql";
import { SeedManager } from "@mikro-orm/seeder";
import { createOrmConfig } from "../config";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = resolve(packageRoot, "../..");

/** Loads the repo-root `.env` for local CLI runs. Real environment variables take precedence. */
export function loadRootEnv(): void {
  const envFile = resolve(repoRoot, ".env");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env (repo root) and adjust it.");
    process.exit(1);
  }
  return url;
}

/** ORM instance for CLI tasks (migrations, seeding). Not used by the web app. */
export async function initCliOrm(): Promise<MikroORM> {
  loadRootEnv();
  return initToolingOrm(requireDatabaseUrl());
}

/** ORM with the migrator and seeder extensions, for CLI scripts and integration tests. */
export async function initToolingOrm(databaseUrl: string): Promise<MikroORM> {
  const config = createOrmConfig({ databaseUrl });
  return MikroORM.init({
    ...config,
    // CLI scripts own their context explicitly, so the global EM is acceptable here.
    allowGlobalContext: true,
    extensions: [Migrator, SeedManager],
    migrations: {
      path: resolve(packageRoot, "src/migrations"),
      pathTs: resolve(packageRoot, "src/migrations"),
      glob: "!(*.d).{js,ts}",
      transactional: true,
      allOrNothing: true,
      snapshot: false,
    },
    seeder: {
      path: resolve(packageRoot, "src/seeders"),
      pathTs: resolve(packageRoot, "src/seeders"),
      defaultSeeder: "DatabaseSeeder",
    },
  });
}
