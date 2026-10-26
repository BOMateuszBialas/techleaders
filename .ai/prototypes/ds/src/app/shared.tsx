import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DEMO_NOTICE } from "./fixtures";

export type ScreenProps = { state: string; layout: string };

export type ScreenDef = {
  id: string;
  title: string;
  group: "Shopper" | "Owner" | "Prototype";
  states: readonly string[];
  layouts?: readonly string[];
  render: (p: ScreenProps) => ReactNode;
};

/** Demo marking on every shopper and admin screen (R03, R07). */
export function DemoStrip() {
  return (
    <div className="bg-demo-surface text-demo rounded-control px-related py-related type-small">
      {DEMO_NOTICE}
    </div>
  );
}

export function ShopperFrame({ children, cartCount = 0 }: { children: ReactNode; cartCount?: number }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-frame text-frame-foreground px-gutter py-panel flex flex-wrap items-center justify-between gap-related">
        <a href="#s01" className="font-heading type-h2 text-frame-foreground no-underline">
          CommerceOS
        </a>
        <nav aria-label="Store" className="flex flex-wrap items-center gap-group-item type-small">
          <a href="#s02" className="text-frame-foreground">Shop all</a>
          <a href="#s04" className="text-frame-foreground">Cart ({cartCount})</a>
          <a href="#s11" className="text-frame-foreground">My orders</a>
        </nav>
      </header>
      <div className="px-gutter pt-panel">
        <DemoStrip />
      </div>
      <main className="flex flex-1 flex-col gap-group px-gutter py-panel">{children}</main>
      <footer className="bg-frame text-frame-muted-foreground px-gutter py-panel type-small">
        Demo store footer. No real company, address or contact details.
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
