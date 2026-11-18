import type { Metadata, Viewport } from "next";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrupalAsia Marketing CMS",
  description: "Plan, review and publish DrupalAsia social posts",
  // Added to an iPhone Home Screen, it opens like an app (needed for notifications on iOS).
  appleWebApp: { capable: true, title: "DA Marketing", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#03163b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
