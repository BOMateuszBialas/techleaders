import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// Only the product's name in the Storybook UI (prompt rule 10). The base library (shadcn/ui on
// Base UI) is recorded in the technical note, not in the interface.
addons.setConfig({
  theme: create({ base: "light", brandTitle: "CommerceOS design system" }),
});
