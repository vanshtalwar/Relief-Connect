import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  image: z.string().or(z.literal("")).nullable().optional(),
  inventory: z.array(z.string()).optional(),
  locationConsent: z.boolean().optional(),
  role: z.enum(["VICTIM", "VOLUNTEER"]).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, role: true, inventory: true, locationConsent: true },
    });

    return NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "private, s-maxage=10, stale-while-revalidate=59",
        },
      }
    );
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(parsed.data.image !== undefined ? { image: parsed.data.image || null } : {}),
        ...(parsed.data.inventory !== undefined ? { inventory: parsed.data.inventory } : {}),
        ...(parsed.data.locationConsent !== undefined ? { locationConsent: parsed.data.locationConsent } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
