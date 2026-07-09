import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id },
      include: { assignedVolunteers: true },
    });

    if (!helpRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const isAssigned = helpRequest.assignedVolunteers?.id === session.user.id;

    // Only allow requester, volunteer, or coordinators to view messages
    if (
      helpRequest.requesterId !== session.user.id && 
      !isAssigned &&
      session.user.role !== "COORDINATOR"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { requestId: id },
      include: {
        sender: {
          select: { id: true, name: true, role: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
