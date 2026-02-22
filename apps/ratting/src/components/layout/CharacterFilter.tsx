"use client";

import { useCharacterSelection } from "@/contexts/CharacterContext";
import { Users, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function CharacterFilter() {
  const {
    characters,
    selectedCharacterIds,
    isLoading,
    toggleCharacter,
    selectAll,
    selectNone,
    isSelected,
  } = useCharacterSelection();
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <Users size={16} />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return null;
  }

  const selectedCount = selectedCharacterIds.length;
  const totalCount = characters.length;

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: "var(--accent-green)" }} />
          <span>Personnages</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              color: "var(--accent-green)",
            }}
          >
            {selectedCount}/{totalCount}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <>
          {/* Quick actions */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={selectAll}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-secondary)",
              }}
            >
              Tous
            </button>
            <button
              onClick={selectNone}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-secondary)",
              }}
            >
              Principal
            </button>
          </div>

          {/* Character list */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {characters.map((char) => {
              const selected = isSelected(char.characterId);
              return (
                <button
                  key={char.characterId}
                  onClick={() => toggleCharacter(char.characterId)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg transition-all text-left"
                  style={{
                    background: selected ? "rgba(16, 185, 129, 0.1)" : "transparent",
                    borderLeft: selected ? "2px solid var(--accent-green)" : "2px solid transparent",
                  }}
                >
                  {/* Portrait */}
                  <img
                    src={`https://images.evetech.net/characters/${char.characterId}/portrait?size=32`}
                    alt={char.characterName}
                    className="w-6 h-6 rounded-full"
                    style={{
                      opacity: selected ? 1 : 0.5,
                    }}
                  />

                  {/* Name */}
                  <span
                    className="flex-1 text-sm truncate"
                    style={{
                      color: selected ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {char.characterName}
                    {char.isMain && (
                      <span
                        className="ml-1 text-xs"
                        style={{ color: "var(--accent-gold)" }}
                      >
                        ★
                      </span>
                    )}
                  </span>

                  {/* Check indicator */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{
                      background: selected ? "var(--accent-green)" : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {selected && <Check size={12} color="black" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
