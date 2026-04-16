import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import type { ReactNode } from "react";

import "@workspace/ui/globals.css";
import "@workspace/panel-ui/styles.css";
import { Providers } from "@/components/providers";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const fontSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.seo-lens.dev"),
  title: "SEO Lens — SEO audit for AI coding",
  description:
    "Instant SEO audit in your browser side panel. See what crawlers see. Copy every finding straight into Claude Code, Cursor, or any AI agent.",
  openGraph: {
    title: "SEO Lens — SEO audit for AI coding",
    description:
      "Instant SEO audit in your browser side panel. Copy every finding straight into your AI agent.",
    type: "website",
    url: "https://www.seo-lens.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Lens — SEO audit for AI coding",
    description:
      "Instant SEO audit in your browser side panel. Copy every finding straight into your AI agent.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} ${fontSerif.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
