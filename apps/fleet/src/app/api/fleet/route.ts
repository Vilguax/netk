import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { prisma } from "@netk/database";
import { esi } from "@netk/eve-api";

// Jump-capable ship group IDs
const JUMP_CAPABLE_GROUPS = new Set([30, 485, 547, 659, 898, 902, 1538]);

// Base jump range in LY per ship group
const BASE_JUMP_RANGE: Record<number, number> = {
  485: 7.0,   // Dreadnought
  547: 6.5,   // Carrier
  659: 6.0,   // Supercarrier
  30:  6.0,   // Titan
  898: 4.0,   // Black Ops
  902: 10.0,  // Jump Freighter
  1538: 6.5,  // Force Auxiliary
};

const JDC_SKILL_ID = 3456; // Jump Drive Calibration
const LY_IN_METERS = 9.4607304725808e15;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Step 1: Check if the current user has any character in a fleet
    const userCharacters = await getUserCharacters(session.user.id);

    if (userCharacters.length === 0) {
      return NextResponse.json(
        { error: "Aucun personnage lie" },
        { status: 400 }
      );
    }

    let fleetId: number | null = null;
    let myRole: string | null = null;

    for (const char of userCharacters) {
      const token = await getCharacterAccessToken(char.characterId);
      if (!token) continue;

      const fleetInfo = await esi.getCharacterFleet(
        Number(char.characterId),
        token
      );
      if (fleetInfo) {
        fleetId = fleetInfo.fleet_id;
        myRole = fleetInfo.role;
        break;
      }
    }

    if (!fleetId) {
      // Not in fleet - still return user's characters with online status
      const onlineChecks = await Promise.allSettled(
        userCharacters.map(async (char) => {
          const charId = Number(char.characterId);
          let online = false;
          try {
            const token = await getCharacterAccessToken(char.characterId);
            if (token) {
              const status = await esi.getCharacterOnline(charId, token);
              online = status.online;
            }
          } catch {
            // Can't check - treat as offline
          }
          return {
            characterId: charId,
            characterName: char.characterName,
            online,
          };
        })
      );

      const outOfFleet = onlineChecks
        .filter(
          (r): r is PromiseFulfilledResult<{ characterId: number; characterName: string; online: boolean }> =>
            r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value)
        .sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1));

      return NextResponse.json({
        inFleet: false,
        message: "Aucun personnage en fleet",
        members: [],
        wings: [],
        netkMemberCount: 0,
        outOfFleet,
      });
    }

    // Step 2: Find ALL NETK characters that are in the same fleet
    // Each character can read their own fleet info (no commander role needed)
    const allNetkCharacters = await prisma.eveCharacter.findMany({
      select: {
        characterId: true,
        characterName: true,
        userId: true,
        scopes: true,
      },
    });

    // Check each NETK character's fleet membership in parallel (batched)
    const BATCH_SIZE = 20;
    const fleetMembers: Array<{
      characterId: number;
      characterName: string;
      userId: string;
      role: string;
      wingId: number;
      squadId: number;
      token: string;
      scopes: string[];
    }> = [];

    console.log(`[Fleet] Checking ${allNetkCharacters.length} NETK characters for fleet ${fleetId}`);

    for (let i = 0; i < allNetkCharacters.length; i += BATCH_SIZE) {
      const batch = allNetkCharacters.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (char) => {
          const charName = char.characterName;
          const charId = Number(char.characterId);

          // Skip characters without fleet scope
          if (!char.scopes.includes("esi-fleets.read_fleet.v1")) {
            console.log(`[Fleet] ${charName} (${charId}): SKIP - missing esi-fleets.read_fleet.v1 scope`);
            return null;
          }

          const token = await getCharacterAccessToken(char.characterId);
          if (!token) {
            console.log(`[Fleet] ${charName} (${charId}): SKIP - token retrieval failed (refresh error?)`);
            return null;
          }

          try {
            const info = await esi.getCharacterFleet(charId, token);
            if (!info) {
              console.log(`[Fleet] ${charName} (${charId}): SKIP - getCharacterFleet returned null (not in fleet or ESI error)`);
              return null;
            }
            if (info.fleet_id !== fleetId) {
              console.log(`[Fleet] ${charName} (${charId}): SKIP - different fleet (${info.fleet_id} vs ${fleetId})`);
              return null;
            }

            console.log(`[Fleet] ${charName} (${charId}): OK - role=${info.role} wing=${info.wing_id} squad=${info.squad_id}`);
            return {
              characterId: charId,
              characterName: char.characterName,
              userId: char.userId,
              role: info.role,
              wingId: info.wing_id,
              squadId: info.squad_id,
              token,
              scopes: char.scopes,
            };
          } catch (err) {
            console.error(`[Fleet] ${charName} (${charId}): ERROR in getCharacterFleet:`, err);
            return null;
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          fleetMembers.push(result.value);
        } else if (result.status === "rejected") {
          console.error(`[Fleet] Promise rejected:`, result.reason);
        }
      }
    }

    console.log(`[Fleet] Found ${fleetMembers.length} NETK members in fleet`);

    // Step 3: Get location and ship for each fleet member in parallel
    const memberDetails = await Promise.allSettled(
      fleetMembers.map(async (member) => {
        const [location, ship] = await Promise.all([
          esi
            .getCharacterLocation(member.characterId, member.token)
            .catch(() => ({ solar_system_id: 0 })),
          esi
            .getCharacterShip(member.characterId, member.token)
            .catch(() => ({ ship_type_id: 0, ship_name: "Unknown" })),
        ]);

        // Resolve ship type info (name + group_id)
        let shipTypeName = "Unknown";
        let shipGroupId = 0;
        if (ship.ship_type_id > 0) {
          try {
            const typeInfo = await esi.getTypeInfo(ship.ship_type_id);
            shipTypeName = typeInfo.name;
            shipGroupId = typeInfo.group_id;
          } catch {
            // ignore
          }
        }

        // Jump drive data
        const canJump = JUMP_CAPABLE_GROUPS.has(shipGroupId);
        const hasSkillScope = member.scopes.includes("esi-skills.read_skills.v1");
        let jdcLevel: number | undefined;
        let jumpRangeLY: number | undefined;
        let reachableSystems: number[] | undefined;

        if (canJump && hasSkillScope && location.solar_system_id > 0) {
          try {
            const skillsData = await esi.getCharacterSkills(member.characterId, member.token);
            const jdcSkill = skillsData?.skills.find((s) => s.skill_id === JDC_SKILL_ID);
            jdcLevel = jdcSkill?.trained_skill_level ?? 0;

            const baseRange = BASE_JUMP_RANGE[shipGroupId] ?? 0;
            jumpRangeLY = baseRange + 0.5 * jdcLevel;
            const rangeMeters = jumpRangeLY * LY_IN_METERS;

            // Get source system coordinates
            const sourceSystem = await prisma.solarSystem.findUnique({
              where: { systemId: location.solar_system_id },
            });

            if (sourceSystem) {
              const { x: sx, y: sy, z: sz } = sourceSystem;
              const rangeM2 = rangeMeters * rangeMeters;

              // Query systems within jump range using 3D Euclidean distance
              const nearby = await prisma.$queryRaw<Array<{ system_id: number }>>`
                SELECT system_id FROM solar_systems
                WHERE POWER(x - ${sx}, 2) + POWER(y - ${sy}, 2) + POWER(z - ${sz}, 2) <= ${rangeM2}
                AND system_id != ${location.solar_system_id}
              `;
              reachableSystems = nearby.map((r) => r.system_id);
            }
          } catch (err) {
            console.error(`[Fleet] Jump data error for ${member.characterName}:`, err);
          }
        }

        return {
          characterId: member.characterId,
          characterName: member.characterName,
          solarSystemId: location.solar_system_id,
          shipTypeId: ship.ship_type_id,
          shipTypeName,
          role: member.role,
          wingId: member.wingId,
          squadId: member.squadId,
          isNetkUser: true,
          netkUserId: member.userId,
          canJump,
          hasSkillScope,
          jdcLevel,
          jumpRangeLY,
          reachableSystems,
        };
      })
    );

    const members = memberDetails
      .filter(
        (r): r is PromiseFulfilledResult<{
          characterId: number;
          characterName: string;
          solarSystemId: number;
          shipTypeId: number;
          shipTypeName: string;
          role: string;
          wingId: number;
          squadId: number;
          isNetkUser: boolean;
          netkUserId: string;
          canJump: boolean;
          hasSkillScope: boolean;
          jdcLevel?: number;
          jumpRangeLY?: number;
          reachableSystems?: number[];
        }> => r.status === "fulfilled"
      )
      .map((r) => r.value);

    // Step 4: Try to get wing info if we have a commander
    let wings: Array<{
      id: number;
      name: string;
      squads: Array<{ id: number; name: string }>;
    }> = [];

    // Find a commander among our members to fetch wing structure
    const commander = fleetMembers.find(
      (m) =>
        m.role === "fleet_commander" ||
        m.role === "wing_commander" ||
        m.role === "squad_commander"
    );

    if (commander) {
      try {
        wings = await esi.getFleetWings(fleetId, commander.token);
      } catch {
        // Not critical - wings info is optional
      }
    }

    // Build list of current user's characters NOT in the fleet, with online status
    const fleetMemberIds = new Set(members.map((m) => m.characterId));
    const outOfFleetCandidates = userCharacters.filter(
      (c) => !fleetMemberIds.has(Number(c.characterId))
    );

    const onlineChecks = await Promise.allSettled(
      outOfFleetCandidates.map(async (char) => {
        const charId = Number(char.characterId);
        let online = false;
        try {
          const token = await getCharacterAccessToken(char.characterId);
          if (token) {
            const status = await esi.getCharacterOnline(charId, token);
            online = status.online;
          }
        } catch {
          // Can't check - treat as offline
        }
        return {
          characterId: charId,
          characterName: char.characterName,
          online,
        };
      })
    );

    const outOfFleet = onlineChecks
      .filter(
        (r): r is PromiseFulfilledResult<{ characterId: number; characterName: string; online: boolean }> =>
          r.status === "fulfilled" && r.value !== null
      )
      .map((r) => r.value)
      .sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1));

    return NextResponse.json({
      inFleet: true,
      fleetId,
      myRole,
      members,
      wings,
      netkMemberCount: members.length,
      outOfFleet,
    });
  } catch (error) {
    console.error("[Fleet] API error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

