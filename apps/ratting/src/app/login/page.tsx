"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="p-8 rounded-xl border max-w-md w-full text-center"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">NETK Ratting</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Tracker de bounties EVE Online
          </p>
        </div>

        <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
          <p className="text-sm" style={{ color: "var(--accent-green)" }}>
            Suivez vos gains en temps réel, analysez vos performances et optimisez votre ratting.
          </p>
        </div>

        <button
          onClick={() => signIn("eveonline", { callbackUrl: "/" })}
          className="w-full py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, var(--accent-green), #059669)",
            color: "white",
          }}
        >
          Connexion avec EVE Online
        </button>

        <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          Necessite les permissions: Wallet, Fittings, Location, Skills
        </p>
      </div>
    </div>
  );
}

