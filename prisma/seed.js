const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const coordinator = await prisma.user.upsert({
    where: { email: "coordinator@reliefconnect.dev" },
    update: {},
    create: {
      name: "Duty Coordinator",
      email: "coordinator@reliefconnect.dev",
      passwordHash,
      role: "COORDINATOR",
      phone: "+91 90000 00001",
    },
  });

  const volunteer = await prisma.user.upsert({
    where: { email: "volunteer@reliefconnect.dev" },
    update: {},
    create: {
      name: "Harbor Volunteer",
      email: "volunteer@reliefconnect.dev",
      passwordHash,
      role: "VOLUNTEER",
      phone: "+91 90000 00002",
    },
  });

  const victim = await prisma.user.upsert({
    where: { email: "victim@reliefconnect.dev" },
    update: {},
    create: {
      name: "Community Resident",
      email: "victim@reliefconnect.dev",
      passwordHash,
      role: "VICTIM",
      phone: "+91 90000 00003",
    },
  });

  const requests = [
    {
      title: "Need bottled water for 18 families",
      description: "Floodwater cut access to the block. Seniors and children need water within the hour.",
      category: "WATER",
      urgency: "CRITICAL",
      status: "OPEN",
      latitude: 18.963,
      longitude: 72.8258,
      clientUuid: "seed-req-1",
      requesterId: victim.id,
    },
    {
      title: "Medical kit required near the school",
      description: "Minor injuries reported after debris cleanup. Need gauze and antiseptic.",
      category: "MEDICAL",
      urgency: "HIGH",
      status: "CLAIMED",
      latitude: 18.9721,
      longitude: 72.8142,
      clientUuid: "seed-req-2",
      requesterId: victim.id,
      volunteerId: volunteer.id,
    },
    {
      title: "Dry food packets for shelter",
      description: "Temporary shelter is short on breakfast packs for the morning round.",
      category: "FOOD",
      urgency: "MEDIUM",
      status: "IN_PROGRESS",
      latitude: 18.9429,
      longitude: 72.8033,
      clientUuid: "seed-req-3",
      requesterId: victim.id,
      volunteerId: volunteer.id,
    },
    {
      title: "Rescue help for rooftop isolation",
      description: "One elderly resident needs evacuation from a low-rise building.",
      category: "RESCUE",
      urgency: "CRITICAL",
      status: "OPEN",
      latitude: 18.995,
      longitude: 72.833,
      clientUuid: "seed-req-4",
      requesterId: victim.id,
    },
  ];

  for (const request of requests) {
    await prisma.helpRequest.upsert({
      where: { clientUuid: request.clientUuid },
      update: request,
      create: request,
    });
  }

  await prisma.notification.createMany({
    data: [
      { userId: coordinator.id, message: "Verification queue has 2 flagged requests." },
      { userId: volunteer.id, message: "You have 1 in-progress claim and 1 critical request nearby." },
      { userId: victim.id, message: "Your water request is visible to volunteers." },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });