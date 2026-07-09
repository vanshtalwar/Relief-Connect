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

    const pendingVolunteers = await prisma.user.findMany({
      where: {
        role: "VOLUNTEER",
        isVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ volunteers: pendingVolunteers });
  } catch (error) {
    console.error("GET pending volunteers error:", error);
    return NextResponse.json({ error: "Failed to fetch pending volunteers" }, { status: 500 });
  }
}
