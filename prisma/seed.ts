import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const connectionString = requireEnv("DATABASE_URL");
  const adminEmail = requireEnv("INITIAL_ADMIN_EMAIL");
  const adminPassword = requireEnv("INITIAL_ADMIN_PASSWORD");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`Super Admin already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.adminUser.create({
      data: {
        name: "North Point Super Admin",
        email: adminEmail,
        passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`Super Admin created: ${admin.email}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
