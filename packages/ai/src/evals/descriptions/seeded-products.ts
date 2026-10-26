/**
 * The demo catalog's products as the seed stores them (D10, `DEMO_CATALOG` in
 * `packages/database/src/seeders/DatabaseSeeder.ts`): name, category name, price and description.
 * Seeded text carries no `[DEMO]` prefix (storefront v2, R11); the demo marker is the `DEMO-` SKU.
 * `ai` may not import the database package, so this is a copy; the description-draft integration
 * test (`packages/app/src/server/catalog/description-draft.int.test.ts`) compares it with the
 * seeded rows, so a change to the seed fails until this list and the glossary follow.
 */
import type { EvalCategoryName } from "./eval-categories";

export type SeededProduct = {
  slug: string;
  /** The seeded `DEMO-` SKU: the demo marker (OA-3). */
  sku: string;
  name: string;
  category: EvalCategoryName;
  priceMinor: number;
  description: string;
};

export const SEEDED_PRODUCTS: readonly SeededProduct[] = [
  {
    slug: "vortex-wireless-mouse",
    sku: "DEMO-MOU-001",
    name: "Vortex Wireless Mouse",
    category: "Mice",
    priceMinor: 24900,
    description:
      "Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
  },
  {
    slug: "pulse-ultralight-mouse",
    sku: "DEMO-MOU-002",
    name: "Pulse Ultralight Mouse",
    category: "Mice",
    priceMinor: 18900,
    description:
      "A 58 g wired mouse with a honeycomb-free shell and a flexible paracord cable for fast flick shots.",
  },
  {
    slug: "titan-mmo-mouse",
    sku: "DEMO-MOU-003",
    name: "Titan MMO Mouse",
    category: "Mice",
    priceMinor: 29900,
    description:
      "Twelve thumb buttons in a side grid for MMO and MOBA hotkeys, with on-board memory for five profiles.",
  },
  {
    slug: "nova-tkl-mechanical-keyboard",
    sku: "DEMO-KEY-001",
    name: "Nova TKL Mechanical Keyboard",
    category: "Keyboards",
    priceMinor: 39900,
    description:
      "Tenkeyless mechanical keyboard with hot-swappable linear switches, PBT keycaps and per-key RGB lighting.",
  },
  {
    slug: "strike-60-keyboard",
    sku: "DEMO-KEY-002",
    name: "Strike 60 Keyboard",
    category: "Keyboards",
    priceMinor: 32900,
    description:
      "Compact 60 percent keyboard with tactile switches and a detachable USB-C cable; more room for wide mouse swipes.",
  },
  {
    slug: "aurora-full-size-keyboard",
    sku: "DEMO-KEY-003",
    name: "Aurora Full-Size Keyboard",
    category: "Keyboards",
    priceMinor: 45900,
    description:
      "Full-size mechanical keyboard with a numpad, a volume roller and a magnetic wrist rest.",
  },
  {
    slug: "echo-surround-headset",
    sku: "DEMO-HEA-001",
    name: "Echo Surround Headset",
    category: "Headsets",
    priceMinor: 34900,
    description:
      "Wired headset with virtual 7.1 surround sound, 50 mm drivers and a detachable noise-cancelling microphone.",
  },
  {
    slug: "drift-wireless-headset",
    sku: "DEMO-HEA-002",
    name: "Drift Wireless Headset",
    category: "Headsets",
    priceMinor: 54900,
    description:
      "Low-latency 2.4 GHz wireless headset with Bluetooth, memory-foam ear cushions and 40 hours of battery life.",
  },
  {
    slug: "nimbus-stereo-headset",
    sku: "DEMO-HEA-003",
    name: "Nimbus Stereo Headset",
    category: "Headsets",
    priceMinor: 15900,
    description:
      "Lightweight stereo headset with a 3.5 mm jack that works with PC, consoles and handhelds.",
  },
  {
    slug: "apex-wireless-controller",
    sku: "DEMO-CON-001",
    name: "Apex Wireless Controller",
    category: "Controllers",
    priceMinor: 27900,
    description:
      "Wireless controller with Hall-effect sticks, two rear paddles and a USB-C charging cable.",
  },
  {
    slug: "retro-wired-controller",
    sku: "DEMO-CON-002",
    name: "Retro Wired Controller",
    category: "Controllers",
    priceMinor: 9900,
    description:
      "Classic-layout wired controller with a precise D-pad for platformers and emulated games.",
  },
  {
    slug: "arena-fight-stick",
    sku: "DEMO-CON-003",
    name: "Arena Fight Stick",
    category: "Controllers",
    priceMinor: 64900,
    description:
      "Arcade fight stick with a ball-top lever, eight 30 mm buttons and a steel base that stays put.",
  },
  {
    slug: "glide-xl-mousepad",
    sku: "DEMO-PAD-001",
    name: "Glide XL Mousepad",
    category: "Mousepads",
    priceMinor: 12900,
    description:
      "Extended 900 x 400 mm speed-surface mousepad with stitched edges that covers the whole desk.",
  },
  {
    slug: "control-cloth-mousepad",
    sku: "DEMO-PAD-002",
    name: "Control Cloth Mousepad",
    category: "Mousepads",
    priceMinor: 7900,
    description:
      "Medium cloth mousepad with a textured control surface and a non-slip rubber base.",
  },
  {
    slug: "tempered-glass-mousepad",
    sku: "DEMO-PAD-003",
    name: "Tempered Glass Mousepad",
    category: "Mousepads",
    priceMinor: 29900,
    description:
      "Tempered glass mousepad with an etched surface for consistent glide and easy cleaning.",
  },
];
