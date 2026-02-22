import type { Metadata } from "next";
import { AppNav } from "@netk/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "NETK Appraisal - EVE Online Item Valuator",
  description: "Paste items from EVE Online to get instant market valuations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AppNav activeApp="appraisal" />
        <div style={{ paddingTop: "40px" }}>{children}</div>
      </body>
    </html>
  );
}
