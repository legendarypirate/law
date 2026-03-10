import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: "Admin", description: "Full access" },
    { name: "Attorney", description: "Case and client management" },
    { name: "Paralegal", description: "Case support" },
    { name: "Staff", description: "Limited access" },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      create: r,
      update: { description: r.description },
    });
  }
  console.log("Seeded roles:", roles.map((r) => r.name).join(", "));

  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  if (adminRole) {
    const hash = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
      where: { email: "admin@law.local" },
      create: {
        email: "admin@law.local",
        passwordHash: hash,
        name: "Admin User",
        roleId: adminRole.id,
      },
      update: {},
    });
    console.log("Seeded admin user: admin@law.local / admin123");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
