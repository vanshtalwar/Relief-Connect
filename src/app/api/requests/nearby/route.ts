import { NextResponse } from "next/server";
import { nearbySchema } from "@/lib/schemas";
import { buildNearbyRequestsSql, haversineDistanceKm } from "@/lib/geo";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = nearbySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const sqlPreview = buildNearbyRequestsSql(parsed.data);

    const dbRequests = await prisma.helpRequest.findMany({
      where: {
        status: "OPEN",
        category: parsed.data.category || undefined,
        urgency: parsed.data.urgency || undefined,
      },
      include: {
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
      },
    });

    const requests = dbRequests
      .map((req) => ({
        ...req,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        statusHistory: req.statusHistory.map((hist) => ({
          ...hist,
          changedAt: hist.changedAt.toISOString(),
        })),
        distanceKm: haversineDistanceKm(
          { latitude: parsed.data.lat, longitude: parsed.data.lng },
          { latitude: req.latitude, longitude: req.longitude }
        ),
      }))
      .filter((req) => req.distanceKm <= parsed.data.radiusKm)
      .sort((first, second) => first.distanceKm - second.distanceKm);

    return NextResponse.json({ sqlPreview: String(sqlPreview), requests });
  } catch (error) {
    console.error("GET nearby requests error:", error);
    return NextResponse.json({ error: "Failed to fetch nearby requests" }, { status: 500 });
  }
}