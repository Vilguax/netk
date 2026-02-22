import { NextResponse } from "next/server";
import { auth } from "@netk/auth";

interface FittingItem {
  type_id: number;
  flag: string;
  quantity: number;
}

interface Fitting {
  fitting_id: number;
  name: string;
  description: string;
  ship_type_id: number;
  items: FittingItem[];
}

interface TypeInfo {
  type_id: number;
  name: string;
  description: string;
  group_id: number;
}

interface DogmaAttribute {
  attribute_id: number;
  value: number;
}

interface TypeDogma {
  dogma_attributes: DogmaAttribute[];
}

// Important attribute IDs for EVE modules
const IMPORTANT_ATTRIBUTES: Record<number, string> = {
  84: "shieldBonus", // Shield boost amount
  68: "armorDamageAmount", // Armor repair amount
  73: "capacitorNeed", // Capacitor usage
  30: "power", // Power grid usage
  50: "cpu", // CPU usage
  64: "damageMultiplier", // Damage modifier
  114: "emDamage", // EM damage
  116: "explosiveDamage", // Explosive damage
  117: "kineticDamage", // Kinetic damage
  118: "thermalDamage", // Thermal damage
  20: "speedBonus", // Speed bonus
  54: "duration", // Cycle time
  6: "capacitorCapacity", // Cap amount
};

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken || !session?.characterId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fittingId = searchParams.get("fitting_id");

  try {
    // Fetch all saved fittings
    const fittingsRes = await fetch(
      `https://esi.evetech.net/latest/characters/${session.characterId}/fittings/?datasource=tranquility`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!fittingsRes.ok) {
      const error = await fittingsRes.text();
      console.error("ESI fittings error:", error);
      return NextResponse.json(
        { error: "Erreur ESI fittings" },
        { status: fittingsRes.status }
      );
    }

    const fittings: Fitting[] = await fittingsRes.json();

    // If specific fitting requested, get detailed info with module stats
    if (fittingId) {
      const fitting = fittings.find((f) => f.fitting_id === parseInt(fittingId));
      if (!fitting) {
        return NextResponse.json({ error: "Fitting non trouve" }, { status: 404 });
      }

      // Get type info for all items
      const typeIds = [...new Set(fitting.items.map((i) => i.type_id))];
      typeIds.push(fitting.ship_type_id);

      const typeInfos = await Promise.all(
        typeIds.map(async (typeId) => {
          const [typeRes, dogmaRes] = await Promise.all([
            fetch(
              `https://esi.evetech.net/latest/universe/types/${typeId}/?datasource=tranquility`
            ),
            fetch(
              `https://esi.evetech.net/latest/dogma/types/${typeId}/?datasource=tranquility`
            ),
          ]);

          const typeInfo: TypeInfo = typeRes.ok ? await typeRes.json() : null;
          const dogma: TypeDogma = dogmaRes.ok ? await dogmaRes.json() : null;

          // Extract important attributes
          const importantStats: Record<string, number> = {};
          if (dogma?.dogma_attributes) {
            dogma.dogma_attributes.forEach((attr) => {
              const attrName = IMPORTANT_ATTRIBUTES[attr.attribute_id];
              if (attrName) {
                importantStats[attrName] = attr.value;
              }
            });
          }

          return {
            typeId,
            name: typeInfo?.name || "Unknown",
            description: typeInfo?.description || "",
            groupId: typeInfo?.group_id,
            stats: importantStats,
          };
        })
      );

      const typeInfoMap = new Map(typeInfos.map((t) => [t.typeId, t]));

      // Organize items by slot
      const slots = {
        high: [] as Array<{ typeId: number; name: string; stats: Record<string, number> }>,
        med: [] as Array<{ typeId: number; name: string; stats: Record<string, number> }>,
        low: [] as Array<{ typeId: number; name: string; stats: Record<string, number> }>,
        rig: [] as Array<{ typeId: number; name: string; stats: Record<string, number> }>,
        subsystem: [] as Array<{ typeId: number; name: string; stats: Record<string, number> }>,
        drone: [] as Array<{ typeId: number; name: string; quantity: number; stats: Record<string, number> }>,
      };

      fitting.items.forEach((item) => {
        const info = typeInfoMap.get(item.type_id);
        const moduleInfo = {
          typeId: item.type_id,
          name: info?.name || "Unknown",
          stats: info?.stats || {},
        };

        // Determine slot type based on flag
        if (item.flag.startsWith("HiSlot")) {
          slots.high.push(moduleInfo);
        } else if (item.flag.startsWith("MedSlot")) {
          slots.med.push(moduleInfo);
        } else if (item.flag.startsWith("LoSlot")) {
          slots.low.push(moduleInfo);
        } else if (item.flag.startsWith("RigSlot")) {
          slots.rig.push(moduleInfo);
        } else if (item.flag.startsWith("SubSystem")) {
          slots.subsystem.push(moduleInfo);
        } else if (item.flag === "DroneBay" || item.flag === "FighterBay") {
          slots.drone.push({ ...moduleInfo, quantity: item.quantity });
        }
      });

      const shipInfo = typeInfoMap.get(fitting.ship_type_id);

      return NextResponse.json({
        fitting: {
          id: fitting.fitting_id,
          name: fitting.name,
          description: fitting.description,
          shipTypeId: fitting.ship_type_id,
          shipName: shipInfo?.name || "Unknown",
          slots,
        },
      });
    }

    // Return list of all fittings with basic info
    const fittingsList = await Promise.all(
      fittings.map(async (f) => {
        const typeRes = await fetch(
          `https://esi.evetech.net/latest/universe/types/${f.ship_type_id}/?datasource=tranquility`
        );
        const typeInfo: TypeInfo | null = typeRes.ok ? await typeRes.json() : null;

        return {
          id: f.fitting_id,
          name: f.name,
          shipTypeId: f.ship_type_id,
          shipName: typeInfo?.name || "Unknown",
          itemCount: f.items.length,
        };
      })
    );

    return NextResponse.json({ fittings: fittingsList });
  } catch (error) {
    console.error("Fittings API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

