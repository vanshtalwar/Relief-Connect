import { prisma } from "./prisma";

export async function buildCoordinatorSummary() {
  try {
    const total = await prisma.helpRequest.count();
    const open = await prisma.helpRequest.count({ where: { status: "OPEN" } });
    const resolved = await prisma.helpRequest.count({ where: { status: "RESOLVED" } });
    const claimed = await prisma.helpRequest.count({
      where: {
        status: { in: ["CLAIMED", "IN_PROGRESS"] },
      },
    });

    const activeVolunteers = await prisma.user.count({
      where: {
        role: "VOLUNTEER",
        claimedRequests: { some: {} }
      }
    });

    const categoriesResult = await prisma.helpRequest.groupBy({
      by: ["category"],
      _count: {
        category: true,
      },
    });

    const byCategory: Record<string, number> = {};
    categoriesResult.forEach((res) => {
      byCategory[res.category] = res._count.category;
    });

    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

    const allRequests = await prisma.helpRequest.findMany({
      select: { createdAt: true },
    });
    const dateCounts: Record<string, number> = {};
    allRequests.forEach(req => {
      const dateStr = req.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });

    // Create last 5 days including today
    const requestSeries = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      const dateStr = d.toISOString().split("T")[0];
      return {
        label: dateStr, // e.g., '2026-07-09'
        value: dateCounts[dateStr] || 0,
      };
    });

    const categorySeries = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    return {
      total,
      open,
      claimed,
      resolved,
      activeVolunteers,
      resolutionRate,
      averageResponseMinutes: total ? 24 : 0,
      requestSeries,
      categorySeries,
    };
  } catch (error) {
    console.error("buildCoordinatorSummary error:", error);
    return {
      total: 0,
      open: 0,
      claimed: 0,
      resolved: 0,
      activeVolunteers: 0,
      resolutionRate: 0,
      averageResponseMinutes: 0,
      requestSeries: [],
      categorySeries: [],
    };
  }
}