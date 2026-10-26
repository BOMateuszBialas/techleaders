import Image from "next/image";
import { cn } from "cn";
import { isLocalDemoImage, NO_PHOTO_LABEL } from "./catalog-copy";

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
 * A product image. Local demo images use `next/image` (unoptimized, so no image config is
 * needed); any other URL uses a plain `<img>` that sends no referrer (spec G21). Without an
 * image, a neutral placeholder is shown.
 */
export function ProductImage({ imageUrl, name, size, className }: ProductImageProps) {
  if (!imageUrl) {
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
  if (isLocalDemoImage(imageUrl)) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className={cn(FRAME, className)}
      />
    );
  }
  return (
    // Remote product images must not go through next/image or need a next.config.ts
    // change (spec G21); a plain <img> with no referrer is the agreed rendering.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn(FRAME, className)}
    />
  );
}
