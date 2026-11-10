import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";

// Deployed with `prisma deploy` from packages/app; APP_URL and DATABASE_URL are read at runtime (docs/deployment.md).
export default compute({
  name: "web",
  deps: {},
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
