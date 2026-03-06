import { NextResponse } from "next/server";
import { auth } from "@netk/auth";
import { getCharacterAccessToken, getUserCharacters } from "@netk/auth/eve";
import { esi } from "@netk/eve-api";

// PI-relevant skill IDs (EVE Online)
// Source: EVE Fandom Wiki — https://wiki.eveuniversity.org/Planetary_Industry
const PI_SKILL_IDS: Record<number, string> = {
  2495: "Interplanetary Consolidation",
  2505: "Command Center Upgrades",
  4051: "Planetology",
  13279: "Advanced Planetology",
  4050: "Remote Sensing",
};

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
      const accessToken = await getCharacterAccessToken(character.characterId);

      if (!accessToken) {
        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          skills: null,
          status: "no_token" as const,
        };
      }

      try {
        const data = await esi.getCharacterSkills(
          Number(character.characterId),
          accessToken
        );

        // Extract only PI-relevant skills
        const piSkills: Record<string, number> = {};
        for (const skill of data.skills) {
          if (PI_SKILL_IDS[skill.skill_id]) {
            piSkills[PI_SKILL_IDS[skill.skill_id]] = skill.active_skill_level;
          }
        }

        // Ensure all PI skills are present (default 0 if not trained)
        for (const name of Object.values(PI_SKILL_IDS)) {
          if (piSkills[name] === undefined) piSkills[name] = 0;
        }

        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          skills: piSkills,
          status: "ok" as const,
        };
      } catch {
        return {
          characterId: character.characterId.toString(),
          characterName: character.characterName,
          skills: null,
          status: "esi_error" as const,
        };
      }
    })
  );

  return NextResponse.json({ characters: results });
}
