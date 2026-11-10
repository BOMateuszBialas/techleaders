import { appRoot } from "@prisma/composer";
import web from "./service";

// Root of the Prisma Compute app: one Next.js service, no provisioned database
// (DATABASE_URL is set as a project environment variable, see docs/deployment.md).
export default appRoot("commerceos-app", ({ provision }) => {
  provision(web);
});
