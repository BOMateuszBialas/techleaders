import { describe, expect, it, vi } from "vitest";

// next/font/google is a build-time loader (SWC); here it records the options it was given.
vi.mock("next/font/google", () => ({
  Archivo: vi.fn((options: { variable: string }) => ({ variable: `class${options.variable}` })),
  Geist_Mono: vi.fn((options: { variable: string }) => ({ variable: `class${options.variable}` })),
}));

describe("fonts", () => {
  it("loads Archivo with the width axis and Geist Mono, both with Latin Extended", async () => {
    const google = await import("next/font/google");
    const { fontVariables } = await import("./fonts");

    expect(google.Archivo).toHaveBeenCalledWith({
      variable: "--font-archivo",
      subsets: ["latin", "latin-ext"],
      axes: ["wdth"],
    });
    expect(google.Geist_Mono).toHaveBeenCalledWith({
      variable: "--font-geist-mono",
      subsets: ["latin", "latin-ext"],
    });
    expect(fontVariables).toBe("class--font-archivo class--font-geist-mono");
  });
});
