import "server-only";
import { UnconfiguredLlmProvider, type LlmProviderPort } from "@commerceos/ai";
import {
  GetCatalogProductUseCase,
  GetSystemHealthUseCase,
  ListCatalogCategoriesUseCase,
  ListCatalogProductsUseCase,
  type CatalogReadPort,
  type HealthCheckPort,
} from "@commerceos/core";
import {
  DatabaseCatalogRepository,
  DatabaseHealthCheck,
  MikroORM,
  createOrmConfig,
  type EntityManager,
} from "@commerceos/database";
import {
  InjectionMode,
  asClass,
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
} from "awilix";
import type { Pool } from "pg";
import { createAuth, type Auth, type AuthLogLevel } from "./auth/create-auth";
import { createAuthPool } from "./auth/create-auth-pool";
import { getEnv, type Env } from "./env";
import { logger } from "./logger";

/**
 * Composition root: the only place where infrastructure is instantiated
 * and wired to application services.
 *
 * Lifetimes:
 * - singleton: process-wide, stateless or connection-pool objects (env, orm, llm, health checks,
 *              the Better Auth instance and its pool: every auth call receives the request headers)
 * - scoped:    one per request (EntityManager fork, use cases that touch the EM)
 *
 * Strict mode makes Awilix throw if a singleton depends on a scoped
 * registration, so a request-scoped EntityManager can never leak into a
 * shared singleton.
 */
export type Cradle = {
  env: Env;
  orm: MikroORM;
  em: EntityManager;
  llmProvider: LlmProviderPort;
  healthChecks: HealthCheckPort[];
  databaseHealthCheck: DatabaseHealthCheck;
  getSystemHealthUseCase: GetSystemHealthUseCase;
  catalogRepository: CatalogReadPort;
  listCatalogCategoriesUseCase: ListCatalogCategoriesUseCase;
  listCatalogProductsUseCase: ListCatalogProductsUseCase;
  getCatalogProductUseCase: GetCatalogProductUseCase;
  authPool: Pool;
  auth: Auth;
};

function buildContainer(): AwilixContainer<Cradle> {
  const env = getEnv();
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    env: asValue(env),
    orm: asFunction(
      () =>
        new MikroORM(createOrmConfig({ databaseUrl: env.DATABASE_URL, debug: env.DATABASE_DEBUG })),
    )
      .singleton()
      .disposer((orm) => orm.close()),
    // Every request gets its own identity map / unit of work.
    em: asFunction(({ orm }: Pick<Cradle, "orm">) => orm.em.fork()).scoped(),
    // TODO(copilot): select a real adapter from LLM_PROVIDER once one is implemented.
    llmProvider: asClass(UnconfiguredLlmProvider).singleton(),
    databaseHealthCheck: asClass(DatabaseHealthCheck).singleton(),
    healthChecks: asFunction(({ databaseHealthCheck }: Pick<Cradle, "databaseHealthCheck">) => [
      databaseHealthCheck,
    ]).singleton(),
    getSystemHealthUseCase: asClass(GetSystemHealthUseCase).scoped(),
    // Storefront catalog: the adapter uses the request's EntityManager, so it and its use cases are scoped.
    catalogRepository: asClass(DatabaseCatalogRepository).scoped(),
    listCatalogCategoriesUseCase: asClass(ListCatalogCategoriesUseCase).scoped(),
    listCatalogProductsUseCase: asClass(ListCatalogProductsUseCase).scoped(),
    getCatalogProductUseCase: asClass(GetCatalogProductUseCase).scoped(),
    authPool: asFunction(() => createAuthPool(env.DATABASE_URL))
      .singleton()
      .disposer((pool) => pool.end()),
    auth: asFunction(({ authPool }: Pick<Cradle, "authPool">) =>
      createAuth({ pool: authPool, env, log: logAuthMessage }),
    ).singleton(),
  });

  return container;
}

/** Routes Better Auth's own log lines through the redacting server logger. */
export function logAuthMessage(level: AuthLogLevel, message: string): void {
  logger[level === "debug" ? "info" : level](message);
}

// Cached on globalThis so dev-mode hot reloads do not open a new connection pool each time.
const globalForContainer = globalThis as typeof globalThis & {
  __commerceosContainer?: AwilixContainer<Cradle>;
};

function getRootContainer(): AwilixContainer<Cradle> {
  globalForContainer.__commerceosContainer ??= buildContainer();
  return globalForContainer.__commerceosContainer;
}

/**
 * Creates a request scope. Call it once per request (route handler, server
 * action or server component) and resolve dependencies from the result.
 */
export function createRequestScope(): AwilixContainer<Cradle> {
  return getRootContainer().createScope();
}

/**
 * The Better Auth singleton. Resolve it only at request time (never at import or while
 * prerendering): the instance checks the database schema when it first initialises.
 */
export function getAuth(): Auth {
  return getRootContainer().cradle.auth;
}

/**
 * Disposes the process-wide container (closes the connection pool) so the
 * next request builds a fresh one. For graceful shutdown and tests.
 */
export async function disposeRootContainer(): Promise<void> {
  const container = globalForContainer.__commerceosContainer;
  globalForContainer.__commerceosContainer = undefined;
  await container?.dispose();
}
