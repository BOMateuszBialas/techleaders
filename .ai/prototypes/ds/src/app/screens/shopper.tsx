import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { cartLines, categories, formatPln, orders, products, type Product } from "../fixtures";
import { Notice, PageHead, ShopperFrame, type ScreenDef } from "../shared";

const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);

function StockText({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 3) return <Badge variant="warning">Only {stock} left</Badge>;
  return <span className="type-small text-muted-foreground">In stock</span>;
}

function ProductCard({ p }: { p: Product }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <a href="#s03" className="text-foreground no-underline hover:underline">{p.name}</a>
        </CardTitle>
        <CardDescription>{p.category}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-related">
        <span className="font-medium">{formatPln(p.priceMinor)}</span>
        <StockText stock={p.stock} />
      </CardContent>
      <CardFooter>
        <Button variant="action" size="sm" disabled={p.stock === 0} className="w-full">
          {p.stock === 0 ? "Unavailable" : "Add to cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  return <div className="grid gap-group-item sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <ProductCard key={p.slug} p={p} />)}</div>;
}

function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-group-item">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-control-lg w-full" />
      ))}
    </div>
  );
}

function CatalogError({ what }: { what: string }) {
  return (
    <ErrorState
      title={`${what} is temporarily unavailable.`}
      description="Please try again in a moment."
      action={<Button variant="outline">Try again</Button>}
    />
  );
}

/* s01 storefront home, layouts A / B / C (mapa-ekranow.md §3) */
function Home({ state, layout }: { state: string; layout: string }) {
  const featured = products.filter((p) => p.featured);
  if (state === "loading") return <Loading rows={4} />;
  if (state === "error") return <CatalogError what="The catalog" />;
  if (state === "empty-store")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No categories yet.</EmptyTitle>
          <EmptyDescription>The demo catalog has no published products.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const tabs = (
    <nav aria-label="Categories" className="flex flex-wrap gap-related">
      {categories.map((c, i) => (
        <a
          key={c}
          href="#s02"
          aria-current={i === 0 ? "page" : undefined}
          className={
            i === 0
              ? "rounded-control bg-primary px-related py-related text-primary-foreground"
              : "rounded-control border border-input px-related py-related text-foreground"
          }
        >
          {c}
        </a>
      ))}
    </nav>
  );
  const hero = (
    <section className="flex flex-col gap-group rounded-card bg-muted p-panel">
      <PageHead title="Gaming accessories" lead="Mice, keyboards, audio and desk gear. Every product here is demo data." />
      <div>
        <Button render={<a href="#s02" />} variant="default">Shop all</Button>
      </div>
    </section>
  );
  if (layout === "B")
    return (
      <>
        {tabs}
        <ProductGrid items={featured} />
      </>
    );
  if (layout === "C")
    return (
      <section className="flex flex-col gap-group">
        <h1 className="font-heading type-h1">Featured</h1>
        <NativeSelect aria-label="Category filter" className="max-w-xs">
          {categories.map((c) => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}
        </NativeSelect>
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
          {featured.map((p) => (
            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-related p-panel">
              <a href="#s03" className="text-foreground">{p.name}</a>
              <span className="flex items-center gap-related">
                <span>{formatPln(p.priceMinor)}</span>
                <StockText stock={p.stock} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <>
      {hero}
      <h2 className="font-heading type-h2">Featured products</h2>
      <ProductGrid items={featured} />
      {tabs}
    </>
  );
}

/* s02 catalog and search */
function Catalog({ state }: { state: string }) {
  if (state === "loading") return <Loading rows={5} />;
  if (state === "error") return <CatalogError what="The catalog" />;
  if (state === "no-results")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No products match "mouse pad 900".</EmptyTitle>
          <EmptyDescription>Check the spelling or clear the search.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <TextLink href="#s02" variant="standalone">Clear search</TextLink>
        </EmptyContent>
      </Empty>
    );
  if (state === "empty-category")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No products in Desk yet.</EmptyTitle>
          <EmptyDescription>Only draft products are in this category.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  const items = state === "empty-category" ? [] : products;
  return (
    <>
      <PageHead title="Products" />
      <div className="grid gap-group-item @md:grid-cols-[1fr_12rem]">
        <Field>
          <FieldLabel htmlFor="q">Search products</FieldLabel>
          <Input id="q" type="search" defaultValue="" placeholder="Search by name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="cat">Category</FieldLabel>
          <NativeSelect id="cat">
            {categories.map((c) => <NativeSelectOption key={c}>{c}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
      </div>
      <p className="type-small text-muted-foreground">Showing {items.length} of {products.length} products</p>
      <ProductGrid items={items} />
    </>
  );
}

/* s03 product */
function ProductPage({ state }: { state: string }) {
  if (state === "not-found")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Product not found</EmptyTitle>
          <EmptyDescription>It may have been removed or is still a draft.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><TextLink href="#s02" variant="standalone">Back to products</TextLink></EmptyContent>
      </Empty>
    );
  if (state === "error") return <CatalogError what="This product" />;
  const p = state === "out-of-stock" ? products[2] : products[0];
  return (
    <div className="grid gap-group @md:grid-cols-2">
      <div aria-label="Product photo placeholder" className="flex aspect-square items-center justify-center rounded-card bg-surface-product text-muted-foreground">
        Photo placeholder
      </div>
      <section className="flex flex-col gap-group">
        <div className="flex flex-col gap-related">
          <p className="type-small text-muted-foreground">{p.category} · SKU {p.sku}</p>
          <h1 className="font-heading type-h1">{p.name}</h1>
          <p className="font-heading type-h2">{formatPln(p.priceMinor)}</p>
          <StockText stock={p.stock} />
        </div>
        {state === "added" ? <Notice variant="success">Added to cart.</Notice> : null}
        {state === "over-stock" ? <Notice variant="warning">Only {p.stock} left. Choose a smaller quantity.</Notice> : null}
        <Field>
          <FieldLabel htmlFor="qty">Quantity</FieldLabel>
          <NativeSelect id="qty" defaultValue="1">
            {[1, 2, 3].map((n) => <NativeSelectOption key={n}>{n}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Button variant="action" size="lg" disabled={p.stock === 0 || state === "adding"} aria-busy={state === "adding" || undefined}>
          {state === "adding" ? "Adding…" : p.stock === 0 ? "Out of stock" : "Add to cart"}
        </Button>
      </section>
    </div>
  );
}

/* s04 cart */
function Cart({ state }: { state: string }) {
  if (state === "loading") return <Loading rows={2} />;
  if (state === "error") return <CatalogError what="Your cart" />;
  if (state === "empty")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Your cart is empty.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent><TextLink href="#s02" variant="standalone">Shop all</TextLink></EmptyContent>
      </Empty>
    );
  const lines = state === "only-n-left" ? [{ product: products[1], qty: 2 }] : cartLines;
  const total = lines.reduce((s, l) => s + l.product.priceMinor * l.qty, 0);
  return (
    <div className="flex flex-col gap-group">
    <PageHead title="Your cart" />
    <div className="grid gap-group @md:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-group">
        {state === "withdrawn" ? (
          <Notice variant="info">Desk mat XL was removed from your cart because it is no longer sold.</Notice>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.product.slug}>
                <TableCell>
                  <a href="#s03" className="text-foreground">{l.product.name}</a>
                  <div><StockText stock={l.product.stock} /></div>
                </TableCell>
                <TableCell>{l.qty}</TableCell>
                <TableCell className="text-right">{formatPln(l.product.priceMinor * l.qty)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-related">
          <div className="flex justify-between"><span>Total</span><span className="font-medium">{formatPln(total)}</span></div>
          <p className="type-small text-muted-foreground">Demo prices. Shipping is not modelled.</p>
        </CardContent>
        <CardFooter>
          <Button variant="action" size="lg" render={<a href="#s05" />} className="w-full">Go to checkout</Button>
        </CardFooter>
      </Card>
    </div>
    </div>
  );
}

/* s05 checkout */
function Checkout({ state }: { state: string }) {
  const buyer =
    state === "customer" ? (
      <Notice variant="info" title="Buying as klient-a@demo.test">Your order is kept in My orders.</Notice>
    ) : state === "session-read-failed" ? (
      <Notice variant="warning" title="We could not check your session">No order was placed. Try again in a moment.</Notice>
    ) : (
      <Notice variant="info" title="Buying as a guest">You do not need an account. <a href="#s13" className="underline">Sign in</a> to keep orders in My orders.</Notice>
    );
  const banner =
    state === "price-changed" ? (
      <Notice variant="destructive" title="Prices changed">Review your cart before you pay. No order was placed.</Notice>
    ) : state === "last-unit-sold-out" ? (
      <Notice variant="destructive" title="Keyboard K7 is sold out">Another customer bought the last unit. No order was placed.</Notice>
    ) : state === "general-error" ? (
      <Notice variant="destructive" title="Something went wrong">No order was placed. Try again.</Notice>
    ) : null;
  const emailError = state === "field-errors";
  return (
    <div className="grid gap-group @md:grid-cols-[1fr_20rem]">
      <form className="flex flex-col gap-group" onSubmit={(e) => e.preventDefault()}>
        <h1 className="font-heading type-h1">Checkout</h1>
        {buyer}
        {banner}
        <FieldGroup>
          <Field data-invalid={emailError || undefined}>
            <FieldLabel htmlFor="email">Email for the order</FieldLabel>
            <Input id="email" type="email" autoComplete="email" aria-invalid={emailError || undefined} defaultValue={state === "customer" ? "klient-a@demo.test" : ""} />
            {emailError ? <FieldError>Enter a valid email address.</FieldError> : <FieldDescription>We send nothing: this is a demo.</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input id="name" autoComplete="name" />
          </Field>
          <Field>
            <FieldLabel htmlFor="addr">Delivery address (not used)</FieldLabel>
            <Input id="addr" autoComplete="street-address" />
            <FieldDescription>Shipping is not modelled in the demo store.</FieldDescription>
          </Field>
        </FieldGroup>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-related">
          <div className="flex justify-between"><span>Items</span><span>{cartLines.reduce((n, l) => n + l.qty, 0)}</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>{formatPln(94700)}</span></div>
          <p className="type-small text-muted-foreground">No card details. Nothing is charged.</p>
        </CardContent>
        <CardFooter>
          <Button variant="action" size="lg" render={<a href="#s06" />} className="w-full">Place demo order</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/* s06 demo payment */
function DemoPayment({ state }: { state: string }) {
  if (state === "not-found")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Order not found</EmptyTitle>
          <EmptyDescription>Check the reference and try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex max-w-xl flex-col gap-group">
      <h1 className="font-heading type-h1">Demo payment</h1>
      {state === "cancelled" ? (
        <Notice variant="warning">This order can no longer be paid.</Notice>
      ) : (
        <Notice variant="demo" title="This is a demo payment">No card is asked for and nothing is charged.</Notice>
      )}
      <Card>
        <CardContent className="flex flex-col gap-related pt-panel">
          <p className="type-small text-muted-foreground">Order reference</p>
          <p className="font-mono">DEMO-2026-0413</p>
          <p className="font-medium">Total {formatPln(94700)}</p>
        </CardContent>
      </Card>
      {state === "cancelled" ? null : (
        <Button variant="action" size="lg" render={<a href="#s07" />}>Confirm demo payment (no charge)</Button>
      )}
    </div>
  );
}

/* s07 confirmation and order status */
function Confirmation({ state }: { state: string }) {
  if (state === "loading") return <Loading rows={2} />;
  if (state === "not-found")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Order not found</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  const status = { paid: "Paid", processing: "Processing", shipped: "Shipped", cancelled: "Cancelled", refunded: "Refunded" }[state] ?? "Paid";
  const badge = status === "Cancelled" ? "destructive" : status === "Refunded" ? "outline" : "success";
  return (
    <div className="flex max-w-xl flex-col gap-group">
      <h1 className="font-heading type-h1">Order status</h1>
      {state === "paid" ? <Notice variant="success" title="Thank you. Demo payment received.">Your order is confirmed.</Notice> : null}
      <Card>
        <CardHeader>
          <CardTitle>Order DEMO-2026-0413</CardTitle>
          <CardDescription>Status: <Badge variant={badge}>{status}</Badge></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-related">
          <p>Keep this reference to find your order later: <span className="font-mono">DEMO-2026-0413</span></p>
          <p className="type-small text-muted-foreground">Status changes made by the store appear here after you reload the page.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* s11 My orders (signed-in customer) */
function MyOrders({ state }: { state: string }) {
  if (state === "loading") return <Loading rows={3} />;
  if (state === "error")
    return (
      <ErrorState
        title="Your orders are unavailable."
        description="Try again in a moment."
        action={<Button variant="outline">Try again</Button>}
      />
    );
  if (state === "empty")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>You have no orders yet.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent><TextLink href="#s02" variant="standalone">Shop all</TextLink></EmptyContent>
      </Empty>
    );
  const mine = orders.filter((o) => o.owner === "Account");
  return (
    <div className="flex flex-col gap-group">
      <h1 className="font-heading type-h1">My orders</h1>
      <p className="type-small text-muted-foreground">Showing your 50 most recent orders.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mine.map((o) => (
            <TableRow key={o.reference}>
              <TableCell><a href="#s12" className="font-mono text-link">{o.reference}</a></TableCell>
              <TableCell>{o.date}</TableCell>
              <TableCell><Badge variant="success">{o.status}</Badge></TableCell>
              <TableCell className="text-right">{formatPln(o.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* s12 account order detail: foreign, random and malformed ids share one "not found" */
function AccountOrder({ state }: { state: string }) {
  if (state === "not-found")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Order not found</EmptyTitle>
          <EmptyDescription>Check the reference and try again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex max-w-xl flex-col gap-group">
      <h1 className="font-heading type-h1">Order DEMO-2026-0412</h1>
      <Notice variant="info">Read-only. You can see your own orders only.</Notice>
      <Card>
        <CardContent className="flex flex-col gap-related pt-panel">
          <div className="flex justify-between"><span>Status</span><Badge variant="success">Paid</Badge></div>
          <div className="flex justify-between"><span>Placed</span><span>16 Oct 2026, 11:42</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>{formatPln(94700)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

function shopper(title: string, id: string, states: string[], render: ScreenDef["render"], layouts?: string[]): ScreenDef {
  return { id, title, group: "Shopper", states, layouts, render };
}

/** Wraps a shopper screen in the store frame. */
function framed(node: ReactNode, cart = cartCount) {
  return <ShopperFrame cartCount={cart}>{node}</ShopperFrame>;
}

export const shopperScreens: ScreenDef[] = [
  shopper("Storefront home", "s01", ["default", "loading", "error", "empty-store"], (p) => framed(<Home {...p} />), ["A", "B", "C"]),
  shopper("Catalog and search", "s02", ["list", "loading", "error", "no-results", "empty-category"], (p) => framed(<Catalog state={p.state} />)),
  shopper("Product", "s03", ["default", "adding", "added", "out-of-stock", "over-stock", "not-found", "error"], (p) => framed(<ProductPage state={p.state} />)),
  shopper("Cart", "s04", ["items", "only-n-left", "withdrawn", "empty", "loading", "error"], (p) => framed(<Cart state={p.state} />)),
  shopper("Checkout", "s05", ["guest", "customer", "field-errors", "price-changed", "last-unit-sold-out", "session-read-failed", "general-error"], (p) => framed(<Checkout state={p.state} />)),
  shopper("Demo payment", "s06", ["pending", "cancelled", "not-found"], (p) => framed(<DemoPayment state={p.state} />)),
  shopper("Confirmation and status", "s07", ["paid", "processing", "shipped", "cancelled", "refunded", "not-found", "loading"], (p) => framed(<Confirmation state={p.state} />)),
  shopper("My orders", "s11", ["list", "empty", "error", "loading"], (p) => framed(<MyOrders state={p.state} />)),
  shopper("Account order", "s12", ["own-order", "not-found"], (p) => framed(<AccountOrder state={p.state} />)),
];

