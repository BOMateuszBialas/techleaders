import type { TechnicalSpec } from "@commerceos/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDelivery } from "./product-delivery";
import {
  PRODUCT_TABS_LABEL,
  TAB_DELIVERY,
  TAB_DESCRIPTION,
  TAB_TECHNICAL,
} from "./product-page-copy";
import { ProductTechnicalData } from "./product-technical-data";

/**
 * The product details under the price (storefront v2, Phase 3, D5): Description, Technical data
 * and Delivery and returns. The description is plain text (no HTML) in paragraphs, a blank line
 * between them. Arrow keys and Home/End move between tabs (Base UI).
 */
export function ProductTabs({
  description,
  technicalSpecs,
  inStock,
}: {
  description: string;
  technicalSpecs: TechnicalSpec[];
  inStock: boolean;
}) {
  return (
    <Tabs defaultValue="description">
      <TabsList aria-label={PRODUCT_TABS_LABEL}>
        <TabsTrigger value="description">{TAB_DESCRIPTION}</TabsTrigger>
        <TabsTrigger value="technical">{TAB_TECHNICAL}</TabsTrigger>
        <TabsTrigger value="delivery">{TAB_DELIVERY}</TabsTrigger>
      </TabsList>
      <TabsContent value="description" className="pt-related">
        <div className="flex max-w-measure flex-col gap-4">
          {description.split("\n\n").map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="technical" className="pt-related">
        <ProductTechnicalData specs={technicalSpecs} />
      </TabsContent>
      <TabsContent value="delivery" className="pt-related">
        <ProductDelivery inStock={inStock} />
      </TabsContent>
    </Tabs>
  );
}
