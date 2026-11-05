import type { TechnicalSpec } from "@commerceos/core";

/**
 * The longer product content of the demo catalogue (storefront visual polish, 2026-11-05): a
 * description in two or three paragraphs (a blank line between them) and the technical data rows.
 * All values are fictional demo data, shown on the product page with an "Example values" note.
 * The seeder and the migration `Migration20261106090000_demo_product_content` read this one file.
 * Keyed by SKU, and the slug must match too, so only the seeded demo products are changed.
 */
export type DemoProductContent = {
  slug: string;
  sku: string;
  description: string;
  technicalSpecs: TechnicalSpec[];
};

export const DEMO_PRODUCT_CONTENT: readonly DemoProductContent[] = [
  {
    slug: "vortex-wireless-mouse",
    sku: "DEMO-MOU-001",
    description:
      "The Vortex is a wireless gaming mouse built for long sessions. Its 26,000 DPI optical sensor tracks fast, precise movements on most surfaces, and the lightweight shell keeps the hand relaxed during a match or a long design session.\n\nThe battery lasts up to 70 hours on a single charge, and the 2.4 GHz receiver stays stable on a crowded desk. Six programmable buttons, on-board memory for two profiles and a switch-rated click make the mouse ready for any game or application.",
    technicalSpecs: [
      { label: "Sensor", value: "Optical, 26,000 DPI" },
      { label: "Connection", value: "2.4 GHz wireless receiver" },
      { label: "Battery life", value: "Up to 70 hours" },
      { label: "Buttons", value: "6 programmable, switch-rated" },
      { label: "Weight", value: "78 g" },
      { label: "Profiles", value: "2 on-board memory profiles" },
    ],
  },
  {
    slug: "pulse-ultralight-mouse",
    sku: "DEMO-MOU-002",
    description:
      "The Pulse Ultralight weighs 58 grams, so it moves with very little effort. The honeycomb-free shell is light without feeling thin, and the grip stays firm for fast flicks and quick turns in shooters and racing games.\n\nThe flexible paracord cable does not drag across the desk. A 26,000 DPI sensor and a low-latency wired connection keep every movement accurate from the first frame.",
    technicalSpecs: [
      { label: "Sensor", value: "Optical, 26,000 DPI" },
      { label: "Connection", value: "Wired, USB, 1,000 Hz polling" },
      { label: "Weight", value: "58 g" },
      { label: "Cable", value: "Flexible paracord, 1.8 m" },
      { label: "Buttons", value: "6, including two side buttons" },
      { label: "Grip", value: "Palm and claw" },
    ],
  },
  {
    slug: "titan-mmo-mouse",
    sku: "DEMO-MOU-003",
    description:
      "The Titan MMO mouse puts twelve thumb buttons in a side grid, so spells, abilities and hotbar keys sit under the thumb instead of on the keyboard. Each button is reachable without moving the hand from the mouse, which suits long raids and MOBA sessions.\n\nOn-board memory keeps the button layout between computers. The thumb rest is adjustable, and the non-slip base holds the mouse in place during fast movements.",
    technicalSpecs: [
      { label: "Thumb buttons", value: "12 in a side grid" },
      { label: "Total buttons", value: "15" },
      { label: "Connection", value: "Wired, USB" },
      { label: "On-board memory", value: "Yes, 3 profiles" },
      { label: "Thumb rest", value: "Adjustable" },
      { label: "Weight", value: "112 g" },
    ],
  },
  {
    slug: "echo-surround-headset",
    sku: "DEMO-HEA-001",
    description:
      "The Echo headset adds a virtual 7.1 surround mix to any stereo source, so footsteps and voices come from the right direction in games and films. The 50 mm drivers give a clear midrange and a solid low end without muddying the sound.\n\nThe detachable noise-cancelling microphone folds away when you do not need it. Memory-foam ear cushions and an adjustable headband keep the headset comfortable through a long session.",
    technicalSpecs: [
      { label: "Sound", value: "Virtual 7.1 surround" },
      { label: "Drivers", value: "50 mm" },
      { label: "Connection", value: "Wired, 3.5 mm and USB adapter" },
      { label: "Microphone", value: "Detachable, noise-cancelling" },
      { label: "Ear cushions", value: "Memory foam" },
      { label: "Cable", value: "2 m, inline volume control" },
    ],
  },
  {
    slug: "drift-wireless-headset",
    sku: "DEMO-HEA-002",
    description:
      "The Drift is a wireless headset with a 2.4 GHz connection for the lowest latency and Bluetooth for a phone or a laptop. Switching between the two is one press of a button, so a call can interrupt a match without any setup.\n\nThe memory-foam ear cushions and a light frame make the Drift easy to wear for hours. The battery lasts about 30 hours, and a quick charge gives several hours of use from a short break.",
    technicalSpecs: [
      { label: "Connection", value: "2.4 GHz wireless and Bluetooth" },
      { label: "Battery life", value: "About 30 hours" },
      { label: "Quick charge", value: "Several hours from 15 minutes" },
      { label: "Ear cushions", value: "Memory foam" },
      { label: "Microphone", value: "Boom, noise-cancelling" },
      { label: "Weight", value: "260 g" },
    ],
  },
  {
    slug: "nimbus-stereo-headset",
    sku: "DEMO-HEA-003",
    description:
      "The Nimbus is a lightweight stereo headset with a 3.5 mm jack, so it works with a PC, a console, a phone or a laptop without an adapter. It is a sensible choice for a first headset or a second one kept by the screen.\n\nThe open-back design keeps the sound natural, and the flexible headband fits most head sizes. The cable has an inline microphone and a mute button for calls.",
    technicalSpecs: [
      { label: "Connection", value: "3.5 mm jack" },
      { label: "Compatibility", value: "PC, console, phone, laptop" },
      { label: "Design", value: "Open back" },
      { label: "Microphone", value: "Inline, with a mute button" },
      { label: "Cable", value: "1.5 m" },
      { label: "Weight", value: "210 g" },
    ],
  },
  {
    slug: "nova-tkl-mechanical-keyboard",
    sku: "DEMO-KEY-001",
    description:
      "The Nova is a tenkeyless mechanical keyboard. Without the numpad it leaves room for the mouse, which keeps the mouse hand close to the centre of the desk. The hot-swappable linear switches can be changed without soldering, so the feel can be adjusted later.\n\nThe PBT keycaps resist shine and wear, and the RGB backlight can be set per key. A detachable USB-C cable makes the keyboard easy to move between desks.",
    technicalSpecs: [
      { label: "Layout", value: "Tenkeyless (87 keys)" },
      { label: "Switches", value: "Hot-swappable linear" },
      { label: "Keycaps", value: "PBT, double-shot" },
      { label: "Backlight", value: "RGB, per-key settings" },
      { label: "Cable", value: "Detachable USB-C" },
      { label: "Weight", value: "890 g" },
    ],
  },
  {
    slug: "strike-60-keyboard",
    sku: "DEMO-KEY-002",
    description:
      "The Strike 60 is a compact 60 percent keyboard. It keeps the letters, numbers and modifiers and drops the rest, so the desk stays clear and the keyboard fits a small travel bag. Function layers give access to the missing keys without taking the hands off the home row.\n\nThe tactile switches give a clear bump at the actuation point, which suits typing and games. The detachable USB-C cable can be replaced when it wears out.",
    technicalSpecs: [
      { label: "Layout", value: "60 percent (61 keys)" },
      { label: "Switches", value: "Tactile" },
      { label: "Cable", value: "Detachable USB-C" },
      { label: "Function layer", value: "Yes, for the missing keys" },
      { label: "Backlight", value: "Single colour" },
      { label: "Weight", value: "620 g" },
    ],
  },
  {
    slug: "aurora-full-size-keyboard",
    sku: "DEMO-KEY-003",
    description:
      "The Aurora is a full-size mechanical keyboard with a numpad, for spreadsheets, numbers and a complete set of function keys. A volume roller sits in the top right corner, and a magnetic wrist rest keeps the hands at a comfortable angle during long typing sessions.\n\nThe aluminium top plate gives the keyboard a firm feel and keeps it steady on the desk. The RGB lighting follows the key presses, and every switch can be replaced when you want a different feel.",
    technicalSpecs: [
      { label: "Layout", value: "Full size with numpad (104 keys)" },
      { label: "Switches", value: "Mechanical, replaceable" },
      { label: "Top plate", value: "Aluminium" },
      { label: "Volume", value: "Roller in the top right corner" },
      { label: "Wrist rest", value: "Magnetic, included" },
      { label: "Weight", value: "1.2 kg" },
    ],
  },
  {
    slug: "apex-wireless-controller",
    sku: "DEMO-CON-001",
    description:
      "The Apex is a wireless controller for PC and consoles. The textured grips keep it steady through long races and fights, and the triggers respond with a short travel that suits fast inputs.\n\nThe battery lasts up to 40 hours, and the controller charges through a USB-C port. The back buttons can be mapped to any action, so a favourite move is always under a finger.",
    technicalSpecs: [
      { label: "Connection", value: "Wireless, with a USB-C cable" },
      { label: "Platforms", value: "PC, two consoles" },
      { label: "Battery life", value: "Up to 40 hours" },
      { label: "Back buttons", value: "2, remappable" },
      { label: "Triggers", value: "Short travel, adjustable" },
      { label: "Weight", value: "250 g" },
    ],
  },
  {
    slug: "retro-wired-controller",
    sku: "DEMO-CON-002",
    description:
      "The Retro controller keeps the classic layout: a precise cross D-pad, four face buttons and two shoulder buttons. It is a good match for platformers, puzzle games and emulators, where a clear and direct D-pad matters more than analogue sticks.\n\nThe cable is long enough for a sofa or a desk, and the controller needs no batteries. A simple, durable build means it stays light and ready to play for years.",
    technicalSpecs: [
      { label: "Connection", value: "Wired, 3 m cable" },
      { label: "Layout", value: "Classic: D-pad, 4 face and 2 shoulder buttons" },
      { label: "D-pad", value: "Cross, precise" },
      { label: "Batteries", value: "Not needed" },
      { label: "Platforms", value: "PC, classic consoles via adapter" },
      { label: "Weight", value: "180 g" },
    ],
  },
  {
    slug: "arena-fight-stick",
    sku: "DEMO-CON-003",
    description:
      "The Arena is an arcade fight stick with a ball-top lever and eight 30 mm buttons. The layout follows the classic arcade standard, so the hands learn the controls quickly, and the buttons have a firm click that suits combos and fast inputs.\n\nThe steel base keeps the stick in place on a table, and the removable top plate lets you change the button layout or add a custom panel. The stick works on PC and on consoles that accept wired arcade controllers.",
    technicalSpecs: [
      { label: "Lever", value: "Ball top, microswitched" },
      { label: "Buttons", value: "8 x 30 mm, arcade layout" },
      { label: "Base", value: "Steel, non-slip feet" },
      { label: "Top plate", value: "Removable" },
      { label: "Connection", value: "Wired, USB" },
      { label: "Weight", value: "3.4 kg" },
    ],
  },
  {
    slug: "control-cloth-mousepad",
    sku: "DEMO-PAD-002",
    description:
      "The Control cloth mousepad has a textured surface that gives the mouse a little resistance, which many players prefer for precise aiming and small movements. The surface stays consistent over time and handles dust and humidity well.\n\nThe non-slip rubber base keeps the pad in place on a desk, even during fast turns. It is a medium size that fits most desks and keeps the mouse path inside the pad.",
    technicalSpecs: [
      { label: "Size", value: "Medium, 350 x 250 mm" },
      { label: "Surface", value: "Textured cloth, control" },
      { label: "Base", value: "Natural rubber, non-slip" },
      { label: "Thickness", value: "3 mm" },
      { label: "Care", value: "Machine wash cold, air dry" },
      { label: "Weight", value: "260 g" },
    ],
  },
  {
    slug: "glide-xl-mousepad",
    sku: "DEMO-PAD-001",
    description:
      "The Glide XL is an extended speed-surface mousepad with stitched edges that cover the whole desk in front of the keyboard. A large area lets the mouse travel far on one stroke, which suits open-world games and wide-screen designs.\n\nThe smooth cloth surface gives an even glide in every direction. The stitched edges resist fraying, and the rubber base keeps the pad flat on the desk.",
    technicalSpecs: [
      { label: "Size", value: "Extended, 900 x 400 mm" },
      { label: "Surface", value: "Smooth speed cloth" },
      { label: "Edges", value: "Stitched" },
      { label: "Base", value: "Natural rubber, non-slip" },
      { label: "Thickness", value: "4 mm" },
      { label: "Weight", value: "780 g" },
    ],
  },
  {
    slug: "tempered-glass-mousepad",
    sku: "DEMO-PAD-003",
    description:
      "The tempered glass mousepad has an etched surface for a consistent glide and a cool, smooth feel. The glass does not absorb dust or moisture, so a quick wipe with a dry cloth keeps it clean.\n\nThe pad suits players who want a fast, low-friction surface. The rubber feet keep it stable on the desk, and the thin profile sits flat under the keyboard.",
    technicalSpecs: [
      { label: "Size", value: "Medium, 360 x 300 mm" },
      { label: "Surface", value: "Etched tempered glass" },
      { label: "Base", value: "Rubber feet" },
      { label: "Thickness", value: "5 mm" },
      { label: "Care", value: "Wipe with a dry cloth" },
      { label: "Weight", value: "540 g" },
    ],
  },
];
