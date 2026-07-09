import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastPushNotification } from "@/lib/web-push";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const targetRequest = await prisma.helpRequest.findUnique({
      where: { id },
      include: { assignedVolunteers: true },
    });

    if (!targetRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let userId = session?.user?.id;
    if (!userId) {
      // Allow fallback for demo purposes if no active session
      const volunteer = await prisma.user.findFirst({ where: { role: "VOLUNTEER" } });
      userId = volunteer?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No user found in database to resolve request" }, { status: 400 });
    }

    const isAssignedVolunteer = targetRequest.assignedVolunteers.some(v => v.id === userId);
    const isRequester = targetRequest.requesterId === userId;
    const isCoordinator = session?.user?.role === "COORDINATOR";

    if (!isAssignedVolunteer && !isRequester && !isCoordinator) {
      return NextResponse.json({ error: "You are not authorized to resolve this request" }, { status: 403 });
    }

    if (targetRequest.status === "RESOLVED") {
      return NextResponse.json({ error: "Request is already resolved" }, { status: 400 });
    }

    const updated = await prisma.helpRequest.update({
      where: { id },
      data: {
        status: "RESOLVED",
        statusHistory: {
          create: {
            status: "RESOLVED",
            note: "Request marked as resolved.",
          },
        },
      },
    });

    // Notify the requester that the request was resolved
    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetRequest.requesterId },
    });
    
    if (pushSubscriptions.length > 0) {
      await broadcastPushNotification(
        pushSubscriptions,
        "Request Resolved",
        `Your request "${targetRequest.title}" has been successfully resolved!`,
        `/requests/${targetRequest.id}`
      );
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("PATCH request resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve request" }, { status: 500 });
  }
}
