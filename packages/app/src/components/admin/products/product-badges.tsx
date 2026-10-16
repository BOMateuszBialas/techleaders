import type { StoreAvailability } from "@commerceos/core";
import { Badge } from "@/components/ui/badge";
import { FEATURED_BADGE, STORE_AVAILABILITY_LABELS } from "./product-copy";

const AVAILABILITY_VARIANTS = {
  available: "secondary",
  out_of_stock: "outline",
  hidden: "ghost",
} as const;

/** "Available", "Out of stock" or "Hidden", from `getStoreAvailability` only (spec UI/UX). */
export function StoreAvailabilityBadge({ availability }: { availability: StoreAvailability }) {
  return (
    <Badge variant={AVAILABILITY_VARIANTS[availability]} className="border-border">
      {STORE_AVAILABILITY_LABELS[availability]}
    </Badge>
  );
}

/** Marks a product shown in the home page slider when published (spec G7, G9). */
export function FeaturedBadge() {
  return <Badge variant="default">{FEATURED_BADGE}</Badge>;
}
