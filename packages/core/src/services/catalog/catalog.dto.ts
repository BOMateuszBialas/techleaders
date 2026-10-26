import { money, type Money } from "../../domain/money";
import { getAvailability, type Availability } from "../../domain/products/product";
import type { CatalogCategoryRecord, CatalogProductRecord } from "../../ports/catalog-read.port";
import {
  technicalSpecsSchema,
  type TechnicalSpec,
} from "../../validators/catalog/technical-spec.schema";

/** Shopper-facing data only: never `status`, `sku`, stock quantities or timestamps. */
export type CatalogCategory = { slug: string; name: string; description: string | null };

export type CatalogProductSummary = {
  id: string;
  slug: string;
  name: string;
  price: Money;
  category: { slug: string; name: string } | null;
  availability: Availability;
  imageUrl: string | null;
};

export type CatalogProductDetail = CatalogProductSummary & {
  description: string;
  /** Example values for the demo store (Q10); the page shows them with that note. */
  technicalSpecs: TechnicalSpec[];
};

export function toCatalogCategory(record: CatalogCategoryRecord): CatalogCategory {
  return { slug: record.slug, name: record.name, description: record.description };
}

/** `money()` throws on a broken price invariant, so bad data fails loudly instead of rendering. */
export function toCatalogProductSummary(record: CatalogProductRecord): CatalogProductSummary {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    price: money(record.priceMinor, record.currency),
    category: record.category ? { slug: record.category.slug, name: record.category.name } : null,
    availability: getAvailability(record),
    imageUrl: record.imageUrl,
  };
}

/**
 * Like `money()`, the shape check fails loudly: a stored row that breaks the schema is a data bug,
 * not something to render.
 */
export function toCatalogProductDetail(record: CatalogProductRecord): CatalogProductDetail {
  return {
    ...toCatalogProductSummary(record),
    description: record.description,
    technicalSpecs: technicalSpecsSchema.parse(record.technicalSpecs),
  };
}
