"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { CharacterProvider } from "@/contexts/CharacterContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CharacterProvider>{children}</CharacterProvider>
    </SessionProvider>
  );
}
