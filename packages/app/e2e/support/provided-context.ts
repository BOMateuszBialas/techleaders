/** Values the e2e global setup hands to test files through `inject()`, on top of the database ones. */
declare module "vitest" {
  export interface ProvidedContext {
    /** Email of the owner created by `admin:create` for this run. */
    ownerEmail: string;
    /** That owner's password, generated per run (never committed). */
    ownerPassword: string;
    /**
     * `Cookie` header of one owner session, signed in over HTTP once by the global setup. Suites
     * that only need some signed-in owner use it (`useOwnerSession`) and spend no sign-in from
     * Better Auth's limit of 20 per minute, which the whole e2e run shares.
     */
    ownerSessionCookie: string;
    /**
     * Customers A and B (E07 step 8), signed up over HTTP once by the global setup with random
     * passwords. Suites reuse their session cookies (`useCustomerSession`) instead of a new
     * sign-in or sign-up, which the customer instance limits to 20 per minute per path.
     */
    customerAEmail: string;
    customerAPassword: string;
    customerASessionCookie: string;
    customerBEmail: string;
    customerBPassword: string;
    customerBSessionCookie: string;
  }
}

export {};
