"use client";

import Link from "next/link";
import { CharacterSelector } from "@/components/auth";

export function Header() {
  return (
    <header className="relative z-50 border-b border-cyan-500/20 backdrop-blur-xl bg-black/40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-lg">
              N
            </div>
            <div className="absolute inset-0 rounded-lg bg-cyan-400/50 blur-md -z-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider">
              <span className="text-cyan-400">NET</span>
              <span className="text-white">K</span>
            </h1>
            <p className="text-[10px] text-cyan-500/60 tracking-[0.3em] uppercase">
              New Eden Toolkit
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <CharacterSelector />
        </div>
      </div>
    </header>
  );
}
