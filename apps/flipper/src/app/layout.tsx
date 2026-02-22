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
  title: "NETK Flipper - Scanner de Contrats",
  description: "Trouvez les meilleures opportunités de flip dans EVE Online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <Providers>
          <AppNav activeApp="flipper" />
          <div style={{ paddingTop: "40px" }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}

