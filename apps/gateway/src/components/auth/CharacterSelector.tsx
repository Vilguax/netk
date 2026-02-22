"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { CharacterAvatar } from "./CharacterAvatar";
import { type AuthProvider } from "@netk/auth/client";

interface Character {
  id: string;
  characterId: string;
  characterName: string;
  isMain: boolean;
}

export function CharacterSelector() {
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [isServiceAccountOwner, setIsServiceAccountOwner] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && characters.length === 0) {
      fetchCharacters();
      checkServiceAccountOwnership();
    }
  }, [isOpen]);

  const checkServiceAccountOwnership = async () => {
    try {
      const response = await fetch("/api/admin/service-account");
      if (response.ok) {
        const data = await response.json();
        // If configured and the API returns 200, user is the owner
        setIsServiceAccountOwner(data.configured === true);
      }
    } catch {
      setIsServiceAccountOwner(false);
    }
  };

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/eve/characters");
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters);
      }
    } catch (error) {
      console.error("Error fetching characters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCharacter = async (characterId: string) => {
    try {
      const response = await fetch("/api/auth/eve/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });

      if (response.ok) {
        // Update session with new active character
        await update();
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error setting active character:", error);
    }
  };

  if (!session) return null;

  const provider = (session.user?.provider || "credentials") as AuthProvider;
  const activeCharacterId = session.user?.activeCharacterId;
  const activeCharacterName = session.user?.activeCharacterName;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
      >
        <CharacterAvatar
          characterId={activeCharacterId}
          characterName={activeCharacterName}
          provider={provider}
          size="sm"
          fallback={session.user?.email || undefined}
        />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-white truncate max-w-[120px]">
            {activeCharacterName || session.user?.name || "Pilote"}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900/95 border border-slate-700/50 backdrop-blur-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Personnage actif</p>
          </div>

          {/* Characters list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 flex justify-center">
                <svg className="animate-spin h-5 w-5 text-cyan-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : characters.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Aucun personnage lié
              </div>
            ) : (
              characters.map((character) => {
                const isActive = character.characterId === activeCharacterId?.toString();
                return (
                  <button
                    key={character.id}
                    onClick={() => handleSelectCharacter(character.characterId)}
                    className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-800/50 transition-colors ${
                      isActive ? "bg-cyan-500/10" : ""
                    }`}
                  >
                    <img
                      src={`https://images.evetech.net/characters/${character.characterId}/portrait?size=32`}
                      alt={character.characterName}
                      className={`w-8 h-8 rounded-lg ${isActive ? "ring-2 ring-cyan-500" : ""}`}
                    />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isActive ? "text-cyan-400" : "text-white"}`}>
                        {character.characterName}
                      </p>
                      {character.isMain && (
                        <p className="text-xs text-slate-500">Principal</p>
                      )}
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-700/50 p-2">
            {/* Admin link - only for service account owner */}
            {isServiceAccountOwner && (
              <Link
                href="/admin"
                className="block px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Administration
                </span>
              </Link>
            )}
            <Link
              href="/account/characters"
              className="block px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Gérer les personnages
            </Link>
            <Link
              href="/account"
              className="block px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Paramètres du compte
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
