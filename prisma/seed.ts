import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // Seed Victim
  await prisma.user.upsert({
    where: { email: "victim@example.com" },
    update: {},
    create: {
      name: "Sarah (Victim)",
      email: "victim@example.com",
      passwordHash,
      role: "VICTIM",
      phone: "555-0100",
      latitude: 18.963,
      longitude: 72.8258,
    },
  });

  // Seed Volunteer
  await prisma.user.upsert({
    where: { email: "volunteer@example.com" },
    update: {},
    create: {
      name: "Alex (Volunteer)",
      email: "volunteer@example.com",
      passwordHash,
      role: "VOLUNTEER",
      phone: "555-0200",
      skills: ["First Aid", "Driving"],
      isVerified: true,
      backgroundCheck: true,
    },
  });

  // Seed Coordinator
  await prisma.user.upsert({
    where: { email: "coordinator@example.com" },
    update: {},
    create: {
      name: "HQ (Coordinator)",
      email: "coordinator@example.com",
      passwordHash,
      role: "COORDINATOR",
      phone: "555-9999",
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
