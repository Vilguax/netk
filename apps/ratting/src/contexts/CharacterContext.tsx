"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface EveCharacter {
  id: string;
  characterId: string;
  characterName: string;
  corporationId: string;
  isMain: boolean;
  scopes: string[];
}

interface CharacterContextType {
  characters: EveCharacter[];
  selectedCharacterIds: string[];
  isLoading: boolean;
  error: string | null;
  toggleCharacter: (characterId: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  isSelected: (characterId: string) => boolean;
}

const CharacterContext = createContext<CharacterContextType | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<EveCharacter[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available characters on mount
  useEffect(() => {
    async function fetchCharacters() {
      try {
        setIsLoading(true);
        // Use local API to get user's EVE characters (avoids CORS issues)
        const response = await fetch("/api/characters");

        if (!response.ok) {
          throw new Error("Impossible de charger les personnages");
        }

        const data = await response.json();
        const chars = data.characters || [];
        setCharacters(chars);

        // By default, select all characters
        setSelectedCharacterIds(chars.map((c: EveCharacter) => c.characterId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setCharacters([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCharacters();
  }, []);

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((prev) => {
      if (prev.includes(characterId)) {
        // Don't allow deselecting the last character
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== characterId);
      }
      return [...prev, characterId];
    });
  };

  const selectAll = () => {
    setSelectedCharacterIds(characters.map((c) => c.characterId));
  };

  const selectNone = () => {
    // Keep at least the main character selected
    const mainChar = characters.find((c) => c.isMain);
    if (mainChar) {
      setSelectedCharacterIds([mainChar.characterId]);
    } else if (characters.length > 0) {
      setSelectedCharacterIds([characters[0].characterId]);
    }
  };

  const isSelected = (characterId: string) => {
    return selectedCharacterIds.includes(characterId);
  };

  return (
    <CharacterContext.Provider
      value={{
        characters,
        selectedCharacterIds,
        isLoading,
        error,
        toggleCharacter,
        selectAll,
        selectNone,
        isSelected,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacterSelection() {
  const context = useContext(CharacterContext);
  if (!context) {
    throw new Error("useCharacterSelection must be used within CharacterProvider");
  }
  return context;
}
