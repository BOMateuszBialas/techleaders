import Link from "next/link";

/** Shown for unknown slugs and for drafts alike, so a draft's existence is never revealed. */
export default function ProductNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">Product not found</h1>
      <p className="text-muted-foreground">This product does not exist or is not available.</p>
      <Link href="/products" className="w-fit text-sm underline underline-offset-4">
        Browse all products
      </Link>
    </div>
  );
}
