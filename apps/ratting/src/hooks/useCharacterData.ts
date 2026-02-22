"use client";

import { useState, useEffect, useCallback } from "react";
import { useCharacterSelection } from "@/contexts/CharacterContext";

interface CharacterLocation {
  systemId: number;
  systemName: string;
  securityStatus: number;
  stationId?: number;
  structureId?: number;
}

interface CharacterShip {
  typeId: number;
  typeName: string;
  name?: string;
}

interface SingleCharacterData {
  characterId: string;
  characterName: string;
  location: CharacterLocation | null;
  ship: CharacterShip | null;
  balance: number;
}

interface CharactersData {
  characters: SingleCharacterData[];
  totalBalance: number;
}

export function useCharacterData() {
  const { selectedCharacterIds } = useCharacterSelection();
  const [data, setData] = useState<CharactersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (selectedCharacterIds.length === 0) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const characterIdsParam = selectedCharacterIds.join(",");
      const response = await fetch(
        `/api/character?characterIds=${characterIdsParam}`
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des personnages");
      }

      const characterData = await response.json();
      setData(characterData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacterIds]);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
