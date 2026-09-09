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
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const userRole = session?.user?.role;
    if (userRole !== "VOLUNTEER" && userRole !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine target volunteer IDs
    let targetVolunteerIds: string[] = [];
    if (userRole === "COORDINATOR") {
      if (Array.isArray(body.volunteerIds) && body.volunteerIds.length > 0) {
        targetVolunteerIds = body.volunteerIds.filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()));
      } else if (body.volunteerId && typeof body.volunteerId === "string") {
        targetVolunteerIds = [body.volunteerId.trim()];
      } else if (session?.user?.id) {
        targetVolunteerIds = [session.user.id];
      }
    } else if (session?.user?.id) {
      targetVolunteerIds = [session.user.id];
    }

    if (targetVolunteerIds.length === 0) {
      return NextResponse.json({ error: "Valid volunteer ID is required" }, { status: 400 });
    }

    // Cannot claim own request
    if (targetVolunteerIds.includes(targetRequest.requesterId)) {
      if (targetVolunteerIds.length === 1) {
        return NextResponse.json({ error: "You cannot claim your own request" }, { status: 400 });
      }
      // Filter out requester if in multi-selection
      targetVolunteerIds = targetVolunteerIds.filter((vId) => vId !== targetRequest.requesterId);
    }

    // Check existing claims
    const existingClaims = await prisma.requestClaim.findMany({
      where: {
        requestId: id,
        volunteerId: { in: targetVolunteerIds },
      },
      select: { volunteerId: true },
    });
    const existingClaimIds = new Set(existingClaims.map((c) => c.volunteerId));
    if (targetRequest.assignedVolunteers?.id) {
      existingClaimIds.add(targetRequest.assignedVolunteers.id);
    }

    const idsToClaim = targetVolunteerIds.filter((vId) => !existingClaimIds.has(vId));

    if (idsToClaim.length === 0) {
      return NextResponse.json(
        { error: "Selected volunteer(s) are already part of the response team for this request" },
        { status: 400 }
      );
    }

    // Record the claims in RequestClaim table and update HelpRequest status
    const isFirstVolunteer = !targetRequest.volunteerId;
    const primaryVolunteerId = isFirstVolunteer ? idsToClaim[0] : undefined;

    const { createdClaims, updatedRequest } = await prisma.$transaction(async (tx) => {
      const claims = await Promise.all(
        idsToClaim.map((vId) =>
          tx.requestClaim.create({
            data: {
              requestId: id,
              volunteerId: vId,
            },
          })
        )
      );

      const request = await tx.helpRequest.update({
        where: { id },
        data: {
          status: targetRequest.status === "OPEN" ? "CLAIMED" : targetRequest.status,
          volunteerId: primaryVolunteerId,
          statusHistory: {
            create: {
              status: "CLAIMED",
              note: parsed.data.note || (idsToClaim.length > 1
                ? `${idsToClaim.length} volunteers joined the response team`
                : "Volunteer joined the response team"),
            },
          },
        },
        include: {
          assignedVolunteers: true,
          claims: {
            include: {
              volunteer: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                  latitude: true,
                  longitude: true,
                  isVerified: true,
                  backgroundCheck: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Notification for requester
      await tx.notification.create({
        data: {
          userId: targetRequest.requesterId,
          message: `${idsToClaim.length > 1 ? `${idsToClaim.length} volunteers` : "A volunteer"} joined your response team. Note: ${parsed.data.note || "No message left"}`,
        },
      });

      // Notifications for dispatched volunteers if assigned by coordinator
      for (const vId of idsToClaim) {
        if (vId !== session?.user?.id) {
          await tx.notification.create({
            data: {
              userId: vId,
              message: `You were dispatched to the response team for "${targetRequest.title}". Note: ${parsed.data.note || "No message left"}`,
            },
          });
        }
      }

      return { createdClaims: claims, updatedRequest: request };
    });

    // Send Web Push notification to requester if subscribed
    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetRequest.requesterId },
    });
    if (pushSubscriptions.length > 0) {
      await broadcastPushNotification(
        pushSubscriptions,
        "Responders Joined Team",
        `${idsToClaim.length > 1 ? `${idsToClaim.length} volunteers have` : "A volunteer has"} joined the response team for: "${targetRequest.title}".`,
        `/requests/${targetRequest.id}`
      );
    }

    return NextResponse.json({ request: updatedRequest, claims: createdClaims });
  } catch (error) {
    console.error("PATCH request claim error:", error);
    return NextResponse.json({ error: "Failed to claim request" }, { status: 500 });
  }
}