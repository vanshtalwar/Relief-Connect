import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id: requestId },
      include: { assignedVolunteers: { select: { id: true } } }
    });

    if (!helpRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const assignedIds = helpRequest.assignedVolunteers ? [helpRequest.assignedVolunteers.id] : [];
    const volunteers = await prisma.user.findMany({
      where: {
        role: "VOLUNTEER",
        latitude: { not: null },
        longitude: { not: null },
        ...(assignedIds.length > 0 ? { id: { notIn: assignedIds } } : {})
      }
    });

    const toRad = (value: number) => (value * Math.PI) / 180;
    const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const categoryToSkills: Record<string, string[]> = {
      MEDICAL: ["Medical", "First Aid", "CPR", "Nurse", "Doctor"],
      FOOD: ["Distribution", "Cooking", "Driving"],
      WATER: ["Distribution", "Driving"],
      SHELTER: ["Construction", "Logistics", "Hosting"],
      RESCUE: ["Search & Rescue", "Swimming", "Heavy Machinery", "Drone Operation"],
      OTHER: []
    };

    const targetSkills = categoryToSkills[helpRequest.category] || [];

    const suggestions = volunteers.map(v => {
      const distance = calcDistance(helpRequest.latitude, helpRequest.longitude, v.latitude as number, v.longitude as number);
      
      let skillMatchScore = 0;
      if (v.skills && targetSkills.length > 0) {
        const skillsArray = Array.isArray(v.skills) ? v.skills : [];
        const matchingSkills = skillsArray.filter(s => typeof s === 'string' && targetSkills.includes(s));
        skillMatchScore = matchingSkills.length / targetSkills.length;
      }

      let distanceScore = Math.max(0, 100 - (distance * 2));
      const trustMultiplier = (v.isVerified ? 1.2 : 1.0) * (v.backgroundCheck ? 1.3 : 1.0);
      const finalScore = ((distanceScore * 0.6) + (skillMatchScore * 100 * 0.4)) * trustMultiplier;

      return {
        volunteer: {
          id: v.id,
          name: v.name,
          skills: v.skills,
          isVerified: v.isVerified,
          backgroundCheck: v.backgroundCheck
        },
        distanceKm: distance,
        skillMatchScore,
        finalScore
      };
    });

    suggestions.sort((a, b) => b.finalScore - a.finalScore);

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    console.error("Suggest API error:", error);
    return NextResponse.json({ error: "Failed to suggest volunteers" }, { status: 500 });
  }
}
