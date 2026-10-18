import { z } from "zod";

const factId = z
  .string()
  .regex(/^f\d{1,3}$/)
  .describe('The id of a fact from "facts", e.g. "f3".');
const productAlias = z
  .string()
  .regex(/^p\d{1,3}$/)
  .describe('The alias of a product from "products", e.g. "p2".');

/**
 * What the model returns (Copilot spec, Modules and A10): fact ids and product aliases instead
 * of values and product ids. The server checks it (`findGroundingIssues`) and expands it into
 * the displayed `CopilotResponse`; the text limits match that contract, so a valid output
 * always expands. Every field is required (arrays may be empty), which structured output
 * follows more reliably than optional fields.
 */
export const copilotModelRecommendationSchema = z.object({
  title: z.string().min(1).max(160).describe("A short imperative, e.g. 'Restock <product>'."),
  priority: z.enum(["high", "medium", "low"]),
  observation: z
    .string()
    .min(1)
    .max(1000)
    .describe("What the cited facts show. No causes, only what happened."),
  evidenceFactIds: z.array(factId).min(1).max(6).describe("The facts this recommendation uses."),
  reasoning: z.string().min(1).max(2000).describe("Why this matters for the store."),
  suggestedAction: z
    .string()
    .min(1)
    .max(1000)
    .describe("A concrete next step the owner can decide to take."),
  relatedProductAliases: z
    .array(productAlias)
    .max(5)
    .describe("Every product this recommendation names or cites a fact of."),
  limitations: z
    .array(z.string().min(1).max(500))
    .max(3)
    .describe("Caveats about the data behind this recommendation; may be empty."),
});

export const copilotModelOutputSchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(2000)
    .describe("Two or three sentences answering the question from the facts."),
  summaryFactIds: z.array(factId).max(10).describe("The facts the summary uses."),
  recommendations: z
    .array(copilotModelRecommendationSchema)
    .max(3)
    .describe("At most 3, most important first; fewer is fine."),
});

export type CopilotModelRecommendation = z.infer<typeof copilotModelRecommendationSchema>;
export type CopilotModelOutput = z.infer<typeof copilotModelOutputSchema>;
