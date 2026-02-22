import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppNav } from "@netk/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "NETK Market - EVE Online Market Browser",
  description: "Explorez les prix du marché EVE Online en temps réel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <AppNav activeApp="market" />
          <div style={{ paddingTop: "40px" }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}

