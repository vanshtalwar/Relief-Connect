import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Validate Vercel Cron header to ensure it's hit securely
  // (In a real Vercel environment, checking process.env.CRON_SECRET is required)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all users who have latitude/longitude but NO active requests
    const usersToPurge = await prisma.user.findMany({
      where: {
        AND: [
          { OR: [{ latitude: { not: null } }, { longitude: { not: null } }] },
          {
            claimedRequests: {
              none: { status: { in: ["CLAIMED", "IN_PROGRESS"] } },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (usersToPurge.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: usersToPurge.map(u => u.id) } },
        data: {
          latitude: null,
          longitude: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      purgedCount: usersToPurge.length,
      message: `Successfully purged location data for ${usersToPurge.length} inactive volunteers.`,
    });
  } catch (error) {
    console.error("Cron purge-location error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
