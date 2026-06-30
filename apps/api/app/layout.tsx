import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://hypedca-api.vercel.app"),
  title: {
    default: "HypeDCA",
    template: "%s | HypeDCA",
  },
  description: "Independent recurring trade automation for Hyperliquid.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
