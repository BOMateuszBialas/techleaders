import Image from "next/image";
import { cn } from "cn";
import { NO_PHOTO_LABEL } from "./catalog-copy";
import { photoSrc } from "./product-photo";

type ProductImageProps = {
  imageUrl: string | null;
  /** The product name, used as the alt text. */
  name: string;
  /** Intrinsic width and height in pixels (images are square). */
  size: number;
  className?: string;
};

const FRAME = "aspect-square w-full rounded-md border bg-muted object-cover";

/**
 * A product photo (storefront v2 photo rule, see `product-photo.ts`). Only a `/photos/` path is
 * shown, through `next/image` (unoptimized, so no image config is needed). Anything else shows
 * the neutral "No photo yet" text placeholder, never the demo SVG.
 */
export function ProductImage({ imageUrl, name, size, className }: ProductImageProps) {
  const src = photoSrc(imageUrl);
  if (!src) {
    return (
      <div
        className={cn(
          FRAME,
          "flex items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        {NO_PHOTO_LABEL}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className={cn(FRAME, className)}
    />
  );
}
