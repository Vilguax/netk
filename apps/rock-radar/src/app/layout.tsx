import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppNav } from "@netk/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NETK Rock Radar - Analyseur de Belt Mining",
  description: "Analysez vos belts de mining EVE Online via Survey Scanner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--background)" }}
      >
        <Providers>
          <AppNav activeApp="rock-radar" />
          <div style={{ paddingTop: "40px" }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}
