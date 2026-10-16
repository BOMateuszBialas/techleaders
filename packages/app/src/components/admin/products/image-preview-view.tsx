import Image from "next/image";
import { isLocalDemoImage } from "@/components/catalog/catalog-copy";
import { IMAGE_LOAD_FAILED } from "./product-copy";

export type ImagePreviewViewProps = {
  url: string;
  /** The product name, used as the alt text. */
  name: string;
  /** True once the browser reported that the image failed to load. */
  failed: boolean;
  onError: () => void;
};

const SIZE = 96;
const FRAME = "size-24 rounded-md border bg-muted object-cover";

/**
 * A small preview of the stored image, so the owner sees whether the address works (spec G6,
 * D05). Local demo images use `next/image`; any other URL a plain `<img>` that sends no
 * referrer, loads lazily and has explicit dimensions (spec G10). No hooks: `ImagePreview`
 * holds the "failed" state.
 */
export function ImagePreviewView({ url, name, failed, onError }: ImagePreviewViewProps) {
  if (failed) {
    return (
      <p role="status" className="text-sm text-destructive">
        {IMAGE_LOAD_FAILED}
      </p>
    );
  }
  if (isLocalDemoImage(url)) {
    return (
      <Image
        src={url}
        alt={name}
        width={SIZE}
        height={SIZE}
        unoptimized
        onError={onError}
        className={FRAME}
      />
    );
  }
  return (
    // Remote images never go through next/image or a next.config.ts change (spec G10).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={SIZE}
      height={SIZE}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className={FRAME}
    />
  );
}
