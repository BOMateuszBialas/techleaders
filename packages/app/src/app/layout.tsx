import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CommerceOS", template: "%s · CommerceOS" },
  description: "Lightweight e-commerce platform with Commerce Copilot, an AI merchant advisor.",
};

/**
 * The root layout. The inline script sets the theme class on `<html>` before the first paint
 * (design system spec A4); `suppressHydrationWarning` lets React accept that class, which the
 * server cannot know. The layout stays static, so prerendering is unaffected.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
