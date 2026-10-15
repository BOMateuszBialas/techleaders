// Test-only entry point (`@commerceos/database/testing`). Never import it from app code.
export * from "./postgres-container";
export * from "./unit-orm";
import "./provided-context";
export * from "./catalog-fixtures";
export { DEMO_CATALOG, seedCatalog, type SeedCatalog } from "../seeders/DatabaseSeeder";
