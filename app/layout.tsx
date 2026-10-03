import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kyle · Product",
  description: "Ask my portfolio anything. An agent-led portfolio tailored to each role.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Press+Start+2P&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
