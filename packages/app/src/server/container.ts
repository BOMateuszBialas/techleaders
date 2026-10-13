import "server-only";
import { UnconfiguredLlmProvider, type LlmProviderPort } from "@commerceos/ai";
import { GetSystemHealthUseCase, type HealthCheckPort } from "@commerceos/core";
import {
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
import { getEnv, type Env } from "./env";

/**
 * Composition root: the only place where infrastructure is instantiated
 * and wired to application services.
 *
 * Lifetimes:
 * - singleton: process-wide, stateless or connection-pool objects (env, orm, llm, health checks)
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
  });

  return container;
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
