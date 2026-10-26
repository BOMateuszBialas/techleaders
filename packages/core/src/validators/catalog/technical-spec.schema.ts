import { z } from "zod";

/**
 * Technical data of a product (storefront v2 spec, Phase 3, Q10): an ordered list of
 * `{ label, value }` rows stored in `products.technical_specs` (jsonb). The database check only
 * guards that the value is an array; this schema is the shape. Values are fictional demo data.
 */
export const TECHNICAL_SPECS_MAX_ROWS = 12;
export const TECHNICAL_SPEC_LABEL_MAX_LENGTH = 60;
export const TECHNICAL_SPEC_VALUE_MAX_LENGTH = 200;

export const technicalSpecSchema = z.object({
  label: z.string().trim().min(1).max(TECHNICAL_SPEC_LABEL_MAX_LENGTH),
  value: z.string().trim().min(1).max(TECHNICAL_SPEC_VALUE_MAX_LENGTH),
});

export const technicalSpecsSchema = z.array(technicalSpecSchema).max(TECHNICAL_SPECS_MAX_ROWS);

export type TechnicalSpec = z.infer<typeof technicalSpecSchema>;
