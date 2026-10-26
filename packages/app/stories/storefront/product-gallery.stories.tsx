import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ProductGallery } from "@/components/catalog/product-gallery";

/**
 * Storefront / Product page / Gallery. The gallery of `/products/[slug]` (storefront v2, Phase 3):
 * one image, thumbnails from two images (Q9), and the placeholder without a photo. The page itself
 * is a Server Component with a database read, so the stories render the same client component.
 */

// Photos under public/photos/ (the storefront photo rule shows only /photos/ paths).
const PHOTO_IMAGES = [
  "/photos/product-mouse-black.jpg",
  "/photos/product-keyboard-rgb.jpg",
  "/photos/product-headset-black.jpg",
];

const galleryMeta = {
  title: "Storefront/Product page/Gallery",
  component: ProductGallery,
  args: { name: "Vortex Wireless Mouse" },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductGallery>;

export default galleryMeta;
type GalleryStory = StoryObj<typeof galleryMeta>;

export const OneImage: GalleryStory = {
  args: { imageUrls: [PHOTO_IMAGES[0] ?? ""] },
  play: async ({ canvas }) => {
    // One image: no thumbnail row (Q9).
    await expect(canvas.queryByRole("group", { name: "Product images" })).toBeNull();
    await expect(canvas.getByRole("img", { name: "Vortex Wireless Mouse" })).toBeInTheDocument();
  },
};

export const ThreeImages: GalleryStory = {
  args: { imageUrls: PHOTO_IMAGES },
  play: async ({ canvas, userEvent }) => {
    const row = canvas.getByRole("group", { name: "Product images" });
    const second = canvas.getByRole("button", { name: "Show image 2 of 3" });
    await expect(canvas.getByRole("button", { name: "Show image 1 of 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(row).toContainElement(second);

    await userEvent.click(second);
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "Show image 1 of 3" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Arrow keys move the selection along the thumbnail row.
    second.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Show image 3 of 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const NoPhoto: GalleryStory = {
  args: { imageUrls: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No photo yet")).toBeInTheDocument();
    await expect(canvas.queryByRole("group", { name: "Product images" })).toBeNull();
  },
};
