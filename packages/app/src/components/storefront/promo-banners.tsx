import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LOW_STOCK_BANNER, lowStockText, type PromoBanner } from "./storefront-content";

/** A promo banner card (a list item): flat, text and one call to action, no discount. */
export function PromoBannerItem({ banner }: { banner: PromoBanner }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      {banner.photo ? (
        <Image
          src={banner.photo.src}
          alt={banner.photo.alt}
          width={1600}
          height={1067}
          unoptimized
          className="aspect-[4/3] w-full rounded-md border object-cover"
        />
      ) : null}
      <h3 className="font-medium">{banner.title}</h3>
      <p className="text-muted-foreground">{banner.text}</p>
      <div className="mt-auto pt-1">
        <Link href={banner.href} className={buttonVariants({ variant: "outline" })}>
          {banner.cta}
        </Link>
      </div>
    </li>
  );
}

/**
 * The "Low stock" banner for one published product at or below the threshold (A28). It names
 * the product and its stock, and links to the product page.
 */
export function LowStockBannerItem({
  product,
}: {
  product: { slug: string; name: string; stockQuantity: number };
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-medium">{LOW_STOCK_BANNER.title}</h3>
      <p className="text-muted-foreground">{lowStockText(product.name, product.stockQuantity)}</p>
      <div className="mt-auto pt-1">
        <Link href={`/products/${product.slug}`} className={buttonVariants({ variant: "outline" })}>
          {LOW_STOCK_BANNER.cta}
        </Link>
      </div>
    </li>
  );
}
