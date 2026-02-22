import { NextResponse, NextRequest } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";

interface CharacterLocation {
  solar_system_id: number;
  station_id?: number;
  structure_id?: number;
}

interface CharacterShip {
  ship_item_id: number;
  ship_name: string;
  ship_type_id: number;
}

interface SystemInfo {
  system_id: number;
  name: string;
  security_status: number;
  constellation_id: number;
}

interface CharacterData {
  characterId: string;
  characterName: string;
  location: {
    systemId: number;
    systemName: string;
    securityStatus: number;
    stationId?: number;
    structureId?: number;
  } | null;
  ship: {
    typeId: number;
    typeName: string;
    name: string;
  } | null;
  balance: number;
}

async function fetchCharacterData(
  characterId: string,
  characterName: string
): Promise<CharacterData | null> {
  const accessToken = await getCharacterAccessToken(BigInt(characterId));
  if (!accessToken) return null;

  try {
    // Fetch location, ship, and wallet in parallel
    const [locationRes, shipRes, balanceRes] = await Promise.all([
      fetch(
        `https://esi.evetech.net/latest/characters/${characterId}/location/?datasource=tranquility`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://esi.evetech.net/latest/characters/${characterId}/ship/?datasource=tranquility`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://esi.evetech.net/latest/characters/${characterId}/wallet/?datasource=tranquility`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
    ]);

    let location: CharacterLocation | null = null;
    let ship: CharacterShip | null = null;
    let system: SystemInfo | null = null;
    let balance = 0;

    if (locationRes.ok) {
      location = await locationRes.json();

      // Get system info
      if (location?.solar_system_id) {
        const systemRes = await fetch(
          `https://esi.evetech.net/latest/universe/systems/${location.solar_system_id}/?datasource=tranquility`
        );
        if (systemRes.ok) {
          system = await systemRes.json();
        }
      }
    }

    if (shipRes.ok) {
      ship = await shipRes.json();

      // Get ship type name
      if (ship?.ship_type_id) {
        const typeRes = await fetch(
          `https://esi.evetech.net/latest/universe/types/${ship.ship_type_id}/?datasource=tranquility`
        );
        if (typeRes.ok) {
          const typeInfo = await typeRes.json();
          ship = { ...ship, ship_name: typeInfo.name };
        }
      }
    }

    if (balanceRes.ok) {
      balance = await balanceRes.json();
    }

    return {
      characterId,
      characterName,
      location: location
        ? {
            systemId: location.solar_system_id,
            systemName: system?.name || "Unknown",
            securityStatus: system?.security_status || 0,
            stationId: location.station_id,
            structureId: location.structure_id,
          }
        : null,
      ship: ship
        ? {
            typeId: ship.ship_type_id,
            typeName: ship.ship_name || "Unknown",
            name: ship.ship_name,
          }
        : null,
      balance,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterIdsParam = searchParams.get("characterIds");
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Get user's characters
    const userCharacters = await getUserCharacters(session.user.id);

    // Determine which characters to fetch
    let targetCharacterIds: string[];
    if (characterIdsParam) {
      const requestedIds = characterIdsParam.split(",");
      const userCharacterIds = userCharacters.map((c) => c.characterId.toString());
      targetCharacterIds = requestedIds.filter((id) => userCharacterIds.includes(id));
    } else {
      targetCharacterIds = userCharacters.map((c) => c.characterId.toString());
    }

    if (targetCharacterIds.length === 0) {
      return NextResponse.json({ error: "Aucun personnage valide" }, { status: 400 });
    }

    // Create character name map
    const characterMap = new Map(
      userCharacters.map((c) => [c.characterId.toString(), c.characterName])
    );

    // Fetch data for all selected characters in parallel
    const dataPromises = targetCharacterIds.map((id) =>
      fetchCharacterData(id, characterMap.get(id) || "Unknown")
    );

    const results = await Promise.all(dataPromises);
    const characters = results.filter((c): c is CharacterData => c !== null);

    // Calculate totals
    const totalBalance = characters.reduce((sum, c) => sum + c.balance, 0);

    return NextResponse.json({
      characters,
      totalBalance,
    });
  } catch (error) {
    console.error("Character API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

