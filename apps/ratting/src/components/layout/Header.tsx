"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Users } from "lucide-react";
import { useCharacterSelection } from "@/contexts/CharacterContext";

export function Header() {
  const { data: session } = useSession();
  const { selectedCharacterIds, characters } = useCharacterSelection();

  const selectedCount = selectedCharacterIds.length;
  const isMulti = selectedCount > 1;

  // Get the first selected character for single view
  const firstSelectedChar = characters.find(
    (c) => c.characterId === selectedCharacterIds[0]
  );

  return (
    <header
      className="h-16 border-b flex items-center justify-between px-6"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Tracker de Bounties</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {isMulti
            ? `${selectedCount} personnages selectionnes`
            : "Suivez vos gains de ratting en temps réel"}
        </p>
      </div>

      {session?.user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {isMulti ? (
              <>
                {/* Stacked portraits for multi-character */}
                <div className="flex -space-x-2">
                  {selectedCharacterIds.slice(0, 3).map((id) => (
                    <img
                      key={id}
                      src={`https://images.evetech.net/characters/${id}/portrait?size=32`}
                      alt=""
                      className="w-8 h-8 rounded-full border-2"
                      style={{ borderColor: "var(--card-bg)" }}
                    />
                  ))}
                  {selectedCount > 3 && (
                    <div
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium"
                      style={{
                        borderColor: "var(--card-bg)",
                        background: "var(--accent-green)",
                        color: "black",
                      }}
                    >
                      +{selectedCount - 3}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">
                    <Users size={14} />
                    Multi-personnage
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {selectedCount} actifs
                  </p>
                </div>
              </>
            ) : (
              <>
                <img
                  src={`https://images.evetech.net/characters/${selectedCharacterIds[0] || session.characterId}/portrait?size=64`}
                  alt={firstSelectedChar?.characterName || session.user.name || "Avatar"}
                  className="w-10 h-10 rounded-full border-2"
                  style={{ borderColor: "var(--accent-green)" }}
                />
                <div>
                  <p className="font-medium text-sm">
                    {firstSelectedChar?.characterName || session.user.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    En ligne
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
            style={{ color: "var(--text-secondary)" }}
            title="Deconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      )}
    </header>
  );
}

