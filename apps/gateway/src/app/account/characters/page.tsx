"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Character {
  id: string;
  characterId: string;
  characterName: string;
  corporationId: string;
  isMain: boolean;
  scopes: string[];
  missingScopes: string[];
  scopesOutdated: boolean;
  linkedAt: string;
}

export default function CharactersPage() {
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Handle URL params for success/error messages
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const name = searchParams.get("name");

    if (success === "character_linked") {
      setMessage({ type: "success", text: `${name || "Personnage"} lié avec succès !` });
    } else if (success === "character_updated") {
      setMessage({ type: "success", text: `Autorisations de ${name || "personnage"} mises à jour !` });
    } else if (error === "eve_denied") {
      setMessage({ type: "error", text: "Autorisation EVE refusée." });
    } else if (error === "already_linked") {
      setMessage({ type: "error", text: "Ce personnage est déjà lié à un autre compte." });
    } else if (error === "link_failed") {
      setMessage({ type: "error", text: "Échec de la liaison du personnage." });
    }

    fetchCharacters();
  }, [searchParams]);

  const fetchCharacters = async () => {
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

  const handleSetMain = async (characterId: string) => {
    setActionLoading(characterId);
    try {
      const response = await fetch("/api/auth/eve/set-main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Personnage principal mis à jour." });
        fetchCharacters();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Erreur lors de la mise à jour." });
      }
    } catch {
      setMessage({ type: "error", text: "Une erreur est survenue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlink = async (characterId: string, characterName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir dissocier ${characterName} ?`)) {
      return;
    }

    setActionLoading(characterId);
    try {
      const response = await fetch("/api/auth/eve/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: `${characterName} dissocié.` });
        fetchCharacters();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Erreur lors de la dissociation." });
      }
    } catch {
      setMessage({ type: "error", text: "Une erreur est survenue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLinkNew = () => {
    window.location.href = "/api/auth/eve/link";
  };

  const handleUpdateScopes = (characterId: string) => {
    window.location.href = `/api/auth/eve/link?update=${characterId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Personnages EVE</h2>
        <button
          onClick={handleLinkNew}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un personnage
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-current opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Characters list */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center p-12">
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
          ) : characters.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-400 mb-4">Aucun personnage lié</p>
              <button
                onClick={handleLinkNew}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
              >
                Lier votre premier personnage
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Portrait */}
                  <div className="relative">
                    <img
                      src={`https://images.evetech.net/characters/${character.characterId}/portrait?size=64`}
                      alt={character.characterName}
                      className={`w-14 h-14 rounded-lg ${
                        character.isMain ? "border-2 border-green-500" : "border border-slate-700"
                      }`}
                    />
                    {character.isMain && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{character.characterName}</span>
                      {character.isMain && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                          Principal
                        </span>
                      )}
                      {character.scopesOutdated && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Autorisations obsolètes
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      Lié le {new Date(character.linkedAt).toLocaleDateString("fr-FR")}
                    </p>
                    {character.scopesOutdated && (
                      <p className="text-xs text-amber-400/70 mt-0.5">
                        {character.missingScopes.length} autorisation{character.missingScopes.length > 1 ? "s" : ""} manquante{character.missingScopes.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {character.scopesOutdated && (
                      <button
                        onClick={() => handleUpdateScopes(character.characterId)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Mettre à jour
                      </button>
                    )}
                    {!character.isMain && (
                      <button
                        onClick={() => handleSetMain(character.characterId)}
                        disabled={actionLoading === character.characterId}
                        className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading === character.characterId ? "..." : "Définir principal"}
                      </button>
                    )}
                    <button
                      onClick={() => handleUnlink(character.characterId, character.characterName)}
                      disabled={actionLoading === character.characterId}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === character.characterId ? "..." : "Dissocier"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/30">
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          À propos des personnages liés
        </h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Vous pouvez lier autant de personnages que vous le souhaitez</li>
          <li>• Le personnage principal est utilisé par défaut dans les modules</li>
          <li>• Les tokens sont chiffrés et stockés de manière sécurisée</li>
          <li>• Dissocier un personnage révoque l&apos;accès NETK à ce personnage</li>
          <li>• Le badge &quot;Autorisations obsolètes&quot; indique qu&apos;un module requiert de nouvelles permissions</li>
        </ul>
      </div>
    </div>
  );
}
