import { IconMenu2, IconSearch, IconShoppingCart } from "@tabler/icons-react";
import { formatMoney, money } from "@commerceos/core";
import { Surface } from "./color-blocks";
import { SAMPLE } from "./token-data";

const price = formatMoney(money(SAMPLE.priceMinor, "PLN"));

const TYPE_STYLES = [
  {
    name: "display",
    className: "type-display",
    store: "Hero (store); metric value (admin)",
    sample: "Gear up for your next match",
    admin: price,
  },
  {
    name: "h1",
    className: "type-h1",
    store: "Page title: category, product name, Cart",
    sample: SAMPLE.pageTitle,
    admin: "Orders",
  },
  {
    name: "h2",
    className: "type-h2",
    store: "Section: Featured, Order summary",
    sample: SAMPLE.section,
    admin: "Order details",
  },
  {
    name: "h3",
    className: "type-h3",
    store: "Product name and price in a card (tabular numbers)",
    sample: SAMPLE.product,
    admin: "Shipping address",
  },
  {
    name: "body",
    className: "type-body",
    store: "Running text, product description, table cells",
    sample: "Wireless gaming mouse with a 26,000 DPI sensor. [DEMO]",
    admin: "Paid with the demo payment.",
  },
  {
    name: "small",
    className: "type-small",
    store: "Field labels, stock, captions, small buttons",
    sample: "In stock: 12",
    admin: SAMPLE.sku,
  },
] as const;

/** The six named text styles in the store and the admin density (tokeny.md §4). */
export function TypeStyles() {
  return (
    <Surface>
      <div className="grid gap-group md:grid-cols-2">
        <section aria-labelledby="type-store" className="flex flex-col gap-group-item">
          <h3 id="type-store" className="type-small text-muted-foreground">
            Store density
          </h3>
          {TYPE_STYLES.map((style) => (
            <div key={style.name} className="flex flex-col gap-1 border-b pb-3">
              <p className={style.className}>{style.sample}</p>
              <p className="type-small text-muted-foreground">
                <code className="font-mono">{style.className}</code>: {style.store}
              </p>
            </div>
          ))}
        </section>
        <section
          aria-labelledby="type-admin"
          data-density="admin"
          className="flex flex-col gap-group-item"
        >
          <h3 id="type-admin" className="type-small text-muted-foreground">
            Admin density
          </h3>
          {TYPE_STYLES.map((style) => (
            <div key={style.name} className="flex flex-col gap-1 border-b pb-3">
              <p className={style.className}>{style.admin}</p>
              <p className="type-small text-muted-foreground">
                <code className="font-mono">{style.className}</code>
              </p>
            </div>
          ))}
        </section>
      </div>
      <p className="type-body mt-6 max-w-measure text-muted-foreground">
        Running text stops at about 65 characters per line (
        <code className="font-mono">max-w-measure</code>, rule 15). Prices use the body family with
        tabular numbers: <span className="tabular-nums">{price}</span>. Monospace is only for SKUs
        and order numbers: <code className="font-mono">{SAMPLE.sku}</code>.
      </p>
    </Surface>
  );
}

const SPACES = [
  { token: "related", relation: "Inside a group: label and field, icon and text, price and stock" },
  { token: "group-item", relation: "Between items of a group: fields of a form, rows of a list" },
  { token: "group", relation: "Between groups: address and contact; filters and table" },
  { token: "panel", relation: "Inside a panel: card padding" },
  { token: "section", relation: "Between page sections" },
  { token: "hero", relation: "Large home-page spacing (store only)" },
  { token: "gutter", relation: "Page side padding: 16 px phone, 24 px tablet, 32 px desktop" },
] as const;

/** Spacing chosen by relation, one token per level (tokeny.md §3). */
export function SpacingScale() {
  return (
    <Surface>
      <table className="w-full border-collapse type-small">
        <caption className="type-h3 mb-related text-left">Spacing by relation (4 px grid)</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-4">
              Token and class
            </th>
            <th scope="col" className="py-2 pr-4">
              Relation
            </th>
            <th scope="col" className="py-2">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {SPACES.map((space) => (
            <tr key={space.token} className="border-b align-middle">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                <code className="font-mono">--space-{space.token}</code> ·{" "}
                <code className="font-mono">gap-{space.token}</code>
              </th>
              <td className="py-2 pr-4">{space.relation}</td>
              <td className="py-2">
                <span
                  aria-hidden="true"
                  className="block h-3 rounded-sm bg-primary"
                  style={{ width: `var(--space-${space.token})` }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}

/** Radius, borders and the one overlay shadow (tokeny.md §5, K4, P4, P8). */
export function ShapeAndDepth() {
  return (
    <Surface>
      <div className="flex flex-wrap gap-group">
        <figure className="flex flex-col gap-related">
          <div className="flex h-control-md w-40 items-center justify-center rounded-control border border-input type-small">
            Control
          </div>
          <figcaption className="type-small text-muted-foreground">
            <code className="font-mono">rounded-control</code> 8 px,{" "}
            <code className="font-mono">border-input</code>
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-related">
          <div className="flex h-24 w-40 items-center justify-center rounded-card bg-surface-product type-small">
            {SAMPLE.product}
          </div>
          <figcaption className="type-small text-muted-foreground">
            <code className="font-mono">rounded-card</code> 12 px, no shadow
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-related">
          <span className="w-fit rounded-badge bg-success-surface px-2 py-0.5 type-small text-success">
            Paid
          </span>
          <figcaption className="type-small text-muted-foreground">
            <code className="font-mono">rounded-badge</code> 4 px
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-related">
          <div className="flex h-24 w-48 items-center justify-center rounded-card border bg-popover shadow-overlay type-small">
            Menu or dialog
          </div>
          <figcaption className="type-small text-muted-foreground">
            <code className="font-mono">shadow-overlay</code>: overlays only, always with a border
          </figcaption>
        </figure>
      </div>
    </Surface>
  );
}

const MOTION = [
  { token: "--duration-fast", value: "120 ms", use: "Color and hover; the default transition" },
  { token: "--duration-base", value: "200 ms", use: "Menu, popover, disclosure (exit 150 ms)" },
  { token: "--duration-slow", value: "300 ms", use: "Dialog and side panel" },
  { token: "--ease-out", value: "cubic-bezier(0.2, 0, 0, 1)", use: "Overlays entering" },
  { token: "--ease-in", value: "cubic-bezier(0.4, 0, 1, 1)", use: "Overlays leaving" },
] as const;

/** Motion tokens and the reduced-motion rule (tokeny.md §5, P9). */
export function MotionTokens() {
  return (
    <Surface>
      <table className="w-full border-collapse type-small">
        <caption className="type-h3 mb-related text-left">Durations and easing</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-4">
              Token
            </th>
            <th scope="col" className="py-2 pr-4">
              Value
            </th>
            <th scope="col" className="py-2">
              Use for
            </th>
          </tr>
        </thead>
        <tbody>
          {MOTION.map((item) => (
            <tr key={item.token} className="border-b">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                <code className="font-mono">{item.token}</code>
              </th>
              <td className="py-2 pr-4">{item.value}</td>
              <td className="py-2">{item.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mt-6 h-control-md rounded-control border border-input px-4 type-small transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Hover me: color changes in 120 ms
      </button>
    </Surface>
  );
}

const ICONS = [
  { Icon: IconSearch, name: "IconSearch", use: "Header search button (labelled “Search”)" },
  { Icon: IconShoppingCart, name: "IconShoppingCart", use: "Cart link, next to the word “Cart”" },
  { Icon: IconMenu2, name: "IconMenu2", use: "Mobile menu, next to the word “Menu”" },
] as const;

const SIZES = [
  { size: 16, where: "Admin" },
  { size: 20, where: "Store" },
  { size: 24, where: "Store frame" },
] as const;

/** The Tabler icons in use, at the three sizes and two stroke widths (tokeny.md §6). */
export function IconSet() {
  return (
    <Surface>
      <table className="w-full border-collapse type-small">
        <caption className="type-h3 mb-related text-left">
          Tabler icons in use: 16, 20 and 24 px; stroke 2 and 1.75 at 16 px (to confirm)
        </caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-4">
              Icon
            </th>
            {SIZES.map((s) => (
              <th key={s.size} scope="col" className="py-2 pr-4">
                {s.size} px ({s.where})
              </th>
            ))}
            <th scope="col" className="py-2 pr-4">
              16 px, stroke 1.75
            </th>
            <th scope="col" className="py-2">
              Where
            </th>
          </tr>
        </thead>
        <tbody>
          {ICONS.map(({ Icon, name, use }) => (
            <tr key={name} className="border-b align-middle">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                <code className="font-mono">{name}</code>
              </th>
              {SIZES.map((s) => (
                <td key={s.size} className="py-2 pr-4">
                  <Icon aria-hidden="true" size={s.size} stroke={2} />
                </td>
              ))}
              <td className="py-2 pr-4">
                <Icon aria-hidden="true" size={16} stroke={1.75} />
              </td>
              <td className="py-2">{use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}

const WIDTHS = [
  {
    width: "320 px",
    rule: "Phone minimum: no horizontal scroll, 16 px gutter, controls at least 44 px",
  },
  { width: "768 px", rule: "Tablet: 24 px gutter; the store menu becomes inline" },
  { width: "1440 px", rule: "Desktop: 32 px gutter; content stops at 72 rem (max-w-6xl)" },
] as const;

/** Breakpoints the screens are checked at, and the content width (tokeny.md §3). */
export function LayoutWidths() {
  return (
    <Surface>
      <ul className="flex flex-col gap-group-item type-body">
        {WIDTHS.map((item) => (
          <li key={item.width} className="flex flex-col gap-1 border-b pb-3">
            <span className="type-h3">{item.width}</span>
            <span className="text-muted-foreground">{item.rule}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
