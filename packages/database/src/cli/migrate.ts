import { initCliOrm } from "./cli-orm";

const command = process.argv[2];

const orm = await initCliOrm();
try {
  switch (command) {
    case "up": {
      const executed = await orm.migrator.up();
      console.log(
        executed.length === 0
          ? "No pending migrations."
          : `Executed: ${executed.map((m) => m.name).join(", ")}`,
      );
      break;
    }
    case "create": {
      const result = await orm.migrator.create();
      console.log(
        result.fileName ? `Created ${result.fileName}` : "No schema changes, nothing created.",
      );
      break;
    }
    default:
      console.error(`Unknown command "${command ?? ""}". Use "up" or "create".`);
      process.exitCode = 1;
  }
} finally {
  await orm.close(true);
}
