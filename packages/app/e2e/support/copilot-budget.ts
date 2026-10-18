import { Pool } from "pg";
import { inject } from "vitest";
import "@commerceos/database/testing";

/**
 * Gives the owner a fresh Copilot question budget (#62). Every Copilot suite shares the global
 * setup's owner session, and so one rate-limit bucket, `copilot:ask:<adminId>`: 10 questions
 * per 10 minutes (Copilot spec A4), declined and unsupported questions included. Suites run one
 * after another (`fileParallelism: false`), so a Copilot suite calls this in its `beforeAll`
 * and may then ask up to 10 questions without a 429 caused by another suite. It deletes only
 * the per-owner Copilot buckets of the throwaway e2e database, never the store-wide
 * `copilot:llm:day` cap or the checkout limits.
 */
export async function resetCopilotQuestionBudget(): Promise<void> {
  await runOnE2eDatabase("delete from rate_limit_buckets where key like 'copilot:ask:%'");
}

/**
 * Deletes every stored Copilot recommendation of the throwaway e2e database, so a suite that
 * asserts on "Your recommendations" does not depend on what earlier suites asked.
 */
export async function clearCopilotRecommendations(): Promise<void> {
  await runOnE2eDatabase("delete from copilot_recommendations");
}

async function runOnE2eDatabase(sql: string): Promise<void> {
  const pool = new Pool({ connectionString: inject("databaseUrl") });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}
