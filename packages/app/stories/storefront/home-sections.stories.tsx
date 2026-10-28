import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { BestSellers } from "@/components/storefront/best-sellers";
import { CategoryTiles } from "@/components/storefront/category-tiles";
import { HomeHero } from "@/components/storefront/home-hero";
import { HomeSectionUnavailable } from "@/components/storefront/home-section-unavailable";
import { LowStockBannerItem, PromoBannerItem } from "@/components/storefront/promo-banners";
import { PROMO_BANNERS, WHY_BUY_HERE } from "@/components/storefront/storefront-content";
import { WhyBuyHere } from "@/components/storefront/why-buy-here";

/**
 * Storefront / Home sections. The real views of the home page (storefront v2 Phase 4), each as
 * its own story with a play test. The page composes them; the data comes from the loaders, which
 * the unit tests cover. Empty states are stories too: a section with nothing to show is omitted.
 */
const meta = {
  title: "Storefront/Home sections",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const categories = [
  { slug: "mice", name: "Mice", productCount: 3, imageUrl: "/photos/category-mice.jpg" },
  {
    slug: "keyboards",
    name: "Keyboards",
    productCount: 2,
    imageUrl: "/photos/product-keyboard-rgb.jpg",
  },
  { slug: "mousepads", name: "Mousepads", productCount: 1, imageUrl: null },
];

export const Hero: Story = {
  render: () => <HomeHero />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Gear for every desk and every match",
    );
    await expect(canvas.getByRole("link", { name: "Shop all products" })).toHaveAttribute(
      "href",
      "/products",
    );
    await expect(canvas.queryByText(/demo data/i)).toBeNull();
  },
};

export const PromoBanners: Story = {
  render: () => (
    <ul className="grid gap-4 md:grid-cols-3">
      {PROMO_BANNERS.map((banner) => (
        <PromoBannerItem key={banner.key} banner={banner} />
      ))}
      <LowStockBannerItem
        product={{ slug: "titan-mmo-mouse", name: "Titan MMO Mouse", stockQuantity: 2 }}
      />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Build your setup" })).toBeInTheDocument();
    await expect(canvas.getByText("Mousepads for every desk setup.")).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "See audio" })).toHaveAttribute(
      "href",
      "/products?category=headsets",
    );
    await expect(canvas.getByText("Titan MMO Mouse: 2 left")).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "View product" })).toHaveAttribute(
      "href",
      "/products/titan-mmo-mouse",
    );
  },
};

export const CategoryTilesDefault: Story = {
  name: "Category tiles",
  render: () => <CategoryTiles categories={categories} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Categories" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: /Mice 3 products/ })).toHaveAttribute(
      "href",
      "/products?category=mice",
    );
    await expect(canvas.getByRole("link", { name: /Mousepads 1 product/ })).toBeInTheDocument();
    await expect(canvas.getAllByText("No photo yet")).toHaveLength(1);
    await expect(canvasElement.querySelectorAll("img")).toHaveLength(2);
  },
};

export const CategoryTilesEmpty: Story = {
  name: "Category tiles, no published products",
  render: () => <CategoryTiles categories={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading", { name: "Categories" })).toBeNull();
    await expect(canvasElement.textContent).toBe("");
  },
};

export const WhyBuyHereDefault: Story = {
  name: "Why buy here",
  render: () => <WhyBuyHere items={WHY_BUY_HERE} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Why buy here" })).toBeInTheDocument();
    await expect(
      canvas.getByText("Example policy: delivery in 1–3 working days, 14-day returns."),
    ).toBeInTheDocument();
  },
};

export const BestSellersDefault: Story = {
  name: "Best sellers",
  render: () => <BestSellers names={["Vortex Wireless Mouse", "Nova TKL Mechanical Keyboard"]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Best sellers" })).toBeInTheDocument();
    const items = canvas.getAllByRole("listitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Vortex Wireless Mouse",
      "Nova TKL Mechanical Keyboard",
    ]);
  },
};

export const BestSellersEmpty: Story = {
  name: "Best sellers, no paid orders in 30 days",
  render: () => <BestSellers names={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading", { name: "Best sellers" })).toBeNull();
    await expect(canvasElement.textContent).toBe("");
  },
};

export const SectionUnavailable: Story = {
  name: "Section unavailable",
  render: () => <HomeSectionUnavailable id="home-best" title="Best sellers" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Best sellers" })).toBeInTheDocument();
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "The catalog is temporarily unavailable.",
    );
  },
};
