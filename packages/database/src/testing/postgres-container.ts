import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

/** Same major version as docker-compose.yml and production. */
export const POSTGRES_IMAGE = "postgres:17-alpine";

export type EphemeralPostgres = {
  /** Connection string for the throwaway database. */
  url: string;
  stop(): Promise<void>;
};

/** Starts a throwaway PostgreSQL container (needs a running Docker engine). */
export async function startPostgresContainer(): Promise<EphemeralPostgres> {
  let container: StartedPostgreSqlContainer;
  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase("commerceos_test")
      .withUsername("commerceos")
      .withPassword("commerceos")
      .start();
  } catch (error) {
    throw new Error(
      "Could not start the PostgreSQL test container. Is Docker running? (`docker info`)",
      { cause: error },
    );
  }
  return {
    url: container.getConnectionUri(),
    stop: async () => {
      await container.stop();
    },
  };
}
