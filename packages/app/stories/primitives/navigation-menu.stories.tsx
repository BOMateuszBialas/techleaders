import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconArrowRight } from "@tabler/icons-react";
import { expect, screen, waitFor } from "storybook/test";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuGrid,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

/**
 * Primitives / Navigation menu (megamenu). Real component from `@/components/ui/navigation-menu`
 * (Base UI `NavigationMenu`). Data: the seeded categories (`CatalogCategory`: slug, name,
 * description; decision D10). The panel renders in a portal, so play functions query `screen`.
 */
const meta = {
  title: "Primitives/Navigation menu",
  component: NavigationMenu,
  parameters: {
    layout: "fullscreen",
    // Base UI places two 1 px focus-guard spans (aria-hidden, tabindex 0) around the open panel; when
    // focus lands on one, Base UI moves it into the panel or back to the trigger at once, so they are
    // never a stop a user perceives. axe flags them (aria-hidden-focus); the rest of the page is
    // still checked, including the panel and its links.
    a11y: { context: { exclude: ["[data-base-ui-focus-guard]"] } },
  },
  argTypes: {
    delay: {
      control: "number",
      description: "Hover intent before opening, in ms (B4.24).",
      table: { defaultValue: { summary: "200" } },
    },
    closeDelay: {
      control: "number",
      description: "Delay before closing after the pointer leaves, in ms.",
      table: { defaultValue: { summary: "300" } },
    },
    align: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Panel alignment to the trigger.",
      table: { defaultValue: { summary: "start" } },
    },
  },
  render: (args) => (
    <StoreHeader>
      <ShopMenu {...args} />
    </StoreHeader>
  ),
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

type Category = { slug: string; name: string; description: string | null };

/** The seeded demo catalog (packages/database/src/seeders/DatabaseSeeder.ts). */
const SEED_CATEGORIES: Category[] = [
  { slug: "mice", name: "Mice", description: "[DEMO] Gaming mice: wired, wireless and MMO." },
  {
    slug: "keyboards",
    name: "Keyboards",
    description: "[DEMO] Mechanical keyboards in full-size, TKL and 60% layouts.",
  },
  { slug: "headsets", name: "Headsets", description: "[DEMO] Wired and wireless gaming headsets." },
  { slug: "controllers", name: "Controllers", description: "[DEMO] Gamepads and fight sticks." },
  { slug: "mousepads", name: "Mousepads", description: "[DEMO] Cloth, speed and glass mousepads." },
];

const href = (slug?: string) => (slug ? `/products?category=${slug}` : "/products");

function ShopMenu({
  categories = SEED_CATEGORIES,
  current,
  ...props
}: React.ComponentProps<typeof NavigationMenu> & { categories?: Category[]; current?: string }) {
  return (
    <NavigationMenu aria-label="Main" {...props}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger href={href()}>Shop</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href={href()} className="w-full">
              <span className="inline-flex items-center gap-related">
                Shop all <IconArrowRight aria-hidden="true" className="size-4" />
              </span>
            </NavigationMenuLink>
            <NavigationMenuGrid>
              {categories.map((category) => (
                <li key={category.slug}>
                  <NavigationMenuLink
                    href={href(category.slug)}
                    description={category.description}
                    active={category.slug === current}
                  >
                    {category.name}
                  </NavigationMenuLink>
                </li>
              ))}
            </NavigationMenuGrid>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

/** A stand-in for the store header: logo on the left, the menu next to it. */
function StoreHeader({ children, frame = false }: { children: React.ReactNode; frame?: boolean }) {
  return (
    <div className="min-h-96">
      <header
        className={
          frame
            ? "border-b border-frame-border bg-frame text-frame-foreground"
            : "border-b border-border bg-background text-foreground"
        }
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-group px-gutter">
          <span className="type-body font-semibold">CommerceOS Demo</span>
          {children}
        </div>
      </header>
    </div>
  );
}

async function panelClosed() {
  await waitFor(() =>
    expect(document.querySelector("[data-slot=navigation-menu-popup]")).toBeNull(),
  );
}

export const Playground: Story = {};

/**
 * Without JavaScript the trigger is a link to the catalog (spec G13); the category links are in
 * the server HTML, hidden until the panel opens (`keepMounted`). With JavaScript a click opens
 * the panel and does not navigate.
 */
export const ClickOpensPanel: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Shop" });
    await expect(trigger.tagName).toBe("A");
    await expect(trigger).toHaveAttribute("href", "/products");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Kept mounted: every category link is already in the DOM, hidden.
    const hidden = document.querySelector(
      '[data-slot=navigation-menu-content] a[href="/products?category=mice"]',
    );
    await expect(hidden).not.toBeNull();
    const before = window.location.href;
    await userEvent.click(trigger);
    const mice = await screen.findByRole("link", { name: /^Mice/ });
    await expect(window.location.href).toBe(before);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(mice).toHaveAttribute("href", "/products?category=mice");
    for (const category of SEED_CATEGORIES) {
      await expect(
        screen.getByRole("link", { name: new RegExp(`^${category.name}`) }),
      ).toHaveAttribute("href", href(category.slug));
    }
    await expect(screen.getByRole("link", { name: "Shop all" })).toHaveAttribute(
      "href",
      "/products",
    );
    const positioner = document.querySelector("[data-slot=navigation-menu-positioner]");
    await expect(positioner ? getComputedStyle(positioner).zIndex : null).toBe("50");
  },
};

/** Keyboard: Enter opens, Tab enters the panel, Escape closes and returns focus (B4.26). */
export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Shop" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expect(getComputedStyle(trigger).outlineStyle).toBe("solid");
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("link", { name: "Shop all" });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.tab();
    await waitFor(() => expect(screen.getByRole("link", { name: "Shop all" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await panelClosed();
    await waitFor(() => expect(trigger).toHaveFocus());
    // ArrowDown opens it too.
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("link", { name: "Shop all" });
    await userEvent.keyboard("{Escape}");
    await panelClosed();
  },
};

/**
 * Hover opens after the 200 ms intent delay (not at once) and closes after the pointer leaves.
 * Moving from the trigger onto the panel uses Base UI's safe triangle, which needs real pointer
 * coordinates; that path is checked by hand in Chromium, not here (synthetic events carry none).
 */
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Shop" });
    const popup = () => document.querySelector("[data-slot=navigation-menu-popup]");
    await userEvent.hover(trigger);
    await expect(popup()).toBeNull();
    await screen.findByRole("link", { name: "Shop all" }, { timeout: 2000 });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.unhover(trigger);
    await panelClosed();
  },
};

/** The current category is `aria-current="page"` with a 2 px underline (B4.26). */
export const CurrentCategory: Story = {
  render: () => (
    <StoreHeader>
      <ShopMenu current="keyboards" />
    </StoreHeader>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Shop" }));
    const current = await screen.findByRole("link", { name: /^Keyboards/ });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(screen.getByRole("link", { name: /^Mice/ })).not.toHaveAttribute("aria-current");
  },
};

/**
 * On the dark store frame (the header after the retrofit): the trigger takes the frame text color
 * and its focus outline follows it (pair 32); the panel keeps the popover surface.
 */
export const OnDarkFrame: Story = {
  render: () => (
    <StoreHeader frame>
      <ShopMenu />
    </StoreHeader>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Shop" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    const style = getComputedStyle(trigger);
    await expect(style.outlineColor).toBe(style.color);
    await userEvent.keyboard("{Enter}");
    const popup = await waitFor(() => {
      const element = document.querySelector("[data-slot=navigation-menu-popup]");
      if (!element) throw new Error("panel not open");
      return element;
    });
    await expect(getComputedStyle(popup).backgroundColor).not.toBe(style.backgroundColor);
  },
};

const MANY_CATEGORIES: Category[] = [
  ...SEED_CATEGORIES,
  { slug: "monitors", name: "Monitors", description: "[DEMO] 24–32 inch gaming monitors." },
  {
    slug: "streaming-microphones",
    name: "Streaming microphones and broadcast accessories",
    description: "[DEMO] USB and XLR microphones, arms, pop filters and shock mounts.",
  },
  { slug: "chairs", name: "Chairs", description: null },
  { slug: "desks", name: "Desks", description: "[DEMO] Height-adjustable gaming desks." },
  { slug: "webcams", name: "Webcams", description: "[DEMO] 1080p and 4K webcams." },
  { slug: "cables", name: "Cables", description: "[DEMO] Paracord and coiled cables." },
  { slug: "bags", name: "Bags", description: "[DEMO] Backpacks and keyboard cases." },
];

/**
 * Twelve categories, one with a long name and one without a description: three columns at
 * desktop width, names wrap, the panel stays inside the window (B4.23).
 */
export const ManyCategories: Story = {
  render: () => (
    <StoreHeader>
      <ShopMenu categories={MANY_CATEGORIES} />
    </StoreHeader>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Shop" }));
    const long = await screen.findByRole("link", { name: /^Streaming microphones/ });
    await waitFor(() => {
      const popup = document.querySelector("[data-slot=navigation-menu-popup]");
      const rect = popup?.getBoundingClientRect();
      expect(rect && rect.right <= window.innerWidth && rect.width > 0).toBe(true);
    });
    const grid = long.closest("[data-slot=navigation-menu-grid]");
    await expect(grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0).toBe(3);
  },
};
