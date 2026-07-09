const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const userId = "36c9cae0-f84a-43b8-9c85-7be0dcf1208d";

  console.log("Cleaning up related records for user:", userId);

  // 1. Find all help requests where this user is the requester
  const requests = await prisma.helpRequest.findMany({ where: { requesterId: userId } });
  const requestIds = requests.map(r => r.id);

  if (requestIds.length > 0) {
    // Delete related records of those requests first
    await prisma.statusEvent.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.chatMessage.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.review.deleteMany({ where: { requestId: { in: requestIds } } });
    
    // Delete the requests themselves
    await prisma.helpRequest.deleteMany({ where: { requesterId: userId } });
  }

  // 2. Clean up any other references (as sender, reviewer, etc.)
  await prisma.chatMessage.deleteMany({ where: { senderId: userId } });
  await prisma.review.deleteMany({ where: { OR: [{ reviewerId: userId }, { revieweeId: userId }] } });

  // 3. Unassign them from any requests they volunteered for
  await prisma.helpRequest.updateMany({
    where: { volunteerId: userId },
    data: { volunteerId: null }
  });

  // 4. Finally, delete the user
  await prisma.user.delete({
    where: { id: userId }
  });

  console.log("User successfully deleted!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());