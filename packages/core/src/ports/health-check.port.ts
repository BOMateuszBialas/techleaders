/** Port implemented by infrastructure (e.g. the database package). */
export interface HealthCheckPort {
  readonly name: string;
  check(): Promise<void>;
}
