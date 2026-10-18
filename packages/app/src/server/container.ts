import "server-only";
import {
  AskCopilotUseCase,
  GeminiLlmProvider,
  GetLowStockProductsTool,
  GetOrderSummaryTool,
  GetSalesSummaryTool,
  GetTopProductsTool,
  GetTrafficSummaryTool,
  UnconfiguredLlmProvider,
  type CopilotLogPort,
  type LlmProviderPort,
} from "@commerceos/ai";
import {
  AddToCartUseCase,
  AdjustStockUseCase,
  ChangeOrderStatusUseCase,
  ChangeRecommendationStatusUseCase,
  ConfirmDemoPaymentUseCase,
  CreateCategoryUseCase,
  CreateProductUseCase,
  DeleteCategoryUseCase,
  GetCartUseCase,
  GetAdminOrderUseCase,
  GetCatalogProductUseCase,
  GetDashboardUseCase,
  GetLowStockProductsUseCase,
  GetOrderByReferenceUseCase,
  GetOrderSummaryUseCase,
  GetCategoryUseCase,
  GetProductUseCase,
  GetSalesSummaryUseCase,
  GetSystemHealthUseCase,
  ListAdminOrdersUseCase,
  GetTopProductsUseCase,
  GetTrafficSummaryUseCase,
  ListCatalogCategoriesUseCase,
  ListCatalogProductsUseCase,
  ListCategoriesUseCase,
  ListCopilotRecommendationsUseCase,
  ListFeaturedProductsUseCase,
  ListProductsUseCase,
  ListStockAdjustmentsUseCase,
  PlaceOrderUseCase,
  RemoveCartLineUseCase,
  SaveCopilotAnswerUseCase,
  SetProductStatusUseCase,
  UpdateCartLineUseCase,
  UpdateCategoryUseCase,
  UpdateProductUseCase,
  type CatalogReadPort,
  type Clock,
  type CategoryRepositoryPort,
  type CopilotRecommendationRepositoryPort,
  type HealthCheckPort,
  type OrderAdminPort,
  type OrderRepositoryPort,
  type PaymentGateway,
  type ProductRepositoryPort,
  type RandomBytes,
  type RateLimiterPort,
  type Sha256Hex,
  type StockRepositoryPort,
  type StoreMetricsPort,
  type TrafficStatsPort,
} from "@commerceos/core";
import {
  DatabaseCatalogRepository,
  DatabaseCategoryRepository,
  DatabaseCopilotRecommendationRepository,
  DatabaseHealthCheck,
  DatabaseOrderAdminRepository,
  DatabaseOrderRepository,
  DatabaseProductRepository,
  DatabaseRateLimiter,
  DatabaseStockRepository,
  DatabaseStoreMetrics,
  DatabaseTrafficStats,
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
import {
  createAuth,
  type Auth,
  type AuthErrorSummary,
  type AuthLogLevel,
} from "./auth/create-auth";
import { createAuthPool } from "./auth/create-auth-pool";
import { getEnv, type Env } from "./env";
import { logger } from "./logger";
import { randomBytes, sha256Hex } from "./orders/order-crypto";
import { DemoPaymentGateway } from "./payments/demo-payment-gateway";

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
  listFeaturedProductsUseCase: ListFeaturedProductsUseCase;
  categoryRepository: CategoryRepositoryPort;
  listCategoriesUseCase: ListCategoriesUseCase;
  getCategoryUseCase: GetCategoryUseCase;
  createCategoryUseCase: CreateCategoryUseCase;
  updateCategoryUseCase: UpdateCategoryUseCase;
  deleteCategoryUseCase: DeleteCategoryUseCase;
  productRepository: ProductRepositoryPort;
  listProductsUseCase: ListProductsUseCase;
  getProductUseCase: GetProductUseCase;
  createProductUseCase: CreateProductUseCase;
  updateProductUseCase: UpdateProductUseCase;
  setProductStatusUseCase: SetProductStatusUseCase;
  stockRepository: StockRepositoryPort;
  adjustStockUseCase: AdjustStockUseCase;
  listStockAdjustmentsUseCase: ListStockAdjustmentsUseCase;
  getCartUseCase: GetCartUseCase;
  addToCartUseCase: AddToCartUseCase;
  updateCartLineUseCase: UpdateCartLineUseCase;
  removeCartLineUseCase: RemoveCartLineUseCase;
  randomBytes: RandomBytes;
  sha256Hex: Sha256Hex;
  orderRepository: OrderRepositoryPort;
  paymentGateway: PaymentGateway;
  rateLimiter: RateLimiterPort;
  placeOrderUseCase: PlaceOrderUseCase;
  getOrderByReferenceUseCase: GetOrderByReferenceUseCase;
  confirmDemoPaymentUseCase: ConfirmDemoPaymentUseCase;
  orderAdminRepository: OrderAdminPort;
  listAdminOrdersUseCase: ListAdminOrdersUseCase;
  getAdminOrderUseCase: GetAdminOrderUseCase;
  changeOrderStatusUseCase: ChangeOrderStatusUseCase;
  clock: Clock;
  storeMetrics: StoreMetricsPort;
  getSalesSummaryUseCase: GetSalesSummaryUseCase;
  getOrderSummaryUseCase: GetOrderSummaryUseCase;
  getTopProductsUseCase: GetTopProductsUseCase;
  getLowStockProductsUseCase: GetLowStockProductsUseCase;
  getDashboardUseCase: GetDashboardUseCase;
  trafficStats: TrafficStatsPort;
  getTrafficSummaryUseCase: GetTrafficSummaryUseCase;
  getSalesSummaryTool: GetSalesSummaryTool;
  getOrderSummaryTool: GetOrderSummaryTool;
  getTopProductsTool: GetTopProductsTool;
  getLowStockProductsTool: GetLowStockProductsTool;
  getTrafficSummaryTool: GetTrafficSummaryTool;
  copilotLog: CopilotLogPort;
  copilotRecommendationRepository: CopilotRecommendationRepositoryPort;
  saveCopilotAnswerUseCase: SaveCopilotAnswerUseCase;
  listCopilotRecommendationsUseCase: ListCopilotRecommendationsUseCase;
  changeRecommendationStatusUseCase: ChangeRecommendationStatusUseCase;
  askCopilotUseCase: AskCopilotUseCase;
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
    // One provider per process, chosen from LLM_PROVIDER (Copilot spec A1); stateless per call.
    llmProvider: asFunction(() => createLlmProvider(env)).singleton(),
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
    listFeaturedProductsUseCase: asClass(ListFeaturedProductsUseCase).scoped(),
    // Admin catalog: the category adapter writes through the request's EntityManager.
    categoryRepository: asClass(DatabaseCategoryRepository).scoped(),
    listCategoriesUseCase: asClass(ListCategoriesUseCase).scoped(),
    getCategoryUseCase: asClass(GetCategoryUseCase).scoped(),
    createCategoryUseCase: asClass(CreateCategoryUseCase).scoped(),
    updateCategoryUseCase: asClass(UpdateCategoryUseCase).scoped(),
    deleteCategoryUseCase: asClass(DeleteCategoryUseCase).scoped(),
    // Admin catalog: the product adapter writes through the request's EntityManager too.
    productRepository: asClass(DatabaseProductRepository).scoped(),
    listProductsUseCase: asClass(ListProductsUseCase).scoped(),
    getProductUseCase: asClass(GetProductUseCase).scoped(),
    createProductUseCase: asClass(CreateProductUseCase).scoped(),
    updateProductUseCase: asClass(UpdateProductUseCase).scoped(),
    setProductStatusUseCase: asClass(SetProductStatusUseCase).scoped(),
    // Stock adjustment: the conditional update and its history row share the request's EntityManager.
    stockRepository: asClass(DatabaseStockRepository).scoped(),
    adjustStockUseCase: asClass(AdjustStockUseCase).scoped(),
    listStockAdjustmentsUseCase: asClass(ListStockAdjustmentsUseCase).scoped(),
    // Cart (cart spec): prices the cookie's lines with the request-scoped catalog repository.
    getCartUseCase: asClass(GetCartUseCase).scoped(),
    addToCartUseCase: asClass(AddToCartUseCase).scoped(),
    updateCartLineUseCase: asClass(UpdateCartLineUseCase).scoped(),
    removeCartLineUseCase: asClass(RemoveCartLineUseCase).scoped(),
    // Orders (cart spec, Phases 2–3): the repository and the limiter use the request's
    // EntityManager; the demo gateway and the crypto helpers are stateless singletons.
    randomBytes: asValue(randomBytes),
    sha256Hex: asValue(sha256Hex),
    orderRepository: asClass(DatabaseOrderRepository).scoped(),
    paymentGateway: asClass(DemoPaymentGateway).singleton(),
    rateLimiter: asClass(DatabaseRateLimiter).scoped(),
    placeOrderUseCase: asClass(PlaceOrderUseCase).scoped(),
    getOrderByReferenceUseCase: asClass(GetOrderByReferenceUseCase).scoped(),
    confirmDemoPaymentUseCase: asClass(ConfirmDemoPaymentUseCase).scoped(),
    // Admin orders (orders spec, Phase 1): the status change and its cancel restock run in one
    // transaction on the request's EntityManager.
    orderAdminRepository: asClass(DatabaseOrderAdminRepository).scoped(),
    listAdminOrdersUseCase: asClass(ListAdminOrdersUseCase).scoped(),
    getAdminOrderUseCase: asClass(GetAdminOrderUseCase).scoped(),
    changeOrderStatusUseCase: asClass(ChangeOrderStatusUseCase).scoped(),
    // Store metrics (orders spec, Phase 3): aggregate SQL on the request's EntityManager. The
    // four metric use cases are the Copilot's future tool layer; the clock is a stateless
    // singleton so tests can fix "now".
    clock: asValue((): Date => new Date()),
    storeMetrics: asClass(DatabaseStoreMetrics).scoped(),
    getSalesSummaryUseCase: asClass(GetSalesSummaryUseCase).scoped(),
    getOrderSummaryUseCase: asClass(GetOrderSummaryUseCase).scoped(),
    getTopProductsUseCase: asClass(GetTopProductsUseCase).scoped(),
    getLowStockProductsUseCase: asClass(GetLowStockProductsUseCase).scoped(),
    getDashboardUseCase: asClass(GetDashboardUseCase).scoped(),
    // Fictional demo traffic (Copilot spec, Phase 3; D08): read-only SQL on the request's
    // EntityManager; order figures come from the metric use cases above.
    trafficStats: asClass(DatabaseTrafficStats).scoped(),
    getTrafficSummaryUseCase: asClass(GetTrafficSummaryUseCase).scoped(),
    // Commerce Copilot (Copilot spec, Phase 1): the approved tools wrap the metric use cases
    // above unchanged, so they share the request scope; the log port adapts the redacting logger.
    getSalesSummaryTool: asClass(GetSalesSummaryTool).scoped(),
    getOrderSummaryTool: asClass(GetOrderSummaryTool).scoped(),
    getTopProductsTool: asClass(GetTopProductsTool).scoped(),
    getLowStockProductsTool: asClass(GetLowStockProductsTool).scoped(),
    getTrafficSummaryTool: asClass(GetTrafficSummaryTool).scoped(),
    copilotLog: asValue(copilotLog),
    // Copilot's recommendation records (Copilot spec, Phase 4): the adapter writes only
    // `copilot_recommendations`, on the request's EntityManager, so it and its use cases are
    // scoped; `askCopilotUseCase` stores each answer through `saveCopilotAnswerUseCase`.
    copilotRecommendationRepository: asClass(DatabaseCopilotRecommendationRepository).scoped(),
    saveCopilotAnswerUseCase: asClass(SaveCopilotAnswerUseCase).scoped(),
    listCopilotRecommendationsUseCase: asClass(ListCopilotRecommendationsUseCase).scoped(),
    changeRecommendationStatusUseCase: asClass(ChangeRecommendationStatusUseCase).scoped(),
    askCopilotUseCase: asClass(AskCopilotUseCase).scoped(),
    authPool: asFunction(() => createAuthPool(env.DATABASE_URL))
      .singleton()
      .disposer((pool) => pool.end()),
    auth: asFunction(({ authPool }: Pick<Cradle, "authPool">) =>
      createAuth({ pool: authPool, env, log: logAuthMessage }),
    ).singleton(),
  });

  return container;
}

/**
 * The Copilot's LLM adapter: Gemini when `LLM_PROVIDER=gemini` (env validation guarantees the
 * key and model then), otherwise the unconfigured provider and rule-based answers.
 */
export function createLlmProvider(
  env: Pick<Env, "LLM_PROVIDER" | "LLM_API_KEY" | "LLM_MODEL">,
): LlmProviderPort {
  if (env.LLM_PROVIDER === "gemini" && env.LLM_API_KEY && env.LLM_MODEL) {
    return new GeminiLlmProvider({ apiKey: env.LLM_API_KEY, model: env.LLM_MODEL });
  }
  return new UnconfiguredLlmProvider();
}

/** The Copilot's answer events go through the redacting server logger. */
export const copilotLog: CopilotLogPort = {
  info: (event, data) => logger.info(event, data),
};

/** Routes Better Auth's own log lines through the redacting server logger. */
export function logAuthMessage(
  level: AuthLogLevel,
  message: string,
  error?: AuthErrorSummary,
): void {
  const write = logger[level === "debug" ? "info" : level];
  if (error) write(message, { error });
  else write(message);
}

// Cached on globalThis so dev-mode hot reloads do not open a new connection pool each time.
const globalForContainer = globalThis as typeof globalThis & {
  __commerceosContainer?: AwilixContainer<Cradle>;
  __commerceosContainerOwner?: symbol;
};

/**
 * Identity of this evaluation of the module. `next dev` re-evaluates this file when it or a
 * module it registers changes; a container cached by an older evaluation lacks the new
 * registrations (AwilixResolutionError until a restart), so it is disposed and rebuilt.
 */
const MODULE_INSTANCE = Symbol("commerceos-container-module");

/**
 * One owner for every evaluation in a production build (#57). The bundler evaluates this file
 * once per server layer (route handlers, pages and server actions), and all of them come from
 * the same build, so they share one container. With a per-evaluation owner they disposed each
 * other's container on every alternating request, closing the connection pools under requests
 * still in flight ("Failed to get session" from Better Auth).
 */
const PRODUCTION_OWNER = Symbol.for("commerceos-container-production");

function containerOwner(): symbol {
  return getEnv().NODE_ENV === "production" ? PRODUCTION_OWNER : MODULE_INSTANCE;
}

function getRootContainer(): AwilixContainer<Cradle> {
  const owner = containerOwner();
  const cached = globalForContainer.__commerceosContainer;
  if (cached && globalForContainer.__commerceosContainerOwner !== owner) {
    globalForContainer.__commerceosContainer = undefined;
    // Closes the stale connection pools in the background; a failure must not break the request.
    cached.dispose().catch((error: unknown) => {
      logger.warn("A stale DI container could not be disposed", { error });
    });
  }
  if (!globalForContainer.__commerceosContainer) {
    globalForContainer.__commerceosContainer = buildContainer();
    globalForContainer.__commerceosContainerOwner = owner;
  }
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
