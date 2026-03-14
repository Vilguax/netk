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

        // Resolve system names in batch
        const uniqueSystemIds = [...new Set(planetList.map((p) => p.solar_system_id))];
        const systemNameMap = new Map<number, string>();
        await Promise.all(
          uniqueSystemIds.map(async (id) => {
            try {
              const sys = await esi.getSystem(id);
              systemNameMap.set(id, sys.name);
            } catch {
              systemNameMap.set(id, `Système ${id}`);
            }
          })
        );

        const planets = await Promise.all(
          planetList.map(async (planet) => {
            const systemName = systemNameMap.get(planet.solar_system_id) ?? `Système ${planet.solar_system_id}`;
            try {
              const layout = await esi.getColonyLayout(characterId, planet.planet_id, accessToken);

              // Extractors: pins with extractor_details or expiry_time
              const extractorPinIds = new Set<number>();
              const extractorRaw = layout.pins.filter((pin) => pin.expiry_time || pin.extractor_details);
              extractorRaw.forEach((pin) => extractorPinIds.add(pin.pin_id));

              // Factories: pins with schematic_id
              const factoryPinIds = new Set<number>();
              const factoryPins = layout.pins.filter((pin) => pin.schematic_id != null);
              factoryPins.forEach((pin) => factoryPinIds.add(pin.pin_id));

              // Resolve factory outputs via routes:
              // Routes where source = factory pin → content_type_id = what it produces
              const factoryOutputTypeIds = new Map<number, number>(); // pinId → output typeId
              for (const route of layout.routes) {
                if (factoryPinIds.has(route.source_pin_id) && !factoryOutputTypeIds.has(route.source_pin_id)) {
                  factoryOutputTypeIds.set(route.source_pin_id, route.content_type_id);
                }
              }

              // Collect all type IDs to resolve in one batch (P0 extractions + factory outputs)
              const extractorProductTypeIds = extractorRaw
                .map((pin) => pin.extractor_details?.product_type_id)
                .filter((id): id is number => id != null);
              const allTypeIds = [...new Set([...extractorProductTypeIds, ...factoryOutputTypeIds.values()])];
              const typeNameMap = await esi.getTypeInfoBatch(allTypeIds);

              const extractors = extractorRaw.map((pin) => {
                const productTypeId = pin.extractor_details?.product_type_id ?? null;
                return {
                  pinId: pin.pin_id,
                  typeId: pin.type_id,
                  productTypeId,
                  productTypeName: productTypeId ? (typeNameMap.get(productTypeId)?.name ?? null) : null,
                  qtyPerCycle: pin.extractor_details?.qty_per_cycle ?? null,
                  expiryTime: pin.expiry_time ?? null,
                  installTime: pin.install_time ?? null,
                  lastCycleStart: pin.last_cycle_start ?? null,
                };
              });

              const factories = factoryPins.map((pin) => {
                const outputTypeId = factoryOutputTypeIds.get(pin.pin_id) ?? null;
                return {
                  pinId: pin.pin_id,
                  typeId: pin.type_id,
                  outputTypeId,
                  outputTypeName: outputTypeId ? (typeNameMap.get(outputTypeId)?.name ?? null) : null,
                };
              });

              const infrastructureCount = layout.pins.length - extractors.length - factories.length;

              return {
                planetId: planet.planet_id,
                planetType: planet.planet_type,
                upgradeLevel: planet.upgrade_level,
                solarSystemId: planet.solar_system_id,
                systemName,
                numPins: planet.num_pins,
                lastUpdate: planet.last_update,
                extractors,
                factories,
                infrastructureCount,
              };
            } catch {
              return {
                planetId: planet.planet_id,
                planetType: planet.planet_type,
                upgradeLevel: planet.upgrade_level,
                solarSystemId: planet.solar_system_id,
                systemName,
                numPins: planet.num_pins,
                lastUpdate: planet.last_update,
                extractors: [],
                factories: [],
                infrastructureCount: 0,
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
