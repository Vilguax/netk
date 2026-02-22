import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Set character as service account
  await prisma.eveCharacter.update({
    where: { characterId: BigInt("2120955440") },
    data: { isServiceAccount: true },
  });

  console.log("Character 2120955440 is now the service account!");

  // Verify
  const character = await prisma.eveCharacter.findFirst({
    where: { characterId: BigInt("2120955440") },
    select: { characterName: true, isServiceAccount: true }
  });
  console.log("Verified:", JSON.stringify(character, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
