import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the user who owns character 2120955440
  const character = await prisma.eveCharacter.findFirst({
    where: { characterId: BigInt("2120955440") },
    include: { user: true },
  });

  if (!character) {
    console.log("Character not found");
    return;
  }

  console.log(`Found user: ${character.user.email} (${character.userId})`);

  // Set isAdmin to true
  await prisma.user.update({
    where: { id: character.userId },
    data: { isAdmin: true },
  });

  console.log("User is now admin!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
