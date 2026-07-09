import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const locationSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "VOLUNTEER") {
      return NextResponse.json({ error: "Unauthorized. Only volunteers can stream location." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        claimedRequests: {
          where: { status: { in: ["CLAIMED", "IN_PROGRESS"] } }
        }
      }
    });

    if (!user?.locationConsent) {
      return NextResponse.json({ error: "Location tracking consent not granted." }, { status: 403 });
    }

    if (user.claimedRequests.length === 0) {
      return NextResponse.json({ error: "No active requests. Location tracking is suspended for privacy." }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude,
      },
    });
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
