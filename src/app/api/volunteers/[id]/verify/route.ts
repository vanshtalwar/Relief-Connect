import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "COORDINATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userToVerify = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToVerify || userToVerify.role !== "VOLUNTEER") {
      return NextResponse.json({ error: "Invalid volunteer record" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        backgroundCheck: true,
      },
    });

    // Notify the volunteer that they have been verified
    await prisma.notification.create({
      data: {
        userId: id,
        message: "Your volunteer profile has been officially verified by a coordinator. Thank you for your service!",
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("PATCH verify volunteer error:", error);
    return NextResponse.json({ error: "Failed to verify volunteer" }, { status: 500 });
  }
}
