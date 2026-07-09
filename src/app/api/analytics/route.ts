import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Basic Counts
    const totalRequests = await prisma.helpRequest.count();
    const resolvedRequests = await prisma.helpRequest.count({ where: { status: "RESOLVED" } });
    const openRequests = await prisma.helpRequest.count({ where: { status: "OPEN" } });
    const activeRequests = await prisma.helpRequest.count({ 
      where: { status: { in: ["CLAIMED", "IN_PROGRESS"] } } 
    });

    const activeVolunteersCount = await prisma.user.count({
      where: { role: "VOLUNTEER" } // Ideally those currently online/assigned, but total volunteer pool works for now
    });

    // 2. Breakdown by Category
    const categoryGroup = await prisma.helpRequest.groupBy({
      by: ["category"],
      _count: { category: true },
    });

    // 3. Breakdown by Urgency
    const urgencyGroup = await prisma.helpRequest.groupBy({
      by: ["urgency"],
      _count: { urgency: true },
    });

    // 4. Calculate Average Response Time (OPEN -> CLAIMED)
    // We look at StatusEvents where status became CLAIMED.
    const claimEvents = await prisma.statusEvent.findMany({
      where: { status: "CLAIMED" },
      include: {
        request: {
          select: { createdAt: true }
        }
      }
    });

    let avgResponseTimeMinutes = 0;
    if (claimEvents.length > 0) {
      let totalMinutes = 0;
      for (const event of claimEvents) {
        // time difference in minutes
        const diffMs = event.changedAt.getTime() - event.request.createdAt.getTime();
        totalMinutes += diffMs / (1000 * 60);
      }
      avgResponseTimeMinutes = totalMinutes / claimEvents.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        resolvedRequests,
        openRequests,
        activeRequests,
        activeVolunteersCount,
        resolutionRate: totalRequests > 0 ? (resolvedRequests / totalRequests) * 100 : 0,
        avgResponseTimeMinutes: Math.round(avgResponseTimeMinutes),
        categoryBreakdown: categoryGroup.map(c => ({
          category: c.category,
          count: c._count.category
        })),
        urgencyBreakdown: urgencyGroup.map(u => ({
          urgency: u.urgency,
          count: u._count.urgency
        }))
      }
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
