import { DatabaseSeeder } from "../seeders/DatabaseSeeder";
import { initCliOrm } from "./cli-orm";

const orm = await initCliOrm();
try {
  await orm.seeder.seed(DatabaseSeeder);
  console.log("Seed data applied.");
} finally {
  await orm.close(true);
}
