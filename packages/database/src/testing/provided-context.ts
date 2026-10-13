/** Values the Vitest global setups hand to test files through `inject()`. */
declare module "vitest" {
  export interface ProvidedContext {
    /** Connection string of the ephemeral PostgreSQL container. */
    databaseUrl: string;
    /** Base URL of the ephemeral app instance (e2e project only). */
    baseUrl: string;
  }
}

export {};
