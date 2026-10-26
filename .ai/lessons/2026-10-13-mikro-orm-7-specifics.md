# 2026-10-13 — MikroORM 7 specifics

Use `defineEntity` + `p.*` builders (no decorators). `new MikroORM(config)` is synchronous and connects lazily, so it works in the DI container and in unit tests without a DB. `orm.schema.getCreateSchemaSQL()` generates DDL with no DB connection. Migrator and seeder are extensions (`extensions: [Migrator, SeedManager]`) available as `orm.migrator` / `orm.seeder`.
