import type { ReactNode } from "react";
import { cn } from "cn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DEMO_NOTICE, type Photo } from "./fixtures";
import { cartCount, useCart } from "./cart";

export type ScreenProps = { state: string; layout: string };

export type ScreenDef = {
  id: string;
  title: string;
  group: "Shopper" | "Owner" | "Prototype";
  states: readonly string[];
  layouts?: readonly string[];
  render: (p: ScreenProps) => ReactNode;
};

/** Demo marking on every admin screen (R07, spec D08). The storefront no longer carries it (owner decision 1). */
export function DemoStrip() {
  return (
    <div className="bg-demo-surface text-demo rounded-control px-related py-related type-small">
      {DEMO_NOTICE}
    </div>
  );
}

/**
 * Neutral placeholder for a photo that the owner has not picked yet (owner decision 4). Flat grey
 * box, dashed border, the subject written in text. It is an image role with a label, so a screen
 * reader hears what the picture will show.
 */
export function ImagePlaceholder({ label, className, decorative }: { label: string; className?: string; decorative?: boolean }) {
  return (
    <div
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `Image placeholder: ${label}` })}
      className={cn(
        "flex items-center justify-center rounded-card border border-dashed border-border bg-muted p-related text-center type-small text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  );
}

/**
 * A real photo in a placeholder-sized box: object-cover, width and height set so the layout does not
 * shift while it loads. Below the fold it is lazy; the hero passes "eager".
 */
export function ProductImage({ photo, loading = "lazy", className }: { photo: Photo; loading?: "lazy" | "eager"; className?: string }) {
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading={loading}
      decoding="async"
      className={cn("h-auto w-full rounded-card object-cover", className)}
    />
  );
}

function CartButton() {
  const cart = useCart();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={cart.open}
      onClick={() => cart.setOpen(true)}
      className="rounded-control text-frame-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid outline-none"
    >
      Cart ({cartCount(cart.lines)})
    </button>
  );
}

/** The frame is the container for the `@md:` / `@3xl:` / `@5xl:` rules of the store screens (lesson: the container is the parent). */
export function ShopperFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex min-h-full flex-col">
      <header className="bg-frame text-frame-foreground px-gutter py-panel flex flex-wrap items-center justify-between gap-related">
        <a href="#s01" className="font-heading type-h2 text-frame-foreground no-underline">
          CommerceOS
        </a>
        <nav aria-label="Store" className="flex flex-wrap items-center gap-group-item type-small">
          <a href="#s02" className="text-frame-foreground">Shop all</a>
          <CartButton />
          <a href="#s11" className="text-frame-foreground">My orders</a>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-group px-gutter py-panel">{children}</main>
      <footer className="bg-frame text-frame-muted-foreground px-gutter py-panel type-small">
        <div className="flex flex-col gap-related">
          <p>
            <span className="text-frame-foreground">Fictional company:</span> Kwadrat Peryferii Sp. z o.o.
            (invented name for this prototype).
          </p>
          <p>Address, tax number and contact details are left out on purpose.</p>
        </div>
      </footer>
    </div>
  );
}

export function OwnerFrame({ children, current }: { children: ReactNode; current: string }) {
  const links: [string, string][] = [
    ["s14", "Dashboard"],
    ["s15", "Orders"],
    ["s17", "Copilot"],
    ["s13", "Sign out"],
  ];
  return (
    <div data-density="admin" className="@container min-h-full">
    <div className="flex min-h-full flex-col @md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground p-panel @md:w-56 @md:shrink-0">
        <p className="type-small text-sidebar-muted-foreground">CommerceOS admin</p>
        <nav aria-label="Admin" className="mt-related flex flex-row flex-wrap gap-related @md:flex-col">
          {links.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={current === id ? "page" : undefined}
              className={
                current === id
                  ? "rounded-control border-l-2 border-sidebar-primary bg-sidebar-accent px-related py-related text-sidebar-accent-foreground"
                  : "rounded-control px-related py-related text-sidebar-foreground"
              }
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-group p-panel">
        <DemoStrip />
        {children}
      </main>
    </div>
    </div>
  );
}

export function PageHead({ title, lead, badge }: { title: string; lead?: string; badge?: string }) {
  return (
    <div className="flex flex-col gap-related">
      <div className="flex flex-wrap items-center gap-related">
        <h1 className="font-heading type-h1 text-foreground">{title}</h1>
        {badge ? <Badge variant="warning">{badge}</Badge> : null}
      </div>
      {lead ? <p className="max-w-measure type-body text-muted-foreground">{lead}</p> : null}
    </div>
  );
}

export function Notice({
  variant,
  title,
  children,
}: {
  variant: "info" | "success" | "warning" | "destructive" | "demo";
  title?: string;
  children: ReactNode;
}) {
  return (
    <Alert variant={variant}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
