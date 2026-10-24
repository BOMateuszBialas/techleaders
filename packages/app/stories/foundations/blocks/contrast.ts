/**
 * Measures a CSS color in the browser: the canvas converts any syntax the browser understands
 * (here the oklch tokens) to sRGB, exactly as it paints it. WCAG 2.x relative luminance and
 * contrast; the ratio is truncated to two decimals, like .ai/design/kontrast/run.mjs.
 */
export type Rgb = readonly [number, number, number];

let context: CanvasRenderingContext2D | null = null;

export function measureColor(color: string): Rgb {
  context ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is not available");
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function luminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return Math.floor(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
