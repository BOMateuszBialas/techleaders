import { defineConfig as composer } from "@prisma/composer/config";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { definePrismaConfig } from "prisma/config";

// Deploy configuration for Prisma Compute (see docs/deployment.md). Deploy runs from this
// directory after `npm run build -w @commerceos/app`; Composer does not build for us.
export default definePrismaConfig({
  composer: composer({
    entry: "./module.ts",
    extensions: [prismaCloud({ region: "eu-central-1" }), nextjsBuild()],
    state: prismaState(),
  }),
});
