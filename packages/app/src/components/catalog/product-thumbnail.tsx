import { ProductImage } from "./product-image";
import { photoSrc } from "./product-photo";

type ProductThumbnailProps = {
  imageUrl: string | null | undefined;
  /** The product name, used as the alt text. */
  name: string;
  /** Tailwind width class, e.g. `w-14`; the frame stays square. */
  widthClassName: string;
};

/**
 * A small product photo for a cart line, a drawer line or a checkout line (storefront visual
 * polish, 2026-11-05). A product without a photo shows nothing, so the row keeps its text alone
 * and the "No photo yet" placeholder does not repeat in every line.
 */
export function ProductThumbnail({ imageUrl, name, widthClassName }: ProductThumbnailProps) {
  const src = photoSrc(imageUrl);
  if (!src) return null;
  return (
    <ProductImage imageUrl={src} name={name} size={112} className={`${widthClassName} shrink-0`} />
  );
}
