import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { alertSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { broadcastPushNotification } from "@/lib/web-push";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const parsed = alertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (session?.user?.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const createdBy = session.user.id;

    const alert = await prisma.alert.create({
      data: {
        message: parsed.data.message,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        radiusKm: parsed.data.radiusKm,
        createdBy: createdBy,
      },
    });

    // Create notifications in DB for all users
    const users = await prisma.user.findMany();
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        message: `EMERGENCY ALERT: ${alert.message} (Radius: ${alert.radiusKm}km)`,
      })),
    });

    // Broadcast Push Notification to all active subscriptions
    const subscriptions = await prisma.pushSubscription.findMany();
    if (subscriptions.length > 0) {
      await broadcastPushNotification(
        subscriptions,
        "Emergency Broadcast Alert",
        alert.message,
        "/dashboard"
      );
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("POST alert error:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}