/** Values the e2e global setup hands to test files through `inject()`, on top of the database ones. */
declare module "vitest" {
  export interface ProvidedContext {
    /** Email of the owner created by `admin:create` for this run. */
    ownerEmail: string;
    /** That owner's password, generated per run (never committed). */
    ownerPassword: string;
  }
}

export {};
