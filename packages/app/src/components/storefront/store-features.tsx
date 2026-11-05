import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { STORE_FEATURES, type StoreFeature } from "./storefront-content";

/**
 * "From the store" (storefront refresh, 2026-11-04): one panel per feature with a photo that fills
 * one half of it edge to edge, and a text with a button to its collection on the other half. The
 * first and the third panels show the photo on the left, the second on the right. On a phone the
 * photo sits above the text. The photos are decorative: the text names the feature, so their alt
 * text is empty.
 */
export function StoreFeatures({
  features = STORE_FEATURES,
}: {
  features?: readonly StoreFeature[];
}) {
  return (
    <ul className="flex flex-col gap-6">
      {features.map((feature, index) => (
        <li key={feature.key}>
          <FeaturePanel feature={feature} photoFirst={index % 2 === 0} />
        </li>
      ))}
    </ul>
  );
}

function FeaturePanel({ feature, photoFirst }: { feature: StoreFeature; photoFirst: boolean }) {
  return (
    <article className="grid overflow-hidden rounded-xl border md:grid-cols-2">
      <div className={cn("relative min-h-72 md:min-h-96", !photoFirst && "md:order-2")}>
        <Image
          src={feature.photo}
          alt=""
          fill
          unoptimized
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div
        className={cn(
          "flex flex-col items-start gap-5 bg-background p-8 md:p-12",
          !photoFirst && "md:order-1",
        )}
      >
        <h3 className="text-3xl font-semibold tracking-tight">{feature.title}</h3>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {feature.text}
        </p>
        <Link href={feature.href} className={buttonVariants({ size: "lg", className: "mt-2" })}>
          {feature.label}
        </Link>
      </div>
    </article>
  );
}
