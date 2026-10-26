import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TECHNICAL_DATA_EMPTY } from "@/components/catalog/product-page-copy";
import { ProductTabs } from "@/components/catalog/product-tabs";
import { DELIVERY_EXAMPLE_TEXT } from "@/components/storefront/storefront-content";

/**
 * Storefront / Product page / Tabs. The details under the price of `/products/[slug]` (storefront
 * v2, Phase 3): Description, Technical data (with and without rows) and Delivery and returns.
 */

const tabsMeta = {
  title: "Storefront/Product page/Tabs",
  component: ProductTabs,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductTabs>;

export default tabsMeta;
type TabsStory = StoryObj<typeof tabsMeta>;

const DESCRIPTION = "Wireless gaming mouse with a 26,000 DPI sensor.\nTwo connection modes.";

export const WithTechnicalData: TabsStory = {
  args: {
    description: DESCRIPTION,
    technicalSpecs: [
      { label: "Sensor", value: "Optical, 26,000 DPI" },
      { label: "Connection", value: "2.4 GHz wireless or Bluetooth" },
      { label: "Weight", value: "78 g" },
    ],
  },
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByText(/Wireless gaming mouse with a 26,000 DPI sensor\./),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("tab", { name: "Technical data" }));
    await expect(canvas.getByText("Example values for the demo store.")).toBeInTheDocument();
    await expect(canvas.getByText("Sensor")).toBeInTheDocument();
    await expect(canvas.getByText("Optical, 26,000 DPI")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("tab", { name: "Delivery and returns" }));
    await expect(canvas.getByText(DELIVERY_EXAMPLE_TEXT)).toBeInTheDocument();
    await expect(canvas.queryByText("Sensor")).toBeNull();
  },
};

export const WithoutTechnicalData: TabsStory = {
  args: { description: DESCRIPTION, technicalSpecs: [] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Technical data" }));
    await expect(canvas.getByText(TECHNICAL_DATA_EMPTY)).toBeInTheDocument();
    await expect(canvas.queryByText("Example values for the demo store.")).toBeNull();
    await expect(within(canvas.getByRole("tablist")).getAllByRole("tab")).toHaveLength(3);
  },
};
