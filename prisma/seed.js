"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("../src/generated/prisma/client");
const enums_1 = require("../src/generated/prisma/enums");
function requireEnv(name) {
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
    const adapter = new adapter_pg_1.PrismaPg({ connectionString });
    const prisma = new client_1.PrismaClient({ adapter });
    const existing = await prisma.adminUser.findUnique({
        where: { email: adminEmail },
    });
    if (existing) {
        console.log(`Super Admin already exists: ${adminEmail}`);
    }
    else {
        const passwordHash = await bcrypt_1.default.hash(adminPassword, 10);
        const admin = await prisma.adminUser.create({
            data: {
                name: "North Point Super Admin",
                email: adminEmail,
                passwordHash,
                role: enums_1.Role.SUPER_ADMIN,
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
//# sourceMappingURL=seed.js.map