import { fileURLToPath } from "node:url";
import { createAuth } from "../create-auth";
import { createAuthPool } from "../create-auth-pool";
import { loadEnvFileIfPresent, runCreateOwner } from "./run-create-owner";

/** Entry point of `npm run admin:create`. All logic lives in run-create-owner.ts. */
loadEnvFileIfPresent(fileURLToPath(new URL("../../../../../../.env", import.meta.url)));

export const done = runCreateOwner({
  env: process.env,
  argv: process.argv.slice(2),
  createAuth,
  createAuthPool,
  log: { info: (message) => console.log(message), error: (message) => console.error(message) },
}).then((code) => {
  process.exitCode = code;
});
