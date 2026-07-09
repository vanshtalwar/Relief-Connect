import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch requests where the user is either the requester or an assigned volunteer
    const activeChats = await prisma.helpRequest.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { volunteerId: userId }
        ]
      },
      include: {
        requester: {
          select: { id: true, name: true, image: true, role: true }
        },
        assignedVolunteers: {
          select: { id: true, name: true, image: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get the latest message for preview
        }
      },
      orderBy: {
        updatedAt: "desc", // Sort by newest activity
      }
    });

    return NextResponse.json(activeChats);
  } catch (error) {
    console.error("Fetch inbox error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
