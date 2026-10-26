import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import { useCart } from "../cart";
import {
  cartLines,
  categories,
  formatPln,
  galleryShots,
  heroPhoto,
  orders,
  products,
  promoBanners,
  specRows,
  whyBuyHere,
  type Photo,
  type Product,
} from "../fixtures";
import { ImagePlaceholder, Notice, PageHead, ProductImage, ShopperFrame, type ScreenDef } from "../shared";

function StockText({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 3) return <Badge variant="warning">Only {stock} left</Badge>;
  return <span className="type-small text-muted-foreground">In stock</span>;
}

function ProductCard({ p }: { p: Product }) {
  const cart = useCart();
  return (
    <Card>
      {p.photo ? (
        <ProductImage photo={p.photo} className="aspect-[4/3]" />
      ) : (
        <ImagePlaceholder label={`Photo not chosen yet: ${p.name}`} decorative className="aspect-[4/3] w-full" />
      )}
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
        <Button
          variant="action"
          size="sm"
          disabled={p.stock === 0}
          className="w-full"
          onClick={() => {
            cart.add(p.slug);
            cart.setOpen(true);
          }}
        >
          {p.stock === 0 ? "Unavailable" : "Add to cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid gap-group-item @md:grid-cols-2 @3xl:grid-cols-3">
      {items.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  );
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

/* s01 storefront home, layout A only (owner decision, 2026-10-26). Six sections, in this order. */
function Home({ state }: { state: string }) {
  const featured = products.filter((p) => p.featured);
  const bestSellers = [...products].sort((a, b) => b.sold7d - a.sold7d).slice(0, 3);
  if (state === "loading") return <Loading rows={4} />;
  if (state === "error") return <CatalogError what="The catalog" />;
  if (state === "empty-store")
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No categories yet.</EmptyTitle>
          <EmptyDescription>There are no published products to show.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-group">
      {/* 1. Hero: one message and one call to action */}
      <section aria-label="Welcome" className="grid gap-group @3xl:grid-cols-2 @3xl:items-center">
        <div className="flex flex-col gap-related">
          <h1 className="font-heading type-display text-foreground">Gear for every desk and every match</h1>
          <p className="max-w-measure type-body text-muted-foreground">
            Mice, keyboards, headsets and desk gear. Stock is shown on every product.
          </p>
          <div>
            <Button render={<a href="#s02" />} variant="default" size="lg">Shop all products</Button>
          </div>
        </div>
        <ProductImage photo={heroPhoto} loading="eager" className="aspect-[4/3]" />
      </section>

      {/* 2. Featured products */}
      <section aria-labelledby="home-featured" className="flex flex-col gap-group-item">
        <h2 id="home-featured" className="font-heading type-h2">Featured products</h2>
        <ProductGrid items={featured} />
      </section>

      {/* 3. Promo banners: flat, text and one call to action each, no discounts (out of scope) */}
      <section aria-labelledby="home-highlights" className="flex flex-col gap-group-item">
        <h2 id="home-highlights" className="font-heading type-h2">From the store</h2>
        <ul className="grid gap-group-item @3xl:grid-cols-3">
          {promoBanners.map((b) => (
            <li key={b.title} className="flex flex-col gap-related rounded-card border border-border bg-card p-panel">
              {b.photo ? (
                <ProductImage photo={b.photo} className="aspect-[4/3]" />
              ) : (
                <ImagePlaceholder label={`Photo not chosen yet: ${b.title}`} decorative className="aspect-[4/3] w-full" />
              )}
              <h3 className="font-medium">{b.title}</h3>
              <p className="text-muted-foreground">{b.text}</p>
              <div className="mt-auto pt-related">
                <Button variant="outline" render={<a href={b.href} />}>{b.cta}</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Category tiles, from the catalogue */}
      <section aria-labelledby="home-categories" className="flex flex-col gap-group-item">
        <h2 id="home-categories" className="font-heading type-h2">Categories</h2>
        <ul className="grid gap-group-item grid-cols-2 @3xl:grid-cols-4">
          {categories
            .filter((c) => c !== "All")
            .map((c) => {
              const n = products.filter((p) => p.category === c).length;
              return (
                <li key={c}>
                  <a href="#s02" className="flex flex-col gap-related rounded-card p-related text-foreground no-underline hover:bg-muted">
                    <ImagePlaceholder label={c} decorative className="aspect-[4/3] w-full" />
                    <span className="font-medium">{c}</span>
                    <span className="type-small text-muted-foreground">
                      {n} {n === 1 ? "product" : "products"}
                    </span>
                  </a>
                </li>
              );
            })}
        </ul>
      </section>

      {/* 5. Why buy here: facts from the spec; the delivery line is an assumption (AS-01) */}
      <section aria-labelledby="home-why" className="flex flex-col gap-group-item">
        <h2 id="home-why" className="font-heading type-h2">Why buy here</h2>
        <ul className="grid gap-group-item @3xl:grid-cols-2 @5xl:grid-cols-4">
          {whyBuyHere.map((w) => (
            <li key={w.title} className="flex flex-col gap-related border-t-2 border-border pt-related">
              <h3 className="font-medium">{w.title}</h3>
              <p className="type-small text-muted-foreground">{w.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Best sellers: the three highest units sold (fictional sales data, AS-09) */}
      <section aria-labelledby="home-best" className="flex flex-col gap-group-item">
        <h2 id="home-best" className="font-heading type-h2">Best sellers</h2>
        <ProductGrid items={bestSellers} />
      </section>
    </div>
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
          <EmptyTitle>No products match &quot;mouse pad 900&quot;.</EmptyTitle>
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
  const items = products;
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

/** Product photo gallery: a main image and 4 thumbnails (buttons, so the keyboard works). */
function Gallery({ name, photo }: { name: string; photo?: Photo }) {
  const [active, setActive] = useState(0);
  const shot = galleryShots[active];
  return (
    <div className="flex flex-col gap-related">
      {photo && active === 0 ? (
        <ProductImage photo={photo} loading="eager" className="aspect-square object-cover" />
      ) : (
        <ImagePlaceholder label={`Photo ${active + 1} of ${galleryShots.length}: ${shot} view, not chosen yet`} className="aspect-square w-full" />
      )}
      <ul aria-label="Product images" className="grid grid-cols-4 gap-related">
        {galleryShots.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              aria-label={`Show image ${i + 1} of ${galleryShots.length}, ${s} view of ${name}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className="w-full rounded-control border border-border bg-muted p-related type-small text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-pressed:border-foreground aria-pressed:text-foreground"
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* s03 product: two columns from 1024 px (container @5xl), one column below (gallery first). */
function ProductPage({ state }: { state: string }) {
  const cart = useCart();
  const [qty, setQty] = useState("1");
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
  const p = state === "out-of-stock" ? products[2] : state === "keyboard-photo" ? products[1] : products[0];
  return (
    <div className="grid gap-group @5xl:grid-cols-2 @5xl:items-start">
      <Gallery name={p.name} photo={p.photo} />
      <section aria-label="Product information" className="flex flex-col gap-group">
        <div className="flex flex-col gap-related">
          <p className="type-small text-muted-foreground">{p.category} · SKU {p.sku}</p>
          <h1 className="font-heading type-h1">{p.name}</h1>
          <p className="max-w-measure type-body text-muted-foreground">{p.short}</p>
          <p className="font-heading type-h2 text-foreground">{formatPln(p.priceMinor)}</p>
          <StockText stock={p.stock} />
        </div>
        {state === "added" ? <Notice variant="success">Added to cart.</Notice> : null}
        {state === "over-stock" ? <Notice variant="warning">Only {p.stock} left. Choose a smaller quantity.</Notice> : null}
        <div className="flex flex-wrap items-end gap-related">
          <Field className="w-auto min-w-24">
            <FieldLabel htmlFor="qty">Quantity</FieldLabel>
            <NativeSelect id="qty" value={qty} onChange={(e) => setQty(e.target.value)}>
              {[1, 2, 3].map((n) => <NativeSelectOption key={n} value={String(n)}>{n}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Button
            variant="action"
            size="lg"
            className="grow sm:grow-0"
            disabled={p.stock === 0 || state === "adding"}
            aria-busy={state === "adding" || undefined}
            onClick={() => {
              for (let i = 0; i < Number(qty); i += 1) cart.add(p.slug);
              cart.setOpen(true);
            }}
          >
            {state === "adding" ? "Adding…" : p.stock === 0 ? "Out of stock" : "Add to cart"}
          </Button>
        </div>
        <Tabs defaultValue="description">
          <TabsList aria-label="Product details">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="technical">Technical data</TabsTrigger>
            <TabsTrigger value="delivery">Delivery and returns</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="pt-related type-body">
            <p className="max-w-measure">
              A wireless mouse with an optical-mechanical switch, two connection modes and a light body for long sessions at the desk.
            </p>
          </TabsContent>
          <TabsContent value="technical" className="pt-related">
            <Table>
              <TableCaption className="text-left">All values are fictional (AS-10).</TableCaption>
              <TableBody>
                {specRows.map(([label, value]) => (
                  <TableRow key={label}>
                    <TableHead scope="row" className="w-40">{label}</TableHead>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="delivery" className="flex flex-col gap-related pt-related type-body">
            <p className="max-w-measure">
              Assumed: delivery in 1–3 working days, and returns within 14 days. [ASSUMPTION AS-01]
            </p>
            <p className="max-w-measure type-small text-muted-foreground">
              A placeholder until the store writes its own delivery and returns policy.
            </p>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

/* s04 cart (the fallback route; the drawer is the main cart) */
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
          </CardContent>
          <CardFooter>
            <Button variant="action" size="lg" render={<a href="#s05" />} className="w-full">Checkout</Button>
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
            {emailError ? <FieldError>Enter a valid email address.</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input id="name" autoComplete="name" />
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
        </CardContent>
        <CardFooter>
          <Button variant="action" size="lg" render={<a href="#s06" />} className="w-full">Place order</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/* s06 payment step: the only place with a test-payment note (owner decision 1) */
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
      <h1 className="font-heading type-h1">Pay for your order</h1>
      {state === "cancelled" ? (
        <Notice variant="warning">This order can no longer be paid.</Notice>
      ) : (
        <Notice variant="info">Test payment. No money is taken.</Notice>
      )}
      <Card>
        <CardContent className="flex flex-col gap-related pt-panel">
          <p className="type-small text-muted-foreground">Order reference</p>
          <p className="font-mono">DEMO-2026-0413</p>
          <p className="font-medium">Total {formatPln(94700)}</p>
        </CardContent>
      </Card>
      {state === "cancelled" ? null : (
        <Button variant="action" size="lg" render={<a href="#s07" />}>Confirm test payment</Button>
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
      {state === "paid" ? <Notice variant="success" title="Thank you. Payment received.">Your order is confirmed.</Notice> : null}
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
function framed(node: ReactNode) {
  return <ShopperFrame>{node}</ShopperFrame>;
}

/** The drawer states come last: "cart-open" (two lines) and "cart-empty" (drawer with no lines). */
export const shopperScreens: ScreenDef[] = [
  shopper("Storefront home", "s01", ["default", "loading", "error", "empty-store", "cart-open", "cart-empty"], (p) => framed(<Home state={p.state} />)),
  shopper("Catalog and search", "s02", ["list", "loading", "error", "no-results", "empty-category"], (p) => framed(<Catalog state={p.state} />)),
  shopper("Product", "s03", ["default", "keyboard-photo", "adding", "added", "out-of-stock", "over-stock", "not-found", "error", "cart-open", "cart-empty"], (p) => framed(<ProductPage state={p.state} />)),
  shopper("Cart", "s04", ["items", "only-n-left", "withdrawn", "empty", "loading", "error"], (p) => framed(<Cart state={p.state} />)),
  shopper("Checkout", "s05", ["guest", "customer", "field-errors", "price-changed", "last-unit-sold-out", "session-read-failed", "general-error"], (p) => framed(<Checkout state={p.state} />)),
  shopper("Demo payment", "s06", ["pending", "cancelled", "not-found"], (p) => framed(<DemoPayment state={p.state} />)),
  shopper("Confirmation and status", "s07", ["paid", "processing", "shipped", "cancelled", "refunded", "not-found", "loading"], (p) => framed(<Confirmation state={p.state} />)),
  shopper("My orders", "s11", ["list", "empty", "error", "loading"], (p) => framed(<MyOrders state={p.state} />)),
  shopper("Account order", "s12", ["own-order", "not-found"], (p) => framed(<AccountOrder state={p.state} />)),
];
