import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Test user credentials
  const testEmail = "test@netk.app";
  const testPassword = "Test1234!";

  // Check if test user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingUser) {
    console.log(`✅ Test user already exists: ${testEmail}`);
    return;
  }

  // Hash password with Argon2id
  const passwordHash = await argon2.hash(testPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      emailVerified: true,
    },
  });

  // Create user preferences
  await prisma.userPreferences.create({
    data: { userId: user.id },
  });

  console.log("✅ Test user created:");
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
