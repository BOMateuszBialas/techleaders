import { Archivo, Geist_Mono } from "next/font/google";

/**
 * The type families (design system spec A6, tokeny.md §4 and owner decision 3). Archivo is one
 * variable family with a width axis: headings use a narrower cut (`--font-heading-stretch` in
 * globals.css), body text the normal width. next/font self-hosts both files at build time, so
 * no browser request goes to a font CDN. Shared by the root layout and the Storybook preview.
 */
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

/** Geist Mono stays for SKUs and order numbers only (P13). */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

/** The class names that declare both font variables, for `<html>`. */
export const fontVariables = `${archivo.variable} ${geistMono.variable}`;
