"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { SurveyScannerProvider } from "@/contexts/SurveyScannerContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SurveyScannerProvider>{children}</SurveyScannerProvider>
    </SessionProvider>
  );
}
