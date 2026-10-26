import type { TechnicalSpec } from "@commerceos/core";
import { DELIVERY_EXAMPLE_TEXT } from "@/components/storefront/storefront-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PRODUCT_TABS_LABEL,
  TAB_DELIVERY,
  TAB_DESCRIPTION,
  TAB_TECHNICAL,
} from "./product-page-copy";
import { ProductTechnicalData } from "./product-technical-data";

/**
 * The product details under the price (storefront v2, Phase 3, D5): Description, Technical data
 * and Delivery and returns. The description is plain text (no HTML); the delivery text is the
 * labelled example (Q7, OA-5). Arrow keys and Home/End move between tabs (Base UI).
 */
export function ProductTabs({
  description,
  technicalSpecs,
}: {
  description: string;
  technicalSpecs: TechnicalSpec[];
}) {
  return (
    <Tabs defaultValue="description">
      <TabsList aria-label={PRODUCT_TABS_LABEL}>
        <TabsTrigger value="description">{TAB_DESCRIPTION}</TabsTrigger>
        <TabsTrigger value="technical">{TAB_TECHNICAL}</TabsTrigger>
        <TabsTrigger value="delivery">{TAB_DELIVERY}</TabsTrigger>
      </TabsList>
      <TabsContent value="description" className="pt-related">
        <p className="max-w-measure whitespace-pre-line">{description}</p>
      </TabsContent>
      <TabsContent value="technical" className="pt-related">
        <ProductTechnicalData specs={technicalSpecs} />
      </TabsContent>
      <TabsContent value="delivery" className="pt-related">
        <p className="max-w-measure">{DELIVERY_EXAMPLE_TEXT}</p>
      </TabsContent>
    </Tabs>
  );
}
