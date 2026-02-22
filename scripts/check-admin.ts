import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "axel.pelassa@gmail.com" },
    select: { id: true, email: true, isAdmin: true }
  });
  console.log("User:", JSON.stringify(user, null, 2));

  const character = await prisma.eveCharacter.findFirst({
    where: { characterId: BigInt("2120955440") },
    select: { characterName: true, isServiceAccount: true, userId: true }
  });
  console.log("Character:", JSON.stringify(character, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
