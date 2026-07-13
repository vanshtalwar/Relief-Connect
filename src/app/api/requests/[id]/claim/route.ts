import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { claimSchema } from "@/lib/schemas";
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

    const body = await request.json();
    const parsed = claimSchema.safeParse(body);

    const userRole = session?.user?.role;
    if (userRole !== "VOLUNTEER" && userRole !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let volunteerId = session?.user?.id;
    if (userRole === "COORDINATOR" && body.volunteerId) {
      volunteerId = body.volunteerId;
    }

    if (!volunteerId) {
      return NextResponse.json({ error: "Valid volunteer ID is required" }, { status: 400 });
    }

    if (targetRequest.requesterId === volunteerId) {
      return NextResponse.json({ error: "You cannot claim your own request" }, { status: 400 });
    }

    if (targetRequest.assignedVolunteers?.id === volunteerId) {
      return NextResponse.json({ error: "You are already assigned to this request" }, { status: 400 });
    }

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await prisma.$transaction([
      prisma.helpRequest.update({
        where: { id },
        data: {
          status: "CLAIMED",
          assignedVolunteers: {
            connect: { id: volunteerId }
          },
          statusHistory: {
            create: {
              status: "CLAIMED",
              note: parsed.data.note || "Volunteer accepted the request",
            },
          },
        },
      }),
      prisma.notification.create({
        data: {
          userId: targetRequest.requesterId,
          message: `Volunteer claimed your request. Note: ${parsed.data.note || "No message left"}`,
        }
      })
    ]);

    const volunteerUser = await prisma.user.findUnique({ where: { id: volunteerId } });
    const volunteerName = volunteerUser ? volunteerUser.name : "A volunteer";

    const requesterUser = await prisma.user.findUnique({ where: { id: targetRequest.requesterId } });
    const requesterName = requesterUser ? requesterUser.name : "Community Resident";
    const requesterPhone = requesterUser?.phone ? requesterUser.phone : "N/A";

    const notificationMessage = `Volunteer "${volunteerName}" claimed request "${targetRequest.title}". Category: ${targetRequest.category}, Urgency: ${targetRequest.urgency}, Requester: ${requesterName} (${requesterPhone}). Message: ${parsed.data.note || "No message left"}`;

    // Send Web Push notification to requester if subscribed
    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetRequest.requesterId },
    });
    if (pushSubscriptions.length > 0) {
      await broadcastPushNotification(
        pushSubscriptions,
        "Request Claimed",
        `Volunteer "${volunteerName}" has claimed your request: "${targetRequest.title}".`,
        `/requests/${targetRequest.id}`
      );
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("PATCH request claim error:", error);
    return NextResponse.json({ error: "Failed to claim request" }, { status: 500 });
  }
}