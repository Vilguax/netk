"use client";

import { useSession } from "next-auth/react";
import { PROVIDER_COLORS, type AuthProvider } from "@netk/auth/client";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <svg
          className="animate-spin h-8 w-8 text-cyan-400"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden p-8 text-center">
        <p className="text-slate-400">Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  const provider = (session.user?.provider || "credentials") as AuthProvider;
  const providerColor = PROVIDER_COLORS[provider];
  const providerName = {
    credentials: "NETK",
    google: "Google",
    discord: "Discord",
  }[provider];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Mon profil</h2>

      {/* Profile card */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <div className="flex items-center gap-6">
            {/* Avatar with provider indicator */}
            <div className="relative">
              {session.user?.activeCharacterId ? (
                <img
                  src={`https://images.evetech.net/characters/${session.user.activeCharacterId}/portrait?size=128`}
                  alt={session.user?.activeCharacterName || "Avatar"}
                  className="w-24 h-24 rounded-xl"
                  style={{ boxShadow: `0 0 20px ${providerColor}40` }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-600"
                  style={{ boxShadow: `0 0 20px ${providerColor}40` }}
                >
                  {session.user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              {/* Provider indicator ring */}
              <div
                className="absolute -inset-1 rounded-xl border-2 pointer-events-none"
                style={{ borderColor: providerColor }}
              />
              {/* Provider badge */}
              <div
                className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: providerColor }}
              >
                {providerName}
              </div>
            </div>

            {/* User info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                {session.user?.activeCharacterName || session.user?.name || "Pilote"}
              </h3>
              <p className="text-slate-400 mb-3">{session.user?.email}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">
                  Connecté via{" "}
                  <span style={{ color: providerColor }}>{providerName}</span>
                </span>
                {session.user?.isAdmin && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <h3 className="text-lg font-medium text-white mb-4">Informations du compte</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{session.user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <span className="text-slate-400">Méthode de connexion</span>
              <span className="text-white flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: providerColor }}
                />
                {providerName}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-400">ID du compte</span>
              <span className="text-slate-500 font-mono text-sm">
                {session.user?.id?.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/account/characters"
          className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden p-6 hover:border-cyan-500/30 transition-colors group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <svg className="w-8 h-8 text-cyan-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h4 className="font-medium text-white">Personnages EVE</h4>
            <p className="text-sm text-slate-500 mt-1">Gérer vos personnages liés</p>
          </div>
        </a>

        <a
          href="/account/security"
          className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden p-6 hover:border-cyan-500/30 transition-colors group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <svg className="w-8 h-8 text-cyan-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h4 className="font-medium text-white">Sécurité</h4>
            <p className="text-sm text-slate-500 mt-1">Mot de passe et authentification</p>
          </div>
        </a>
      </div>
    </div>
  );
}
