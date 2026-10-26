import { z } from "zod";

/** A6: 80–1 190 characters, within the 1 200 the UI promises. */
export const DESCRIPTION_MIN_LENGTH = 80;
export const DESCRIPTION_MAX_LENGTH = 1190;
export const DESCRIPTION_MAX_PARAGRAPHS = 3;

/** Paragraphs are separated by a blank line. */
export function paragraphCount(text: string): number {
  return text.trim().split(/\n\s*\n/).length;
}

/**
 * What the model returns (descriptions spec A6): one plain-text description. The server checks
 * it (`findDescriptionIssues`) before anyone sees it; the length and paragraph limits are part
 * of the schema, so a reply that breaks them counts as invalid output (`schema`).
 */
export const productDescriptionOutputSchema = z.object({
  description: z
    .string()
    .min(DESCRIPTION_MIN_LENGTH)
    .max(DESCRIPTION_MAX_LENGTH)
    .refine(
      (text) => paragraphCount(text) <= DESCRIPTION_MAX_PARAGRAPHS,
      `At most ${DESCRIPTION_MAX_PARAGRAPHS} paragraphs.`,
    )
    .describe(
      "The product description: plain text, 1 to 3 short paragraphs separated by a blank line.",
    ),
});

export type ProductDescriptionOutput = z.infer<typeof productDescriptionOutputSchema>;
