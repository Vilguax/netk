import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { esi } from "@netk/eve-api";

const REQUIRED_SCOPE = "esi-planets.manage_planets.v1";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const characters = await getUserCharacters(session.user.id);

  if (characters.length === 0) {
    return NextResponse.json({ error: "Aucun personnage lié" }, { status: 404 });
  }

  const results = await Promise.all(
    characters.map(async (character) => {
      // Check scope before fetching token
      if (!character.scopes.includes(REQUIRED_SCOPE)) {
        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          status: "no_scope" as const,
          planets: [],
        };
      }

      const accessToken = await getCharacterAccessToken(character.characterId);

      if (!accessToken) {
        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          status: "no_token" as const,
          planets: [],
        };
      }

      try {
        const characterId = Number(character.characterId);
        const planetList = await esi.getCharacterPlanets(characterId, accessToken);

        const planets = await Promise.all(
          planetList.map(async (planet) => {
            try {
              const layout = await esi.getColonyLayout(characterId, planet.planet_id, accessToken);

              // Extract only pins that have expiry_time (= extractors)
              const extractors = layout.pins
                .filter((pin) => pin.expiry_time)
                .map((pin) => ({
                  pinId: pin.pin_id,
                  typeId: pin.type_id,
                  expiryTime: pin.expiry_time ?? null,
                  installTime: pin.install_time ?? null,
                  lastCycleStart: pin.last_cycle_start ?? null,
                }));

              return {
                planetId: planet.planet_id,
                planetType: planet.planet_type,
                upgradeLevel: planet.upgrade_level,
                solarSystemId: planet.solar_system_id,
                numPins: planet.num_pins,
                lastUpdate: planet.last_update,
                extractors,
              };
            } catch {
              return {
                planetId: planet.planet_id,
                planetType: planet.planet_type,
                upgradeLevel: planet.upgrade_level,
                solarSystemId: planet.solar_system_id,
                numPins: planet.num_pins,
                lastUpdate: planet.last_update,
                extractors: [],
              };
            }
          })
        );

        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          status: "ok" as const,
          planets,
        };
      } catch {
        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          status: "esi_error" as const,
          planets: [],
        };
      }
    })
  );

  return NextResponse.json({ characters: results });
}
