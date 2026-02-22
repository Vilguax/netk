"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarField } from "@/components/StarField";

interface Character {
  id: string;
  characterId: string;
  characterName: string;
  isMain: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch("/api/auth/eve/characters");
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters);
        if (data.characters.length > 0) {
          setStep(2);
        }
      }
    } catch (error) {
      console.error("Error fetching characters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCharacter = () => {
    window.location.href = "/api/auth/eve/link?setAsMain=true";
  };

  const handleComplete = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <StarField />
        <div className="relative z-10">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative flex items-center justify-center">
      {/* Animated Star Field */}
      <StarField />

      {/* Nebula gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/20 pointer-events-none" />

      {/* Scan lines effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-xl">
                N
              </div>
              <div className="absolute inset-0 rounded-lg bg-cyan-400/50 blur-md -z-10" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-wider">
                <span className="text-cyan-400">NET</span>
                <span className="text-white">K</span>
              </h1>
              <p className="text-[10px] text-cyan-500/60 tracking-[0.3em] uppercase">
                New Eden Toolkit
              </p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-cyan-400" : "bg-slate-700"}`} />
          <div className={`w-12 h-0.5 ${step >= 2 ? "bg-cyan-400" : "bg-slate-700"}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-cyan-400" : "bg-slate-700"}`} />
        </div>

        {/* Card */}
        <div className="relative rounded-2xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />

          <div className="relative p-8">
            {/* Step 1: Link EVE character */}
            {step === 1 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Bienvenue, Pilote !
                </h2>

                <p className="text-slate-400 mb-6">
                  Pour utiliser les outils NETK, vous devez lier au moins un personnage EVE Online.
                  Ce personnage sera défini comme votre personnage principal.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={handleLinkCharacter}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                    Connecter avec EVE Online
                  </button>

                  <p className="text-xs text-slate-500">
                    Vous serez redirigé vers EVE Online pour autoriser l&apos;accès à votre personnage.
                  </p>
                </div>

                {/* Skip link */}
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <Link
                    href="/"
                    className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    Passer cette étape (accès limité)
                  </Link>
                </div>
              </div>
            )}

            {/* Step 2: Character linked */}
            {step === 2 && characters.length > 0 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Personnage lié !
                </h2>

                <p className="text-slate-400 mb-6">
                  Votre personnage a été lié avec succès à votre compte NETK.
                </p>

                {/* Character card */}
                <div className="bg-slate-800/50 rounded-lg p-4 mb-6 flex items-center gap-4">
                  <img
                    src={`https://images.evetech.net/characters/${characters[0].characterId}/portrait?size=64`}
                    alt={characters[0].characterName}
                    className="w-16 h-16 rounded-lg border-2 border-green-500/50"
                  />
                  <div className="text-left">
                    <p className="font-bold text-white">{characters[0].characterName}</p>
                    <p className="text-sm text-green-400">Personnage principal</p>
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all duration-300"
                >
                  Accéder au dashboard
                </button>

                <div className="mt-4">
                  <button
                    onClick={handleLinkCharacter}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    + Ajouter un autre personnage
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info about scopes */}
        {step === 1 && (
          <div className="mt-6 p-4 rounded-lg bg-slate-900/30 border border-slate-700/30">
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              Permissions demandées :
            </h3>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Lecture des contrats</li>
              <li>• Lecture des ordres de marché</li>
              <li>• Définir une destination</li>
              <li>• Lecture du portefeuille</li>
              <li>• Lecture de la localisation</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
