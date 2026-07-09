import { NextResponse } from "next/server";
import { statusSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { requestStatusLabels } from "@/lib/constants";
import { broadcastPushNotification } from "@/lib/web-push";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const targetRequest = await prisma.helpRequest.findUnique({
      where: { id },
    });

    if (!targetRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { status, note } = parsed.data;

    const updated = await prisma.helpRequest.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note: note || undefined,
          },
        },
      },
    });

    const statusLabel = requestStatusLabels[status];
    const message = `Your request "${targetRequest.title}" moved to ${statusLabel}.`;

    // Create system notification for requester
    await prisma.notification.create({
      data: {
        userId: targetRequest.requesterId,
        message,
      },
    });

    // Send Web Push notification to requester if subscribed
    const pushSubscriptions = await prisma.pushSubscription.findMany({
      where: { userId: targetRequest.requesterId },
    });
    if (pushSubscriptions.length > 0) {
      await broadcastPushNotification(
        pushSubscriptions,
        "Status Update",
        `Your request status has been updated to "${statusLabel}".`,
        `/requests/${targetRequest.id}`
      );
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("PATCH request status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}