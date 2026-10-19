/**
 * The demo catalog's products as the seed stores them (D10, `DEMO_CATALOG` in
 * `packages/database/src/seeders/DatabaseSeeder.ts`): name, category name, price and description.
 * `ai` may not import the database package, so this is a copy; the description-draft integration
 * test (`packages/app/src/server/catalog/description-draft.int.test.ts`) compares it with the
 * seeded rows, so a change to the seed fails until this list and the glossary follow.
 */
import type { EvalCategoryName } from "./eval-categories";

export type SeededProduct = {
  slug: string;
  name: string;
  category: EvalCategoryName;
  priceMinor: number;
  description: string;
};

export const SEEDED_PRODUCTS: readonly SeededProduct[] = [
  {
    slug: "vortex-wireless-mouse",
    name: "Vortex Wireless Mouse",
    category: "Mice",
    priceMinor: 24900,
    description:
      "[DEMO] Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
  },
  {
    slug: "pulse-ultralight-mouse",
    name: "Pulse Ultralight Mouse",
    category: "Mice",
    priceMinor: 18900,
    description:
      "[DEMO] A 58 g wired mouse with a honeycomb-free shell and a flexible paracord cable for fast flick shots.",
  },
  {
    slug: "titan-mmo-mouse",
    name: "Titan MMO Mouse",
    category: "Mice",
    priceMinor: 29900,
    description:
      "[DEMO] Twelve thumb buttons in a side grid for MMO and MOBA hotkeys, with on-board memory for five profiles.",
  },
  {
    slug: "nova-tkl-mechanical-keyboard",
    name: "Nova TKL Mechanical Keyboard",
    category: "Keyboards",
    priceMinor: 39900,
    description:
      "[DEMO] Tenkeyless mechanical keyboard with hot-swappable linear switches, PBT keycaps and per-key RGB lighting.",
  },
  {
    slug: "strike-60-keyboard",
    name: "Strike 60 Keyboard",
    category: "Keyboards",
    priceMinor: 32900,
    description:
      "[DEMO] Compact 60 percent keyboard with tactile switches and a detachable USB-C cable; more room for wide mouse swipes.",
  },
  {
    slug: "aurora-full-size-keyboard",
    name: "Aurora Full-Size Keyboard",
    category: "Keyboards",
    priceMinor: 45900,
    description:
      "[DEMO] Full-size mechanical keyboard with a numpad, a volume roller and a magnetic wrist rest.",
  },
  {
    slug: "echo-surround-headset",
    name: "Echo Surround Headset",
    category: "Headsets",
    priceMinor: 34900,
    description:
      "[DEMO] Wired headset with virtual 7.1 surround sound, 50 mm drivers and a detachable noise-cancelling microphone.",
  },
  {
    slug: "drift-wireless-headset",
    name: "Drift Wireless Headset",
    category: "Headsets",
    priceMinor: 54900,
    description:
      "[DEMO] Low-latency 2.4 GHz wireless headset with Bluetooth, memory-foam ear cushions and 40 hours of battery life.",
  },
  {
    slug: "nimbus-stereo-headset",
    name: "Nimbus Stereo Headset",
    category: "Headsets",
    priceMinor: 15900,
    description:
      "[DEMO] Lightweight stereo headset with a 3.5 mm jack that works with PC, consoles and handhelds.",
  },
  {
    slug: "apex-wireless-controller",
    name: "Apex Wireless Controller",
    category: "Controllers",
    priceMinor: 27900,
    description:
      "[DEMO] Wireless controller with Hall-effect sticks, two rear paddles and a USB-C charging cable.",
  },
  {
    slug: "retro-wired-controller",
    name: "Retro Wired Controller",
    category: "Controllers",
    priceMinor: 9900,
    description:
      "[DEMO] Classic-layout wired controller with a precise D-pad for platformers and emulated games.",
  },
  {
    slug: "arena-fight-stick",
    name: "Arena Fight Stick",
    category: "Controllers",
    priceMinor: 64900,
    description:
      "[DEMO] Arcade fight stick with a ball-top lever, eight 30 mm buttons and a steel base that stays put.",
  },
  {
    slug: "glide-xl-mousepad",
    name: "Glide XL Mousepad",
    category: "Mousepads",
    priceMinor: 12900,
    description:
      "[DEMO] Extended 900 x 400 mm speed-surface mousepad with stitched edges that covers the whole desk.",
  },
  {
    slug: "control-cloth-mousepad",
    name: "Control Cloth Mousepad",
    category: "Mousepads",
    priceMinor: 7900,
    description:
      "[DEMO] Medium cloth mousepad with a textured control surface and a non-slip rubber base.",
  },
  {
    slug: "tempered-glass-mousepad",
    name: "Tempered Glass Mousepad",
    category: "Mousepads",
    priceMinor: 29900,
    description:
      "[DEMO] Tempered glass mousepad with an etched surface for consistent glide and easy cleaning.",
  },
];
