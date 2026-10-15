import type { Availability } from "@commerceos/core";
import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_LABELS } from "./catalog-copy";

/** "In stock" / "Out of stock"; exact quantities are never shown to shoppers. */
export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return (
    <Badge variant={availability === "in_stock" ? "secondary" : "outline"}>
      {AVAILABILITY_LABELS[availability]}
    </Badge>
  );
}
