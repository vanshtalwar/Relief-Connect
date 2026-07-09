import { NextResponse } from "next/server";
import { nearbySchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/geo";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = nearbySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const allAlerts = await prisma.alert.findMany();

    const alerts = allAlerts.filter((alert) => {
      const distance = haversineDistanceKm(
        { latitude: parsed.data.lat, longitude: parsed.data.lng },
        { latitude: alert.latitude, longitude: alert.longitude }
      );
      return distance <= alert.radiusKm;
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("GET active alerts error:", error);
    return NextResponse.json({ error: "Failed to fetch active alerts" }, { status: 500 });
  }
}