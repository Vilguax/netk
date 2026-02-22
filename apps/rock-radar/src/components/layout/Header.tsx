"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 1010 10M12 2v10l7.07 7.07" />
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-lg bg-amber-400/20 blur-lg group-hover:bg-amber-400/30 transition-all" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Rock Radar</h1>
                <p className="text-xs text-slate-500">Belt Mining Analyzer</p>
              </div>
            </Link>
          </div>

          {/* User info */}
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">
                  {session.user.email}
                </span>
                <Link
                  href={process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000"}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
                >
                  Retour
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
